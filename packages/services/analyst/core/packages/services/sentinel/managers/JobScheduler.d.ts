import { ScheduledJob, DiscoveryContext } from '../core/interfaces';
/**
 * Job scheduler for running discovery tasks on a schedule
 * Supports cron-based scheduling with job management
 */
export declare class JobScheduler {
    private jobs;
    private isInitialized;
    private onJobExecute?;
    /**
     * Initialize the job scheduler
     */
    initialize(): Promise<void>;
    /**
     * Set the callback function to execute when a job runs
     */
    setJobExecuteCallback(callback: (discovererName: string, context?: DiscoveryContext) => Promise<void>): void;
    /**
     * Schedule a new job
     */
    scheduleJob(discovererName: string, schedule: string, context?: DiscoveryContext, enabled?: boolean): string;
    /**
     * Update an existing job schedule
     */
    updateJobSchedule(jobId: string, newSchedule: string): void;
    /**
     * Enable or disable a scheduled job
     */
    toggleJob(jobId: string, enabled: boolean): void;
    /**
     * Remove a scheduled job
     */
    removeJob(jobId: string): void;
    /**
     * Get all scheduled jobs
     */
    getScheduledJobs(): ScheduledJob[];
    /**
     * Get a specific scheduled job
     */
    getScheduledJob(jobId: string): ScheduledJob | null;
    /**
     * Get jobs for a specific discoverer
     */
    getJobsForDiscoverer(discovererName: string): ScheduledJob[];
    /**
     * Manually execute a job
     */
    executeJobManually(jobId: string): Promise<void>;
    /**
     * Get job execution statistics
     */
    getJobStatistics(): {
        totalJobs: number;
        activeJobs: number;
        runningJobs: number;
        lastExecutions: {
            jobId: string;
            discovererName: string;
            lastRun?: Date;
        }[];
    };
    /**
     * Add default discovery schedules
     */
    addDefaultSchedules(): void;
    /**
     * Shutdown the job scheduler
     */
    shutdown(): Promise<void>;
    private executeJob;
    private getNextRunTime;
}
