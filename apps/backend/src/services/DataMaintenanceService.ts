import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';
import { EventEmitter } from 'events';

export interface MaintenanceConfig {
  cleanupInterval: string; // cron expression
  archiveAfterDays: number;
  deleteAfterDays: number;
  maxOpportunities: number;
  maxSourcesPerOpportunity: number;
  enableScheduledTasks: boolean;
}

export interface CleanupStats {
  opportunitiesArchived: number;
  opportunitiesDeleted: number;
  sourcesCleanedUp: number;
  duplicatesRemoved: number;
  orphanedRecordsRemoved: number;
  storageFreed: string;
  processingTimeMs: number;
}

export interface MaintenanceTask {
  id: string;
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  lastResult?: CleanupStats;
}

export class DataMaintenanceService extends EventEmitter {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private config: MaintenanceConfig;

  constructor(
    private prisma: PrismaClient,
    config: Partial<MaintenanceConfig> = {}
  ) {
    super();
    
    this.config = {
      cleanupInterval: '0 2 * * *', // Daily at 2 AM
      archiveAfterDays: 90,
      deleteAfterDays: 365,
      maxOpportunities: 10000,
      maxSourcesPerOpportunity: 10,
      enableScheduledTasks: true,
      ...config
    };

    if (this.config.enableScheduledTasks) {
      this.initializeScheduledTasks();
    }
  }

  // =====================================
  // Core Cleanup Operations
  // =====================================

  /**
   * Perform comprehensive data cleanup
   */
  async performCleanup(): Promise<CleanupStats> {
    const startTime = Date.now();
    
    console.log('Starting data maintenance cleanup...');
    
    const stats: CleanupStats = {
      opportunitiesArchived: 0,
      opportunitiesDeleted: 0,
      sourcesCleanedUp: 0,
      duplicatesRemoved: 0,
      orphanedRecordsRemoved: 0,
      storageFreed: '0 KB',
      processingTimeMs: 0
    };

    try {
      // Step 1: Archive expired opportunities
      stats.opportunitiesArchived = await this.archiveExpiredOpportunities();
      
      // Step 2: Delete very old opportunities
      stats.opportunitiesDeleted = await this.deleteOldOpportunities();
      
      // Step 3: Clean up unused sources
      stats.sourcesCleanedUp = await this.cleanupUnusedSources();
      
      // Step 4: Remove orphaned records
      stats.orphanedRecordsRemoved = await this.removeOrphanedRecords();
      
      // Step 5: Clean up duplicate records
      stats.duplicatesRemoved = await this.cleanupDuplicateRecords();
      
      // Step 6: Optimize database (if supported)
      await this.optimizeDatabase();
      
      stats.processingTimeMs = Date.now() - startTime;
      stats.storageFreed = await this.calculateStorageFreed(stats);

      this.emit('cleanup.completed', stats);
      console.log('Data maintenance cleanup completed:', stats);
      
      return stats;
    } catch (error) {
      this.emit('cleanup.error', error);
      console.error('Data maintenance cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Archive opportunities past their deadline
   */
  async archiveExpiredOpportunities(): Promise<number> {
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - this.config.archiveAfterDays);
    
    const result = await this.prisma.opportunity.updateMany({
      where: {
        OR: [
          // Opportunities past deadline
          {
            deadline: {
              lt: new Date()
            },
            status: {
              in: ['new', 'reviewing', 'applying']
            }
          },
          // Old opportunities without recent activity
          {
            discoveredAt: {
              lt: archiveDate
            },
            status: 'new',
            lastUpdated: {
              lt: archiveDate
            }
          }
        ]
      },
      data: {
        status: 'archived',
        lastUpdated: new Date()
      }
    });

    console.log(`Archived ${result.count} expired opportunities`);
    return result.count;
  }

  /**
   * Delete very old archived opportunities
   */
  async deleteOldOpportunities(): Promise<number> {
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() - this.config.deleteAfterDays);
    
    const result = await this.prisma.opportunity.deleteMany({
      where: {
        status: 'archived',
        discoveredAt: {
          lt: deleteDate
        }
      }
    });

    console.log(`Deleted ${result.count} old archived opportunities`);
    return result.count;
  }

  /**
   * Clean up unused opportunity sources
   */
  async cleanupUnusedSources(): Promise<number> {
    // Find sources with no associated opportunities in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const unusedSources = await this.prisma.opportunitySource.findMany({
      where: {
        OR: [
          {
            lastScanned: {
              lt: thirtyDaysAgo
            }
          },
          {
            lastScanned: null,
            createdAt: {
              lt: thirtyDaysAgo
            }
          }
        ],
        sourceLinks: {
          none: {}
        }
      }
    });

    // Mark unused sources as disabled instead of deleting them
    const result = await this.prisma.opportunitySource.updateMany({
      where: {
        id: {
          in: unusedSources.map(s => s.id)
        }
      },
      data: {
        enabled: false
      }
    });

    console.log(`Disabled ${result.count} unused sources`);
    return result.count;
  }

  /**
   * Remove orphaned records
   */
  async removeOrphanedRecords(): Promise<number> {
    let removedCount = 0;

    try {
      // Remove orphaned opportunity source links
      const orphanedSourceLinks = await this.prisma.opportunitySourceLink.deleteMany({
        where: {
          OR: [
            {
              opportunity: null
            },
            {
              source: null
            }
          ]
        }
      });
      removedCount += orphanedSourceLinks.count;

      // Remove orphaned opportunity matches
      const orphanedMatches = await this.prisma.opportunityMatch.deleteMany({
        where: {
          opportunity: null
        }
      });
      removedCount += orphanedMatches.count;

      // Remove orphaned duplicates
      const orphanedDuplicates = await this.prisma.opportunityDuplicate.deleteMany({
        where: {
          OR: [
            {
              masterOpportunity: null
            },
            {
              duplicateOpportunity: null
            }
          ]
        }
      });
      removedCount += orphanedDuplicates.count;

      console.log(`Removed ${removedCount} orphaned records`);
    } catch (error) {
      console.error('Error removing orphaned records:', error);
    }

    return removedCount;
  }

  /**
   * Clean up duplicate records
   */
  async cleanupDuplicateRecords(): Promise<number> {
    // This is handled by the DeduplicationService
    // Here we just clean up old duplicate relationships where the opportunities no longer exist
    const result = await this.prisma.opportunityDuplicate.deleteMany({
      where: {
        OR: [
          {
            masterOpportunity: null
          },
          {
            duplicateOpportunity: null
          }
        ]
      }
    });

    console.log(`Cleaned up ${result.count} orphaned duplicate records`);
    return result.count;
  }

  /**
   * Optimize database performance
   */
  async optimizeDatabase(): Promise<void> {
    try {
      // For PostgreSQL, we can use VACUUM and ANALYZE
      // Note: These operations might not be supported in all environments
      await this.prisma.$executeRaw`VACUUM ANALYZE`;
      console.log('Database optimization completed');
    } catch (error) {
      console.log('Database optimization not supported or failed:', error);
    }
  }

  // =====================================
  // Scheduled Task Management
  // =====================================

  /**
   * Initialize scheduled maintenance tasks
   */
  private initializeScheduledTasks(): void {
    this.createMaintenanceTask({
      id: 'daily-cleanup',
      name: 'Daily Cleanup',
      description: 'Archive expired opportunities and clean up old data',
      schedule: this.config.cleanupInterval,
      enabled: true
    });

    this.createMaintenanceTask({
      id: 'weekly-optimization',
      name: 'Weekly Database Optimization',
      description: 'Optimize database performance and remove orphaned records',
      schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
      enabled: true
    });
  }

  /**
   * Create a scheduled maintenance task
   */
  createMaintenanceTask(task: Omit<MaintenanceTask, 'lastRun' | 'nextRun' | 'lastResult'>): void {
    if (!cron.validate(task.schedule)) {
      throw new Error(`Invalid cron expression: ${task.schedule}`);
    }

    const scheduledTask = cron.schedule(task.schedule, async () => {
      console.log(`Running scheduled task: ${task.name}`);
      
      try {
        const stats = await this.performCleanup();
        this.emit('task.completed', { task, stats });
      } catch (error) {
        this.emit('task.error', { task, error });
      }
    }, {
      scheduled: task.enabled,
      timezone: 'UTC'
    });

    this.scheduledTasks.set(task.id, scheduledTask);
    console.log(`Scheduled task created: ${task.name} (${task.schedule})`);
  }

  /**
   * Get all maintenance tasks
   */
  getMaintenanceTasks(): MaintenanceTask[] {
    const tasks: MaintenanceTask[] = [];
    
    this.scheduledTasks.forEach((scheduledTask, id) => {
      const task: MaintenanceTask = {
        id,
        name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: 'Automated maintenance task',
        schedule: '', // Would need to store this separately
        enabled: scheduledTask.running,
        nextRun: scheduledTask.nextDate()?.toDate()
      };
      
      tasks.push(task);
    });
    
    return tasks;
  }

  /**
   * Enable or disable a scheduled task
   */
  toggleTask(taskId: string, enabled: boolean): void {
    const task = this.scheduledTasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (enabled) {
      task.start();
    } else {
      task.stop();
    }

    console.log(`Task ${taskId} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Manually run a specific maintenance task
   */
  async runTask(taskId: string): Promise<CleanupStats> {
    console.log(`Manually running task: ${taskId}`);
    
    switch (taskId) {
      case 'daily-cleanup':
        return await this.performCleanup();
      case 'weekly-optimization':
        return await this.performCleanup();
      default:
        throw new Error(`Unknown task: ${taskId}`);
    }
  }

  // =====================================
  // Storage Management
  // =====================================

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalRecords: number;
    opportunitiesCount: number;
    sourcesCount: number;
    duplicatesCount: number;
    estimatedSizeKB: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
  }> {
    const [
      opportunitiesCount,
      sourcesCount,
      duplicatesCount,
      oldestOpportunity,
      newestOpportunity
    ] = await Promise.all([
      this.prisma.opportunity.count(),
      this.prisma.opportunitySource.count(),
      this.prisma.opportunityDuplicate.count(),
      this.prisma.opportunity.findFirst({
        orderBy: { discoveredAt: 'asc' },
        select: { discoveredAt: true }
      }),
      this.prisma.opportunity.findFirst({
        orderBy: { discoveredAt: 'desc' },
        select: { discoveredAt: true }
      })
    ]);

    const totalRecords = opportunitiesCount + sourcesCount + duplicatesCount;
    const estimatedSizeKB = Math.round(totalRecords * 2.5); // Rough estimate

    return {
      totalRecords,
      opportunitiesCount,
      sourcesCount,
      duplicatesCount,
      estimatedSizeKB,
      oldestRecord: oldestOpportunity?.discoveredAt || null,
      newestRecord: newestOpportunity?.discoveredAt || null
    };
  }

  /**
   * Calculate storage freed by cleanup operations
   */
  private async calculateStorageFreed(stats: CleanupStats): Promise<string> {
    const totalRecordsRemoved = 
      stats.opportunitiesDeleted + 
      stats.orphanedRecordsRemoved + 
      stats.duplicatesRemoved;
    
    const estimatedKB = totalRecordsRemoved * 2.5;
    
    if (estimatedKB < 1024) {
      return `${Math.round(estimatedKB)} KB`;
    } else {
      return `${Math.round(estimatedKB / 1024)} MB`;
    }
  }

  // =====================================
  // Health and Monitoring
  // =====================================

  /**
   * Get maintenance service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    details: {
      scheduledTasks: number;
      activeTasks: number;
      lastCleanup?: Date;
      upcomingTasks: Array<{ id: string; nextRun: Date }>;
    };
  }> {
    const activeTasks = Array.from(this.scheduledTasks.values())
      .filter(task => task.running).length;

    const upcomingTasks = Array.from(this.scheduledTasks.entries())
      .map(([id, task]) => ({
        id,
        nextRun: task.nextDate()?.toDate()
      }))
      .filter(task => task.nextRun)
      .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());

    return {
      status: activeTasks > 0 ? 'healthy' : 'warning',
      details: {
        scheduledTasks: this.scheduledTasks.size,
        activeTasks,
        upcomingTasks: upcomingTasks as Array<{ id: string; nextRun: Date }>
      }
    };
  }

  /**
   * Shutdown maintenance service
   */
  async shutdown(): void {
    console.log('Shutting down data maintenance service...');
    
    // Stop all scheduled tasks
    this.scheduledTasks.forEach(task => {
      task.stop();
      task.destroy();
    });
    
    this.scheduledTasks.clear();
    this.removeAllListeners();
    
    console.log('Data maintenance service shutdown complete');
  }
}