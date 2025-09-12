import { randomUUID } from 'crypto';
import { DiscoveryJobStatus } from '../core/interfaces';
import { DiscoveryJobData, JobStatus } from '../../../../apps/backend/src/types/discovery';

/**
 * Manages discovery job queue and execution status
 * Provides job tracking, status updates, and queue management
 */
export class DiscoveryJobManager {
  private jobs: Map<string, DiscoveryJobStatus> = new Map();
  private jobHistory: DiscoveryJobStatus[] = [];
  private maxHistorySize: number = 1000;
  private isInitialized: boolean = false;
  
  /**
   * Initialize the job manager
   */
  async initialize(): Promise<void> {
    console.log('DiscoveryJobManager initialized');
    this.isInitialized = true;
  }
  
  /**
   * Create a new discovery job
   */
  async createJob(jobData: Partial<DiscoveryJobData>): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('DiscoveryJobManager is not initialized');
    }
    
    const jobId = randomUUID();
    const now = new Date();
    
    const jobStatus: DiscoveryJobStatus = {
      id: jobId,
      discovererName: jobData.sourceName || jobData.sourceType || 'unknown',
      status: 'pending',
      startTime: now,
      progress: 0
    };
    
    this.jobs.set(jobId, jobStatus);
    
    console.log(`Created discovery job: ${jobId} for ${jobStatus.discovererName}`);
    return jobId;
  }
  
  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string, 
    status: JobStatus, 
    error?: string, 
    progress?: number
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    const now = new Date();
    
    job.status = status;
    if (error) job.error = error;
    if (progress !== undefined) job.progress = progress;
    
    if (status === 'running' && !job.startTime) {
      job.startTime = now;
    }
    
    if (status === 'completed' || status === 'failed') {
      job.endTime = now;
      job.progress = status === 'completed' ? 100 : job.progress;
      
      // Move completed/failed jobs to history
      this.moveJobToHistory(jobId);
    }
    
    console.log(`Updated job ${jobId}: ${status}${error ? ` - ${error}` : ''}`);
  }
  
  /**
   * Update job progress
   */
  async updateJobProgress(jobId: string, progress: number): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(100, Math.max(0, progress));
    }
  }
  
  /**
   * Set job result
   */
  async setJobResult(jobId: string, result: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.result = result;
    }
  }
  
  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string): Promise<DiscoveryJobStatus | null> {
    const activeJob = this.jobs.get(jobId);
    if (activeJob) {
      return { ...activeJob };
    }
    
    // Check history
    const historicalJob = this.jobHistory.find(job => job.id === jobId);
    return historicalJob ? { ...historicalJob } : null;
  }
  
  /**
   * Get all active jobs
   */
  async getActiveJobs(): Promise<DiscoveryJobStatus[]> {
    return Array.from(this.jobs.values()).map(job => ({ ...job }));
  }
  
  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: JobStatus): Promise<DiscoveryJobStatus[]> {
    const activeJobs = Array.from(this.jobs.values()).filter(job => job.status === status);
    const historicalJobs = this.jobHistory.filter(job => job.status === status);
    
    return [...activeJobs, ...historicalJobs].map(job => ({ ...job }));
  }
  
  /**
   * Get jobs for a specific discoverer
   */
  async getJobsForDiscoverer(discovererName: string): Promise<DiscoveryJobStatus[]> {
    const activeJobs = Array.from(this.jobs.values())
      .filter(job => job.discovererName === discovererName);
    
    const historicalJobs = this.jobHistory
      .filter(job => job.discovererName === discovererName)
      .slice(-10); // Get last 10 historical jobs
    
    return [...activeJobs, ...historicalJobs].map(job => ({ ...job }));
  }
  
  /**
   * Get recent job history
   */
  async getJobHistory(limit: number = 50): Promise<DiscoveryJobStatus[]> {
    return this.jobHistory
      .slice(-limit)
      .reverse()
      .map(job => ({ ...job }));
  }
  
  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error(`Cannot cancel job in status: ${job.status}`);
    }
    
    job.status = 'cancelled';
    job.endTime = new Date();
    job.error = 'Job cancelled by user';
    
    this.moveJobToHistory(jobId);
    
    console.log(`Cancelled job: ${jobId}`);
  }
  
  /**
   * Clean up old jobs
   */
  async cleanupJobs(olderThanHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    // Clean up active jobs that should have completed
    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      if (job.startTime && job.startTime < cutoffTime && 
          (job.status === 'pending' || job.status === 'running')) {
        job.status = 'failed';
        job.error = 'Job timed out';
        job.endTime = new Date();
        this.moveJobToHistory(jobId);
        cleanedCount++;
      }
    }
    
    // Clean up old history
    if (this.jobHistory.length > this.maxHistorySize) {
      const toRemove = this.jobHistory.length - this.maxHistorySize;
      this.jobHistory = this.jobHistory.slice(toRemove);
      cleanedCount += toRemove;
    }
    
    console.log(`Cleaned up ${cleanedCount} old jobs`);
    return cleanedCount;
  }
  
  /**
   * Get job statistics
   */
  getJobStatistics(): {
    active: { total: number; pending: number; running: number };
    completed: { total: number; successful: number; failed: number; cancelled: number };
    averageExecutionTime: number;
    recentActivity: { timestamp: Date; count: number }[];
  } {
    const activeJobs = Array.from(this.jobs.values());
    const allJobs = [...activeJobs, ...this.jobHistory];
    
    // Active job counts
    const active = {
      total: activeJobs.length,
      pending: activeJobs.filter(job => job.status === 'pending').length,
      running: activeJobs.filter(job => job.status === 'running').length
    };
    
    // Completed job counts
    const completedJobs = allJobs.filter(job => 
      job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
    );
    
    const completed = {
      total: completedJobs.length,
      successful: completedJobs.filter(job => job.status === 'completed').length,
      failed: completedJobs.filter(job => job.status === 'failed').length,
      cancelled: completedJobs.filter(job => job.status === 'cancelled').length
    };
    
    // Average execution time (for completed jobs)
    const successfulJobs = completedJobs.filter(job => 
      job.status === 'completed' && job.startTime && job.endTime
    );
    
    const averageExecutionTime = successfulJobs.length > 0 
      ? successfulJobs.reduce((sum, job) => {
          const duration = job.endTime!.getTime() - job.startTime!.getTime();
          return sum + duration;
        }, 0) / successfulJobs.length
      : 0;
    
    // Recent activity (last 24 hours, grouped by hour)
    const recentActivity = this.calculateRecentActivity(allJobs);
    
    return {
      active,
      completed,
      averageExecutionTime,
      recentActivity
    };
  }
  
  /**
   * Get job queue status
   */
  getQueueStatus(): {
    queueLength: number;
    estimatedWaitTime: number;
    runningJobs: string[];
    nextInQueue: string[];
  } {
    const activeJobs = Array.from(this.jobs.values());
    const pendingJobs = activeJobs.filter(job => job.status === 'pending');
    const runningJobs = activeJobs.filter(job => job.status === 'running');
    
    // Simple estimation based on average execution time
    const stats = this.getJobStatistics();
    const avgExecutionTime = stats.averageExecutionTime || 30000; // Default 30 seconds
    const estimatedWaitTime = pendingJobs.length * avgExecutionTime;
    
    return {
      queueLength: pendingJobs.length,
      estimatedWaitTime,
      runningJobs: runningJobs.map(job => job.id),
      nextInQueue: pendingJobs.slice(0, 5).map(job => job.id)
    };
  }
  
  /**
   * Shutdown job manager
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down DiscoveryJobManager...');
    
    // Cancel all running jobs
    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      if (job.status === 'running' || job.status === 'pending') {
        job.status = 'cancelled';
        job.error = 'System shutdown';
        job.endTime = new Date();
      }
    }
    
    // Move all jobs to history
    for (const [jobId] of Array.from(this.jobs.entries())) {
      this.moveJobToHistory(jobId);
    }
    
    this.isInitialized = false;
    console.log('DiscoveryJobManager shutdown complete');
  }
  
  // =====================================
  // Private methods
  // =====================================
  
  private moveJobToHistory(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobHistory.push({ ...job });
      this.jobs.delete(jobId);
      
      // Maintain history size limit
      if (this.jobHistory.length > this.maxHistorySize) {
        this.jobHistory = this.jobHistory.slice(-this.maxHistorySize);
      }
    }
  }
  
  private calculateRecentActivity(jobs: DiscoveryJobStatus[]): { timestamp: Date; count: number }[] {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Group jobs by hour
    const hourlyActivity: Record<string, number> = {};
    
    for (const job of jobs) {
      if (job.startTime && job.startTime >= oneDayAgo) {
        const hour = new Date(job.startTime.getFullYear(), job.startTime.getMonth(), 
                             job.startTime.getDate(), job.startTime.getHours());
        const hourKey = hour.toISOString();
        hourlyActivity[hourKey] = (hourlyActivity[hourKey] || 0) + 1;
      }
    }
    
    // Convert to array and sort
    return Object.entries(hourlyActivity)
      .map(([timestamp, count]) => ({ timestamp: new Date(timestamp), count }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}