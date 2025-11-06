import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import {
  BaseJobData,
  JobHandler,
  QueueConfig,
  JobProgress,
  JobStatus,
} from './types';

/**
 * Simple BullMQ wrapper for job queue management
 *
 * Features:
 * - Type-safe job handling
 * - Simple API (add, process, pause, resume)
 * - Built-in retry logic (3 retries by default)
 * - Event handling
 * - Progress tracking
 */
export class JobQueue<T extends BaseJobData = BaseJobData> {
  private queue: Queue<T>;
  private worker: Worker<T> | null = null;
  private queueEvents: QueueEvents | null = null;
  private connection: Redis;
  private queueName: string;

  constructor(queueName: string, config: QueueConfig = {}) {
    this.queueName = queueName;

    // Create Redis connection
    this.connection = new Redis({
      host: config.redis?.host || 'localhost',
      port: config.redis?.port || 6379,
      password: config.redis?.password,
      db: config.redis?.db || 0,
      maxRetriesPerRequest: null, // Required for BullMQ
    });

    // Create queue
    this.queue = new Queue<T>(queueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3, // Retry 3 times by default
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
        ...config.defaultJobOptions,
      },
    });

    // Create queue events for monitoring
    this.queueEvents = new QueueEvents(queueName, {
      connection: this.connection.duplicate(),
    });

    this.setupEventHandlers();
  }

  /**
   * Add a job to the queue
   */
  async add(
    jobName: string,
    data: T,
    options?: JobsOptions
  ): Promise<Job<T>> {
    return this.queue.add(jobName as any, data as any, options) as Promise<Job<T>>;
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulk(
    jobs: Array<{ name: string; data: T; opts?: JobsOptions }>
  ): Promise<Job<T>[]> {
    return this.queue.addBulk(jobs as any) as Promise<Job<T>[]>;
  }

  /**
   * Process jobs with a handler function
   */
  process(jobName: string, handler: JobHandler<T>, concurrency: number = 1): void {
    if (this.worker) {
      throw new Error('Worker already exists for this queue');
    }

    this.worker = new Worker<T>(
      this.queueName,
      async (job) => {
        // Only process jobs with matching name
        if (job.name !== jobName) {
          return;
        }

        // Add timestamp if not present
        if (!job.data.timestamp) {
          job.data.timestamp = Date.now();
        }

        return handler(job);
      },
      {
        connection: this.connection.duplicate(),
        concurrency,
      }
    );

    // Setup worker event handlers
    this.worker.on('completed', (job) => {
      console.log(`[${this.queueName}] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[${this.queueName}] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error(`[${this.queueName}] Worker error:`, err);
    });
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job<T> | undefined> {
    return this.queue.getJob(jobId);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return state as JobStatus;
  }

  /**
   * Remove a job by ID
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  /**
   * Get queue stats
   */
  async getStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Clean old jobs
   */
  async clean(grace: number = 24 * 3600 * 1000, limit: number = 1000): Promise<void> {
    await this.queue.clean(grace, limit, 'completed');
    await this.queue.clean(grace * 7, limit, 'failed'); // Keep failed jobs longer
  }

  /**
   * Drain queue (remove all jobs)
   */
  async drain(): Promise<void> {
    await this.queue.drain();
  }

  /**
   * Close queue and connections
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queueEvents) {
      await this.queueEvents.close();
    }
    await this.queue.close();
    await this.connection.quit();
  }

  /**
   * Setup event handlers for monitoring
   */
  private setupEventHandlers(): void {
    if (!this.queueEvents) return;

    this.queueEvents.on('completed', ({ jobId }) => {
      // Can be extended for custom logging/monitoring
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`[${this.queueName}] Job ${jobId} failed:`, failedReason);
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      const progress = data as JobProgress;
      console.log(
        `[${this.queueName}] Job ${jobId} progress: ${progress.percentage}%`,
        progress.message
      );
    });
  }

  /**
   * Update job progress
   */
  static async updateProgress(
    job: Job,
    progress: JobProgress
  ): Promise<void> {
    await job.updateProgress(progress);
  }

  /**
   * Log from within a job
   */
  static async log(job: Job, message: string): Promise<void> {
    await job.log(message);
  }
}
