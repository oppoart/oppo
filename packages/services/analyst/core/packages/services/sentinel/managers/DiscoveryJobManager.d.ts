import { DiscoveryJobStatus } from '../core/interfaces';
import { DiscoveryJobData, JobStatus } from '../../../../apps/backend/src/types/discovery';
/**
 * Manages discovery job queue and execution status
 * Provides job tracking, status updates, and queue management
 */
export declare class DiscoveryJobManager {
    private jobs;
    private jobHistory;
    private maxHistorySize;
    private isInitialized;
    /**
     * Initialize the job manager
     */
    initialize(): Promise<void>;
    /**
     * Create a new discovery job
     */
    createJob(jobData: Partial<DiscoveryJobData>): Promise<string>;
    /**
     * Update job status
     */
    updateJobStatus(jobId: string, status: JobStatus, error?: string, progress?: number): Promise<void>;
    /**
     * Update job progress
     */
    updateJobProgress(jobId: string, progress: number): Promise<void>;
    /**
     * Set job result
     */
    setJobResult(jobId: string, result: any): Promise<void>;
    /**
     * Get job status by ID
     */
    getJobStatus(jobId: string): Promise<DiscoveryJobStatus | null>;
    /**
     * Get all active jobs
     */
    getActiveJobs(): Promise<DiscoveryJobStatus[]>;
    /**
     * Get jobs by status
     */
    getJobsByStatus(status: JobStatus): Promise<DiscoveryJobStatus[]>;
    /**
     * Get jobs for a specific discoverer
     */
    getJobsForDiscoverer(discovererName: string): Promise<DiscoveryJobStatus[]>;
    /**
     * Get recent job history
     */
    getJobHistory(limit?: number): Promise<DiscoveryJobStatus[]>;
    /**
     * Cancel a running job
     */
    cancelJob(jobId: string): Promise<void>;
    /**
     * Clean up old jobs
     */
    cleanupJobs(olderThanHours?: number): Promise<number>;
    /**
     * Get job statistics
     */
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
    /**
     * Get job queue status
     */
    getQueueStatus(): {
        queueLength: number;
        estimatedWaitTime: number;
        runningJobs: string[];
        nextInQueue: string[];
    };
    /**
     * Shutdown job manager
     */
    shutdown(): Promise<void>;
    private moveJobToHistory;
    private calculateRecentActivity;
}
