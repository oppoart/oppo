"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataMaintenanceService = void 0;
const cron = __importStar(require("node-cron"));
const events_1 = require("events");
class DataMaintenanceService extends events_1.EventEmitter {
    constructor(prisma, config = {}) {
        super();
        this.prisma = prisma;
        this.scheduledTasks = new Map();
        this.config = {
            cleanupInterval: '0 2 * * *',
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
    async performCleanup() {
        const startTime = Date.now();
        console.log('Starting data maintenance cleanup...');
        const stats = {
            opportunitiesArchived: 0,
            opportunitiesDeleted: 0,
            sourcesCleanedUp: 0,
            duplicatesRemoved: 0,
            orphanedRecordsRemoved: 0,
            storageFreed: '0 KB',
            processingTimeMs: 0
        };
        try {
            stats.opportunitiesArchived = await this.archiveExpiredOpportunities();
            stats.opportunitiesDeleted = await this.deleteOldOpportunities();
            stats.sourcesCleanedUp = await this.cleanupUnusedSources();
            stats.orphanedRecordsRemoved = await this.removeOrphanedRecords();
            stats.duplicatesRemoved = await this.cleanupDuplicateRecords();
            await this.optimizeDatabase();
            stats.processingTimeMs = Date.now() - startTime;
            stats.storageFreed = await this.calculateStorageFreed(stats);
            this.emit('cleanup.completed', stats);
            console.log('Data maintenance cleanup completed:', stats);
            return stats;
        }
        catch (error) {
            this.emit('cleanup.error', error);
            console.error('Data maintenance cleanup failed:', error);
            throw error;
        }
    }
    async archiveExpiredOpportunities() {
        const archiveDate = new Date();
        archiveDate.setDate(archiveDate.getDate() - this.config.archiveAfterDays);
        const result = await this.prisma.opportunity.updateMany({
            where: {
                OR: [
                    {
                        deadline: {
                            lt: new Date()
                        },
                        status: {
                            in: ['new', 'reviewing', 'applying']
                        }
                    },
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
    async deleteOldOpportunities() {
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
    async cleanupUnusedSources() {
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
    async removeOrphanedRecords() {
        let removedCount = 0;
        try {
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
            const orphanedMatches = await this.prisma.opportunityMatch.deleteMany({
                where: {
                    opportunity: null
                }
            });
            removedCount += orphanedMatches.count;
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
        }
        catch (error) {
            console.error('Error removing orphaned records:', error);
        }
        return removedCount;
    }
    async cleanupDuplicateRecords() {
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
    async optimizeDatabase() {
        try {
            await this.prisma.$executeRaw `VACUUM ANALYZE`;
            console.log('Database optimization completed');
        }
        catch (error) {
            console.log('Database optimization not supported or failed:', error);
        }
    }
    initializeScheduledTasks() {
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
            schedule: '0 3 * * 0',
            enabled: true
        });
    }
    createMaintenanceTask(task) {
        if (!cron.validate(task.schedule)) {
            throw new Error(`Invalid cron expression: ${task.schedule}`);
        }
        const scheduledTask = cron.schedule(task.schedule, async () => {
            console.log(`Running scheduled task: ${task.name}`);
            try {
                const stats = await this.performCleanup();
                this.emit('task.completed', { task, stats });
            }
            catch (error) {
                this.emit('task.error', { task, error });
            }
        }, {
            scheduled: task.enabled,
            timezone: 'UTC'
        });
        this.scheduledTasks.set(task.id, scheduledTask);
        console.log(`Scheduled task created: ${task.name} (${task.schedule})`);
    }
    getMaintenanceTasks() {
        const tasks = [];
        this.scheduledTasks.forEach((scheduledTask, id) => {
            const task = {
                id,
                name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: 'Automated maintenance task',
                schedule: '',
                enabled: scheduledTask.running,
                nextRun: scheduledTask.nextDate()?.toDate()
            };
            tasks.push(task);
        });
        return tasks;
    }
    toggleTask(taskId, enabled) {
        const task = this.scheduledTasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        if (enabled) {
            task.start();
        }
        else {
            task.stop();
        }
        console.log(`Task ${taskId} ${enabled ? 'enabled' : 'disabled'}`);
    }
    async runTask(taskId) {
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
    async getStorageStats() {
        const [opportunitiesCount, sourcesCount, duplicatesCount, oldestOpportunity, newestOpportunity] = await Promise.all([
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
        const estimatedSizeKB = Math.round(totalRecords * 2.5);
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
    async calculateStorageFreed(stats) {
        const totalRecordsRemoved = stats.opportunitiesDeleted +
            stats.orphanedRecordsRemoved +
            stats.duplicatesRemoved;
        const estimatedKB = totalRecordsRemoved * 2.5;
        if (estimatedKB < 1024) {
            return `${Math.round(estimatedKB)} KB`;
        }
        else {
            return `${Math.round(estimatedKB / 1024)} MB`;
        }
    }
    async getHealthStatus() {
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
                upcomingTasks: upcomingTasks
            }
        };
    }
    async shutdown() {
        console.log('Shutting down data maintenance service...');
        this.scheduledTasks.forEach(task => {
            task.stop();
            task.destroy();
        });
        this.scheduledTasks.clear();
        this.removeAllListeners();
        console.log('Data maintenance service shutdown complete');
    }
}
exports.DataMaintenanceService = DataMaintenanceService;
//# sourceMappingURL=DataMaintenanceService.js.map