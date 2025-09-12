import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
export interface MaintenanceConfig {
    cleanupInterval: string;
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
export declare class DataMaintenanceService extends EventEmitter {
    private prisma;
    private scheduledTasks;
    private config;
    constructor(prisma: PrismaClient, config?: Partial<MaintenanceConfig>);
    performCleanup(): Promise<CleanupStats>;
    archiveExpiredOpportunities(): Promise<number>;
    deleteOldOpportunities(): Promise<number>;
    cleanupUnusedSources(): Promise<number>;
    removeOrphanedRecords(): Promise<number>;
    cleanupDuplicateRecords(): Promise<number>;
    optimizeDatabase(): Promise<void>;
    private initializeScheduledTasks;
    createMaintenanceTask(task: Omit<MaintenanceTask, 'lastRun' | 'nextRun' | 'lastResult'>): void;
    getMaintenanceTasks(): MaintenanceTask[];
    toggleTask(taskId: string, enabled: boolean): void;
    runTask(taskId: string): Promise<CleanupStats>;
    getStorageStats(): Promise<{
        totalRecords: number;
        opportunitiesCount: number;
        sourcesCount: number;
        duplicatesCount: number;
        estimatedSizeKB: number;
        oldestRecord: Date | null;
        newestRecord: Date | null;
    }>;
    private calculateStorageFreed;
    getHealthStatus(): Promise<{
        status: 'healthy' | 'warning' | 'critical';
        details: {
            scheduledTasks: number;
            activeTasks: number;
            lastCleanup?: Date;
            upcomingTasks: Array<{
                id: string;
                nextRun: Date;
            }>;
        };
    }>;
    shutdown(): void;
}
//# sourceMappingURL=DataMaintenanceService.d.ts.map