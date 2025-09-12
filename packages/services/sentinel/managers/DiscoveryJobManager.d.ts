import { DiscoveryJobStatus } from '../core/interfaces';
import { DiscoveryJobData, JobStatus } from '../../../../apps/backend/src/types/discovery';
export declare class DiscoveryJobManager {
    private jobs;
    private jobHistory;
    private maxHistorySize;
    private isInitialized;
    initialize(): Promise<void>;
    createJob(jobData: Partial<DiscoveryJobData>): Promise<string>;
    updateJobStatus(jobId: string, status: JobStatus, error?: string, progress?: number): Promise<void>;
    updateJobProgress(jobId: string, progress: number): Promise<void>;
    setJobResult(jobId: string, result: any): Promise<void>;
    getJobStatus(jobId: string): Promise<DiscoveryJobStatus | null>;
    getActiveJobs(): Promise<DiscoveryJobStatus[]>;
    getJobsByStatus(status: JobStatus): Promise<DiscoveryJobStatus[]>;
    getJobsForDiscoverer(discovererName: string): Promise<DiscoveryJobStatus[]>;
    getJobHistory(limit?: number): Promise<DiscoveryJobStatus[]>;
    cancelJob(jobId: string): Promise<void>;
    cleanupJobs(olderThanHours?: number): Promise<number>;
    getJobStatistics(): {
        active: {
            total: number;
            pending: number;
            running: number;
        };
        completed: {
            total: number;
            successful: number;
            failed: number;
            cancelled: number;
        };
        averageExecutionTime: number;
        recentActivity: {
            timestamp: Date;
            count: number;
        }[];
    };
    getQueueStatus(): {
        queueLength: number;
        estimatedWaitTime: number;
        runningJobs: string[];
        nextInQueue: string[];
    };
    shutdown(): Promise<void>;
    private moveJobToHistory;
    private calculateRecentActivity;
}
//# sourceMappingURL=DiscoveryJobManager.d.ts.map