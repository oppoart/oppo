import { ScheduledJob, DiscoveryContext } from '../core/interfaces';
export declare class JobScheduler {
    private jobs;
    private isInitialized;
    private onJobExecute?;
    initialize(): Promise<void>;
    setJobExecuteCallback(callback: (discovererName: string, context?: DiscoveryContext) => Promise<void>): void;
    scheduleJob(discovererName: string, schedule: string, context?: DiscoveryContext, enabled?: boolean): string;
    updateJobSchedule(jobId: string, newSchedule: string): void;
    toggleJob(jobId: string, enabled: boolean): void;
    removeJob(jobId: string): void;
    getScheduledJobs(): ScheduledJob[];
    getScheduledJob(jobId: string): ScheduledJob | null;
    getJobsForDiscoverer(discovererName: string): ScheduledJob[];
    executeJobManually(jobId: string): Promise<void>;
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
    addDefaultSchedules(): void;
    shutdown(): Promise<void>;
    private executeJob;
    private getNextRunTime;
}
//# sourceMappingURL=JobScheduler.d.ts.map