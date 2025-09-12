import { EventEmitter } from 'events';

/**
 * Configuration for concurrency management
 */
export interface ConcurrencyConfig {
  maxConcurrentJobs: number;
  maxJobsPerDomain: number;
  queueTimeout: number; // milliseconds
  jobTimeout: number; // milliseconds
  priorityLevels: number;
  enableMetrics: boolean;
  resourceLimits: {
    maxMemoryUsage: number; // MB
    maxCpuUsage: number; // percentage
  };
}

/**
 * Job priority levels
 */
export enum JobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5
}

/**
 * Job status
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

/**
 * Concurrency job definition
 */
export interface ConcurrencyJob<T = any> {
  id: string;
  name: string;
  priority: JobPriority;
  domain?: string;
  task: () => Promise<T>;
  timeout?: number;
  retries?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: JobStatus;
  result?: T;
  error?: Error;
}

/**
 * Domain-based rate limiting
 */
interface DomainLimiter {
  domain: string;
  runningJobs: number;
  maxJobs: number;
  lastRequest: Date;
}

/**
 * Concurrency metrics
 */
export interface ConcurrencyMetrics {
  totalJobs: number;
  runningJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  averageJobTime: number;
  throughputPerSecond: number;
  memoryUsage: number;
  cpuUsage: number;
  domainStats: Record<string, {
    active: number;
    completed: number;
    failed: number;
  }>;
}

/**
 * Job queue with priority ordering
 */
class PriorityQueue<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compareFunction: (a: T, b: T) => number) {
    this.compare = compareFunction;
  }

  enqueue(item: T): void {
    this.items.push(item);
    this.items.sort(this.compare);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items = [];
  }

  getAll(): T[] {
    return [...this.items];
  }
}

/**
 * ConcurrencyManager controls parallel processing with limits
 * Prevents overwhelming target servers and manages system resources
 */
export class ConcurrencyManager extends EventEmitter {
  private config: ConcurrencyConfig;
  private jobQueue: PriorityQueue<ConcurrencyJob>;
  private runningJobs: Map<string, ConcurrencyJob> = new Map();
  private domainLimiters: Map<string, DomainLimiter> = new Map();
  private completedJobs: ConcurrencyJob[] = [];
  private metrics: ConcurrencyMetrics;
  private processingInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ConcurrencyConfig> = {}) {
    super();

    this.config = {
      maxConcurrentJobs: 5,
      maxJobsPerDomain: 2,
      queueTimeout: 300000, // 5 minutes
      jobTimeout: 120000, // 2 minutes
      priorityLevels: 5,
      enableMetrics: true,
      resourceLimits: {
        maxMemoryUsage: 512, // MB
        maxCpuUsage: 80 // percentage
      },
      ...config
    };

    // Initialize priority queue
    this.jobQueue = new PriorityQueue<ConcurrencyJob>((a, b) => {
      // Higher priority first, then earlier creation time
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Start processing
    this.startProcessing();

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Add a job to the queue
   */
  async addJob<T>(
    name: string,
    task: () => Promise<T>,
    options: {
      priority?: JobPriority;
      domain?: string;
      timeout?: number;
      retries?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: ConcurrencyJob<T> = {
      id: jobId,
      name,
      priority: options.priority || JobPriority.NORMAL,
      domain: options.domain,
      task,
      timeout: options.timeout || this.config.jobTimeout,
      retries: options.retries || 0,
      metadata: options.metadata || {},
      createdAt: new Date(),
      status: JobStatus.PENDING
    };

    // Check resource limits before adding
    if (!(await this.checkResourceLimits())) {
      throw new Error('Resource limits exceeded, cannot add new job');
    }

    // Add to queue
    this.jobQueue.enqueue(job);
    this.metrics.totalJobs++;
    this.metrics.queuedJobs++;

    this.emit('jobQueued', job);
    
    console.log(`Job queued: ${name} (${jobId}) - Priority: ${job.priority}, Queue size: ${this.jobQueue.size()}`);
    
    return jobId;
  }

  /**
   * Get job result (waits for completion)
   */
  async getJobResult<T>(jobId: string, timeout: number = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const checkJob = () => {
        // Check running jobs
        const runningJob = this.runningJobs.get(jobId);
        if (runningJob && runningJob.status === JobStatus.COMPLETED) {
          resolve(runningJob.result as T);
          return;
        }

        // Check completed jobs
        const completedJob = this.completedJobs.find(job => job.id === jobId);
        if (completedJob) {
          if (completedJob.status === JobStatus.COMPLETED) {
            resolve(completedJob.result as T);
          } else {
            reject(completedJob.error || new Error(`Job failed with status: ${completedJob.status}`));
          }
          return;
        }

        // Check if job is still queued or running
        const queuedJob = this.jobQueue.getAll().find(job => job.id === jobId);
        if (queuedJob || runningJob) {
          // Still processing, wait a bit more
          setTimeout(checkJob, 100);
          return;
        }

        // Job not found
        reject(new Error(`Job not found: ${jobId}`));
      };

      // Set timeout if specified
      if (timeout > 0) {
        setTimeout(() => {
          reject(new Error(`Timeout waiting for job result: ${jobId}`));
        }, timeout);
      }

      checkJob();
    });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Check if job is running
    const runningJob = this.runningJobs.get(jobId);
    if (runningJob) {
      runningJob.status = JobStatus.CANCELLED;
      runningJob.completedAt = new Date();
      this.runningJobs.delete(jobId);
      this.completedJobs.push(runningJob);
      
      this.emit('jobCancelled', runningJob);
      return true;
    }

    // Remove from queue
    const queueItems = this.jobQueue.getAll();
    const jobIndex = queueItems.findIndex(job => job.id === jobId);
    
    if (jobIndex >= 0) {
      const job = queueItems[jobIndex];
      job.status = JobStatus.CANCELLED;
      job.completedAt = new Date();
      
      // Rebuild queue without this job
      this.jobQueue.clear();
      queueItems.forEach((item, index) => {
        if (index !== jobIndex) {
          this.jobQueue.enqueue(item);
        }
      });
      
      this.completedJobs.push(job);
      this.metrics.queuedJobs--;
      this.metrics.cancelledJobs++;
      
      this.emit('jobCancelled', job);
      return true;
    }

    return false;
  }

  /**
   * Get current metrics
   */
  getMetrics(): ConcurrencyMetrics {
    return { ...this.metrics };
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): JobStatus | null {
    // Check running jobs
    const runningJob = this.runningJobs.get(jobId);
    if (runningJob) {
      return runningJob.status;
    }

    // Check completed jobs
    const completedJob = this.completedJobs.find(job => job.id === jobId);
    if (completedJob) {
      return completedJob.status;
    }

    // Check queued jobs
    const queuedJob = this.jobQueue.getAll().find(job => job.id === jobId);
    if (queuedJob) {
      return queuedJob.status;
    }

    return null;
  }

  /**
   * Get all jobs with their status
   */
  getAllJobs(): {
    queued: ConcurrencyJob[];
    running: ConcurrencyJob[];
    completed: ConcurrencyJob[];
  } {
    return {
      queued: this.jobQueue.getAll(),
      running: Array.from(this.runningJobs.values()),
      completed: [...this.completedJobs]
    };
  }

  /**
   * Clear completed jobs (for memory management)
   */
  clearCompletedJobs(): void {
    this.completedJobs = [];
  }

  /**
   * Pause processing
   */
  pause(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.emit('paused');
  }

  /**
   * Resume processing
   */
  resume(): void {
    if (!this.processingInterval) {
      this.startProcessing();
    }
    this.emit('resumed');
  }

  /**
   * Shutdown the manager
   */
  async shutdown(): Promise<void> {
    // Stop processing new jobs
    this.pause();
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Wait for running jobs to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.runningJobs.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Cancel any remaining jobs
    for (const [jobId] of this.runningJobs) {
      await this.cancelJob(jobId);
    }

    this.emit('shutdown');
  }

  // =====================================
  // Private methods
  // =====================================

  /**
   * Start the job processing loop
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processNextJobs();
    }, 100); // Check every 100ms
  }

  /**
   * Process next available jobs
   */
  private async processNextJobs(): Promise<void> {
    // Check if we can run more jobs
    while (this.canRunMoreJobs() && !this.jobQueue.isEmpty()) {
      const job = this.jobQueue.dequeue();
      if (job) {
        await this.executeJob(job);
      }
    }
  }

  /**
   * Check if we can run more jobs
   */
  private canRunMoreJobs(): boolean {
    return this.runningJobs.size < this.config.maxConcurrentJobs;
  }

  /**
   * Check if we can run a job for a specific domain
   */
  private canRunJobForDomain(domain?: string): boolean {
    if (!domain) return true;

    const limiter = this.domainLimiters.get(domain);
    if (!limiter) {
      this.domainLimiters.set(domain, {
        domain,
        runningJobs: 0,
        maxJobs: this.config.maxJobsPerDomain,
        lastRequest: new Date()
      });
      return true;
    }

    return limiter.runningJobs < limiter.maxJobs;
  }

  /**
   * Execute a job
   */
  private async executeJob(job: ConcurrencyJob): Promise<void> {
    // Check domain limits
    if (job.domain && !this.canRunJobForDomain(job.domain)) {
      // Put job back in queue
      this.jobQueue.enqueue(job);
      return;
    }

    // Update job status
    job.status = JobStatus.RUNNING;
    job.startedAt = new Date();
    
    // Add to running jobs
    this.runningJobs.set(job.id, job);
    
    // Update metrics
    this.metrics.runningJobs++;
    this.metrics.queuedJobs--;

    // Update domain limiter
    if (job.domain) {
      const limiter = this.domainLimiters.get(job.domain)!;
      limiter.runningJobs++;
      limiter.lastRequest = new Date();
    }

    this.emit('jobStarted', job);
    console.log(`Job started: ${job.name} (${job.id})`);

    try {
      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.timeout || this.config.jobTimeout);
      });

      const result = await Promise.race([
        job.task(),
        timeoutPromise
      ]);

      // Job completed successfully
      job.status = JobStatus.COMPLETED;
      job.result = result;
      job.completedAt = new Date();
      
      this.metrics.completedJobs++;
      this.emit('jobCompleted', job);
      
      console.log(`Job completed: ${job.name} (${job.id})`);

    } catch (error) {
      // Job failed
      job.status = error.message === 'Job timeout' ? JobStatus.TIMEOUT : JobStatus.FAILED;
      job.error = error instanceof Error ? error : new Error(String(error));
      job.completedAt = new Date();
      
      this.metrics.failedJobs++;
      this.emit('jobFailed', job);
      
      console.error(`Job failed: ${job.name} (${job.id}):`, error);
    }

    // Cleanup
    this.runningJobs.delete(job.id);
    this.completedJobs.push(job);
    this.metrics.runningJobs--;

    // Update domain limiter
    if (job.domain) {
      const limiter = this.domainLimiters.get(job.domain)!;
      limiter.runningJobs--;
    }

    // Update average job time
    if (job.startedAt && job.completedAt) {
      const jobTime = job.completedAt.getTime() - job.startedAt.getTime();
      this.updateAverageJobTime(jobTime);
    }
  }

  /**
   * Check resource limits
   */
  private async checkResourceLimits(): Promise<boolean> {
    try {
      // Memory check
      const memUsage = process.memoryUsage();
      const memUsageMB = memUsage.heapUsed / 1024 / 1024;
      
      if (memUsageMB > this.config.resourceLimits.maxMemoryUsage) {
        console.warn(`Memory usage too high: ${memUsageMB.toFixed(1)}MB`);
        return false;
      }

      // CPU check would require additional monitoring
      // For now, just check if we have too many jobs
      if (this.metrics.totalJobs > 1000) {
        console.warn('Too many total jobs, rejecting new jobs');
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error checking resource limits:', error);
      return true; // Allow by default on error
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ConcurrencyMetrics {
    return {
      totalJobs: 0,
      runningJobs: 0,
      queuedJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      cancelledJobs: 0,
      averageJobTime: 0,
      throughputPerSecond: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      domainStats: {}
    };
  }

  /**
   * Update average job time
   */
  private updateAverageJobTime(jobTime: number): void {
    const totalCompletedJobs = this.metrics.completedJobs + this.metrics.failedJobs;
    const currentAverage = this.metrics.averageJobTime;
    
    this.metrics.averageJobTime = ((currentAverage * (totalCompletedJobs - 1)) + jobTime) / totalCompletedJobs;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    // Update memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB

    // Update domain stats
    this.metrics.domainStats = {};
    for (const [domain, limiter] of this.domainLimiters) {
      this.metrics.domainStats[domain] = {
        active: limiter.runningJobs,
        completed: 0, // Would need to track this separately
        failed: 0 // Would need to track this separately
      };
    }

    // Calculate throughput (jobs per second over last minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentJobs = this.completedJobs.filter(job => 
      job.completedAt && job.completedAt.getTime() > oneMinuteAgo
    );
    this.metrics.throughputPerSecond = recentJobs.length / 60;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConcurrencyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ConcurrencyConfig {
    return { ...this.config };
  }
}