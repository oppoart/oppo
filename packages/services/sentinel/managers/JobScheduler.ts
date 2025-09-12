import * as cron from 'node-cron';
import { ScheduledJob, DiscoveryContext } from '../core/interfaces';
import { randomUUID } from 'crypto';

/**
 * Job scheduler for running discovery tasks on a schedule
 * Supports cron-based scheduling with job management
 */
export class JobScheduler {
  private jobs: Map<string, ScheduledJobWrapper> = new Map();
  private isInitialized: boolean = false;
  private onJobExecute?: (discovererName: string, context?: DiscoveryContext) => Promise<void>;
  
  /**
   * Initialize the job scheduler
   */
  async initialize(): Promise<void> {
    console.log('JobScheduler initialized');
    this.isInitialized = true;
  }
  
  /**
   * Set the callback function to execute when a job runs
   */
  setJobExecuteCallback(callback: (discovererName: string, context?: DiscoveryContext) => Promise<void>): void {
    this.onJobExecute = callback;
  }
  
  /**
   * Schedule a new job
   */
  scheduleJob(
    discovererName: string, 
    schedule: string, 
    context?: DiscoveryContext,
    enabled: boolean = true
  ): string {
    if (!this.isInitialized) {
      throw new Error('JobScheduler is not initialized');
    }
    
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron expression: ${schedule}`);
    }
    
    const jobId = randomUUID();
    const scheduledJob: ScheduledJob = {
      id: jobId,
      discovererName,
      schedule,
      enabled,
      context
    };
    
    let task: cron.ScheduledTask | null = null;
    
    if (enabled) {
      task = cron.schedule(schedule, async () => {
        await this.executeJob(jobId);
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
      
      // Calculate next run time
      scheduledJob.nextRun = this.getNextRunTime(schedule);
    }
    
    const wrapper: ScheduledJobWrapper = {
      job: scheduledJob,
      task,
      isRunning: false
    };
    
    this.jobs.set(jobId, wrapper);
    
    console.log(`Scheduled job: ${discovererName} with schedule ${schedule}`);
    return jobId;
  }
  
  /**
   * Update an existing job schedule
   */
  updateJobSchedule(jobId: string, newSchedule: string): void {
    if (!cron.validate(newSchedule)) {
      throw new Error(`Invalid cron expression: ${newSchedule}`);
    }
    
    const wrapper = this.jobs.get(jobId);
    if (!wrapper) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    // Stop existing task
    if (wrapper.task) {
      wrapper.task.stop();
      wrapper.task.destroy();
    }
    
    // Update schedule
    wrapper.job.schedule = newSchedule;
    wrapper.job.nextRun = this.getNextRunTime(newSchedule);
    
    // Create new task if job is enabled
    if (wrapper.job.enabled) {
      wrapper.task = cron.schedule(newSchedule, async () => {
        await this.executeJob(jobId);
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
    }
    
    console.log(`Updated job schedule: ${jobId} to ${newSchedule}`);
  }
  
  /**
   * Enable or disable a scheduled job
   */
  toggleJob(jobId: string, enabled: boolean): void {
    const wrapper = this.jobs.get(jobId);
    if (!wrapper) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    wrapper.job.enabled = enabled;
    
    if (enabled && !wrapper.task) {
      // Start the job
      wrapper.task = cron.schedule(wrapper.job.schedule, async () => {
        await this.executeJob(jobId);
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
      wrapper.job.nextRun = this.getNextRunTime(wrapper.job.schedule);
    } else if (!enabled && wrapper.task) {
      // Stop the job
      wrapper.task.stop();
      wrapper.task.destroy();
      wrapper.task = null;
      wrapper.job.nextRun = undefined;
    }
    
    console.log(`${enabled ? 'Enabled' : 'Disabled'} job: ${jobId}`);
  }
  
  /**
   * Remove a scheduled job
   */
  removeJob(jobId: string): void {
    const wrapper = this.jobs.get(jobId);
    if (!wrapper) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    if (wrapper.task) {
      wrapper.task.stop();
      wrapper.task.destroy();
    }
    
    this.jobs.delete(jobId);
    console.log(`Removed job: ${jobId}`);
  }
  
  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(wrapper => ({
      ...wrapper.job,
      nextRun: wrapper.job.enabled ? this.getNextRunTime(wrapper.job.schedule) : undefined
    }));
  }
  
  /**
   * Get a specific scheduled job
   */
  getScheduledJob(jobId: string): ScheduledJob | null {
    const wrapper = this.jobs.get(jobId);
    if (!wrapper) {
      return null;
    }
    
    return {
      ...wrapper.job,
      nextRun: wrapper.job.enabled ? this.getNextRunTime(wrapper.job.schedule) : undefined
    };
  }
  
  /**
   * Get jobs for a specific discoverer
   */
  getJobsForDiscoverer(discovererName: string): ScheduledJob[] {
    return Array.from(this.jobs.values())
      .filter(wrapper => wrapper.job.discovererName === discovererName)
      .map(wrapper => ({
        ...wrapper.job,
        nextRun: wrapper.job.enabled ? this.getNextRunTime(wrapper.job.schedule) : undefined
      }));
  }
  
  /**
   * Manually execute a job
   */
  async executeJobManually(jobId: string): Promise<void> {
    const wrapper = this.jobs.get(jobId);
    if (!wrapper) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    if (wrapper.isRunning) {
      throw new Error(`Job is already running: ${jobId}`);
    }
    
    await this.executeJob(jobId);
  }
  
  /**
   * Get job execution statistics
   */
  getJobStatistics(): {
    totalJobs: number;
    activeJobs: number;
    runningJobs: number;
    lastExecutions: { jobId: string; discovererName: string; lastRun?: Date }[];
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(wrapper => wrapper.job.enabled).length,
      runningJobs: jobs.filter(wrapper => wrapper.isRunning).length,
      lastExecutions: jobs.map(wrapper => ({
        jobId: wrapper.job.id,
        discovererName: wrapper.job.discovererName,
        lastRun: wrapper.job.lastRun
      }))
    };
  }
  
  /**
   * Add default discovery schedules
   */
  addDefaultSchedules(): void {
    // High priority sources - run every 4 hours
    this.scheduleJob('firecrawl', '0 */4 * * *', {
      searchTerms: ['artist grants', 'art residencies', 'art opportunities'],
      maxResults: 50
    });
    
    this.scheduleJob('perplexity', '30 */4 * * *', {
      searchTerms: ['artist grants 2024', 'art competitions', 'creative fellowships'],
      maxResults: 30
    });
    
    // Medium priority sources - run twice daily
    this.scheduleJob('brave', '0 8,20 * * *', {
      searchTerms: ['art grants', 'artist opportunities'],
      maxResults: 40
    });
    
    this.scheduleJob('artconnect', '0 10,22 * * *', {
      maxResults: 25
    });
    
    console.log('Added default discovery schedules');
  }
  
  /**
   * Shutdown the job scheduler
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down JobScheduler...');
    
    for (const [jobId, wrapper] of Array.from(this.jobs.entries())) {
      if (wrapper.task) {
        wrapper.task.stop();
        wrapper.task.destroy();
      }
    }
    
    this.jobs.clear();
    this.isInitialized = false;
    console.log('JobScheduler shutdown complete');
  }
  
  // =====================================
  // Private methods
  // =====================================
  
  private async executeJob(jobId: string): Promise<void> {
    const wrapper = this.jobs.get(jobId);
    if (!wrapper) {
      console.error(`Job not found during execution: ${jobId}`);
      return;
    }
    
    if (wrapper.isRunning) {
      console.warn(`Job already running, skipping: ${jobId}`);
      return;
    }
    
    const job = wrapper.job;
    
    try {
      wrapper.isRunning = true;
      job.lastRun = new Date();
      job.nextRun = this.getNextRunTime(job.schedule);
      
      console.log(`Executing scheduled job: ${job.discovererName}`);
      
      if (this.onJobExecute) {
        await this.onJobExecute(job.discovererName, job.context);
      } else {
        console.warn('No job execute callback registered');
      }
      
      console.log(`Completed scheduled job: ${job.discovererName}`);
      
    } catch (error) {
      console.error(`Error executing job ${jobId}:`, error);
    } finally {
      wrapper.isRunning = false;
    }
  }
  
  private getNextRunTime(schedule: string): Date {
    try {
      // This is a simplified implementation
      // In a real implementation, you might want to use a cron parser library
      const task = cron.schedule(schedule, () => {}, { scheduled: false });
      
      // For now, just add an hour to current time as approximation
      return new Date(Date.now() + 60 * 60 * 1000);
    } catch (error) {
      return new Date(Date.now() + 60 * 60 * 1000);
    }
  }
}

/**
 * Internal wrapper for scheduled jobs
 */
interface ScheduledJobWrapper {
  job: ScheduledJob;
  task: cron.ScheduledTask | null;
  isRunning: boolean;
}