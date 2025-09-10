import { PrismaClient, Opportunity } from '@prisma/client';
import { EventEmitter } from 'events';
import { OpportunityRepository, FindOpportunitiesOptions, OpportunityWithStats } from './repositories/OpportunityRepository';
import { DeduplicationService, DuplicateCheckResult } from './DeduplicationService';
import { 
  OpportunityData, 
  validateOpportunityData,
  DeduplicationResult,
  DiscoveryError
} from '../types/discovery';

export interface ArchivistConfig {
  maxOpportunities: number;
  maxSourcesPerOpportunity: number;
  autoCleanup: boolean;
  cleanupIntervalHours: number;
  archiveAfterDays: number;
  duplicateThreshold: number;
}

export interface ArchivistEvents {
  'opportunity.created': (opportunity: Opportunity) => void;
  'opportunity.updated': (opportunity: Opportunity) => void;
  'opportunity.deleted': (opportunityId: string) => void;
  'duplicate.detected': (result: DuplicateCheckResult) => void;
  'cleanup.completed': (stats: { archived: number; deleted: number }) => void;
  'error': (error: Error) => void;
}

export interface ArchivistStats {
  totalOpportunities: number;
  opportunitiesByStatus: Record<string, number>;
  averageRelevanceScore: number;
  recentlyAdded: number;
  upcomingDeadlines: number;
  duplicatesDetected: number;
  sourcesActive: number;
  storageUsed: string;
}

export class ArchivistService extends EventEmitter {
  private opportunityRepository: OpportunityRepository;
  private deduplicationService: DeduplicationService;
  private config: ArchivistConfig;

  constructor(
    private prisma: PrismaClient,
    config: Partial<ArchivistConfig> = {}
  ) {
    super();
    
    this.config = {
      maxOpportunities: 10000,
      maxSourcesPerOpportunity: 10,
      autoCleanup: true,
      cleanupIntervalHours: 24,
      archiveAfterDays: 365,
      duplicateThreshold: 0.85,
      ...config
    };

    this.opportunityRepository = new OpportunityRepository(prisma);
    this.deduplicationService = new DeduplicationService(prisma);

    if (this.config.autoCleanup) {
      this.scheduleCleanup();
    }
  }

  // =====================================
  // Core Opportunity Operations
  // =====================================

  /**
   * Save a new opportunity with deduplication and validation
   */
  async saveOpportunity(data: unknown): Promise<{
    opportunity?: Opportunity;
    isDuplicate: boolean;
    duplicateOf?: string;
    validationErrors?: string[];
  }> {
    try {
      // Validate the input data
      const validatedData = validateOpportunityData(data);
      
      // Check for duplicates
      const duplicateCheck = await this.deduplicationService.checkDuplicate(validatedData);
      
      if (duplicateCheck.isDuplicate) {
        this.emit('duplicate.detected', duplicateCheck);
        return {
          isDuplicate: true,
          duplicateOf: duplicateCheck.existingId
        };
      }

      // Create new opportunity
      const opportunity = await this.opportunityRepository.create(validatedData);
      
      this.emit('opportunity.created', opportunity);
      
      return {
        opportunity,
        isDuplicate: false
      };

    } catch (error) {
      const archivistError = new DiscoveryError(
        `Failed to save opportunity: ${error}`,
        'manual' as any,
        'archivist'
      );
      
      this.emit('error', archivistError);
      throw archivistError;
    }
  }

  /**
   * Bulk save opportunities with batch processing
   */
  async bulkSaveOpportunities(opportunities: unknown[]): Promise<{
    created: number;
    duplicates: number;
    errors: string[];
    results: Array<{
      index: number;
      success: boolean;
      opportunityId?: string;
      isDuplicate?: boolean;
      error?: string;
    }>;
  }> {
    const results = {
      created: 0,
      duplicates: 0,
      errors: [] as string[],
      results: [] as Array<{
        index: number;
        success: boolean;
        opportunityId?: string;
        isDuplicate?: boolean;
        error?: string;
      }>
    };

    for (let i = 0; i < opportunities.length; i++) {
      try {
        const result = await this.saveOpportunity(opportunities[i]);
        
        results.results.push({
          index: i,
          success: true,
          opportunityId: result.opportunity?.id,
          isDuplicate: result.isDuplicate
        });

        if (result.isDuplicate) {
          results.duplicates++;
        } else {
          results.created++;
        }

      } catch (error) {
        const errorMessage = `Item ${i}: ${error}`;
        results.errors.push(errorMessage);
        results.results.push({
          index: i,
          success: false,
          error: errorMessage
        });
      }
    }

    return results;
  }

  /**
   * Get opportunity by ID with full details
   */
  async getOpportunity(id: string): Promise<Opportunity | null> {
    return await this.opportunityRepository.findById(id);
  }

  /**
   * Search opportunities with advanced filtering
   */
  async searchOpportunities(options: FindOpportunitiesOptions): Promise<Opportunity[]> {
    return await this.opportunityRepository.findMany(options);
  }

  /**
   * Update an opportunity
   */
  async updateOpportunity(id: string, data: Partial<OpportunityData>): Promise<Opportunity> {
    try {
      const opportunity = await this.opportunityRepository.update(id, data);
      this.emit('opportunity.updated', opportunity);
      return opportunity;
    } catch (error) {
      const archivistError = new DiscoveryError(
        `Failed to update opportunity ${id}: ${error}`,
        'manual' as any,
        'archivist'
      );
      this.emit('error', archivistError);
      throw archivistError;
    }
  }

  /**
   * Delete an opportunity
   */
  async deleteOpportunity(id: string): Promise<void> {
    try {
      await this.opportunityRepository.delete(id);
      this.emit('opportunity.deleted', id);
    } catch (error) {
      const archivistError = new DiscoveryError(
        `Failed to delete opportunity ${id}: ${error}`,
        'manual' as any,
        'archivist'
      );
      this.emit('error', archivistError);
      throw archivistError;
    }
  }

  // =====================================
  // Specialized Query Operations
  // =====================================

  /**
   * Get high relevance opportunities
   */
  async getHighRelevanceOpportunities(threshold: number = 0.7): Promise<Opportunity[]> {
    return await this.opportunityRepository.findHighRelevance(threshold);
  }

  /**
   * Get upcoming deadlines
   */
  async getUpcomingDeadlines(days: number = 7): Promise<Opportunity[]> {
    return await this.opportunityRepository.findUpcomingDeadlines(days);
  }

  /**
   * Get opportunities with comprehensive stats
   */
  async getOpportunitiesWithStats(): Promise<OpportunityWithStats[]> {
    return await this.opportunityRepository.getOpportunitiesWithStats();
  }

  /**
   * Get starred/bookmarked opportunities
   */
  async getStarredOpportunities(): Promise<Opportunity[]> {
    return await this.opportunityRepository.findMany({ starred: true });
  }

  // =====================================
  // Deduplication Operations
  // =====================================

  /**
   * Run comprehensive deduplication
   */
  async runDeduplication(): Promise<DeduplicationResult> {
    return await this.deduplicationService.runDeduplication();
  }

  /**
   * Get deduplication statistics
   */
  async getDeduplicationStats() {
    return await this.deduplicationService.getDeduplicationStats();
  }

  // =====================================
  // Data Maintenance Operations
  // =====================================

  /**
   * Clean up expired and old opportunities
   */
  async performMaintenance(): Promise<{ archived: number; deleted: number }> {
    const startTime = Date.now();
    
    try {
      // Mark expired opportunities as archived
      const archivedCount = await this.opportunityRepository.markExpiredOpportunities();
      
      // Clean up very old opportunities (beyond archive period)
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - this.config.archiveAfterDays);
      
      const { count: deletedCount } = await this.prisma.opportunity.deleteMany({
        where: {
          discoveredAt: { lt: archiveDate },
          status: 'archived'
        }
      });

      const stats = { archived: archivedCount, deleted: deletedCount };
      this.emit('cleanup.completed', stats);
      
      return stats;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Get comprehensive Archivist statistics
   */
  async getStats(): Promise<ArchivistStats> {
    const [
      oppStats,
      deduplicationStats,
      sourcesCount,
      storageInfo
    ] = await Promise.all([
      this.opportunityRepository.getStats(),
      this.deduplicationService.getDeduplicationStats(),
      this.prisma.opportunitySource.count({ where: { enabled: true } }),
      this.getStorageInfo()
    ]);

    return {
      totalOpportunities: oppStats.total,
      opportunitiesByStatus: oppStats.byStatus,
      averageRelevanceScore: oppStats.averageRelevanceScore,
      recentlyAdded: oppStats.recentlyAdded,
      upcomingDeadlines: oppStats.upcomingDeadlines,
      duplicatesDetected: deduplicationStats.duplicatesIdentified,
      sourcesActive: sourcesCount,
      storageUsed: storageInfo
    };
  }

  // =====================================
  // Data Integrity Operations
  // =====================================

  /**
   * Validate data integrity
   */
  async validateDataIntegrity(): Promise<{
    totalRecords: number;
    invalidRecords: number;
    missingRelationships: number;
    orphanedRecords: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let invalidRecords = 0;
    let missingRelationships = 0;
    let orphanedRecords = 0;

    // Check for opportunities with missing required fields
    const opportunitiesWithoutTitle = await this.prisma.opportunity.count({
      where: { title: '' }
    });
    if (opportunitiesWithoutTitle > 0) {
      invalidRecords += opportunitiesWithoutTitle;
      issues.push(`${opportunitiesWithoutTitle} opportunities missing title`);
    }

    // Check for orphaned source links
    const orphanedSourceLinks = await this.prisma.opportunitySourceLink.count({
      where: {
        opportunity: null
      }
    });
    if (orphanedSourceLinks > 0) {
      orphanedRecords += orphanedSourceLinks;
      issues.push(`${orphanedSourceLinks} orphaned source links`);
    }

    const totalRecords = await this.prisma.opportunity.count();

    return {
      totalRecords,
      invalidRecords,
      missingRelationships,
      orphanedRecords,
      issues
    };
  }

  /**
   * Repair data integrity issues
   */
  async repairDataIntegrity(): Promise<{ repaired: number; errors: string[] }> {
    const errors: string[] = [];
    let repaired = 0;

    try {
      // Remove orphaned source links
      const { count: orphanedRemoved } = await this.prisma.opportunitySourceLink.deleteMany({
        where: {
          opportunity: null
        }
      });
      repaired += orphanedRemoved;

      // Fix opportunities with empty titles
      const { count: titlesFixed } = await this.prisma.opportunity.updateMany({
        where: { title: '' },
        data: { title: 'Untitled Opportunity' }
      });
      repaired += titlesFixed;

    } catch (error) {
      errors.push(`Repair failed: ${error}`);
    }

    return { repaired, errors };
  }

  // =====================================
  // Private Helper Methods
  // =====================================

  /**
   * Schedule automatic cleanup
   */
  private scheduleCleanup(): void {
    setInterval(() => {
      this.performMaintenance().catch(error => {
        this.emit('error', error);
      });
    }, this.config.cleanupIntervalHours * 60 * 60 * 1000);
  }

  /**
   * Get storage information
   */
  private async getStorageInfo(): Promise<string> {
    // This would need actual database size calculation
    // For now, return placeholder
    try {
      const count = await this.prisma.opportunity.count();
      return `${Math.round(count * 2.5)} KB (estimated)`;
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Health check for the Archivist service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      database: boolean;
      repositories: boolean;
      deduplication: boolean;
      lastMaintenance?: Date;
    };
  }> {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      const databaseOk = true;

      // Test repositories
      const testCount = await this.opportunityRepository.findMany({ limit: 1 });
      const repositoriesOk = true;

      // Test deduplication
      const dedupStats = await this.deduplicationService.getDeduplicationStats();
      const deduplicationOk = true;

      const allHealthy = databaseOk && repositoriesOk && deduplicationOk;

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        details: {
          database: databaseOk,
          repositories: repositoriesOk,
          deduplication: deduplicationOk
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          database: false,
          repositories: false,
          deduplication: false
        }
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Clean up any ongoing operations
    this.removeAllListeners();
    
    // Close database connections if needed
    await this.prisma.$disconnect();
  }
}