import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { queryExecutionService } from '../search/QueryExecutionService';
import { organizationScrapers } from '../scrapers/OrganizationScrapers';
import { searchResultProcessor } from '../processing/SearchResultProcessor';
import { dataValidationService } from '../validation/DataValidationService';
import { BookmarkScraperService } from '../scrapers/BookmarkScraperService';

export interface JobData {
  type: 'search-execution' | 'organization-scraping' | 'result-processing' | 'data-validation' | 'bookmark-scraping' | 'cleanup';
  payload: any;
  userId?: string;
  profileId?: string;
  priority?: 'low' | 'normal' | 'high';
  retryAttempts?: number;
  scheduledFor?: Date;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime?: number;
  metadata?: any;
}

export interface JobStatus {
  id: string;
  type: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  progress: number;
  data?: any;
  result?: JobResult;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  failedReason?: string;
  attempts: number;
  maxAttempts: number;
}

/**
 * Background Job Processing System
 * Handles scraping, processing, and validation jobs
 */
export class JobProcessor {
  private redis: Redis;
  private prisma: PrismaClient;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  
  private queueConfig = {
    'search-execution': {
      concurrency: 2,
      rateLimiter: { max: 5, duration: 60000 }, // 5 jobs per minute
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 20,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      }
    },
    'organization-scraping': {
      concurrency: 1, // One scraping job at a time to be respectful
      rateLimiter: { max: 2, duration: 300000 }, // 2 jobs per 5 minutes
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 10,
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 }
      }
    },
    'result-processing': {
      concurrency: 3,
      rateLimiter: { max: 10, duration: 60000 }, // 10 jobs per minute
      defaultJobOptions: {
        removeOnComplete: 20,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      }
    },
    'data-validation': {
      concurrency: 5,
      rateLimiter: { max: 20, duration: 60000 }, // 20 jobs per minute
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 }
      }
    },
    'bookmark-scraping': {
      concurrency: 1, // One bookmark scraping job at a time
      rateLimiter: { max: 1, duration: 300000 }, // 1 job per 5 minutes
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 10,
        attempts: 2,
        backoff: { type: 'exponential', delay: 15000 }
      }
    },
    'cleanup': {
      concurrency: 1,
      defaultJobOptions: {
        removeOnComplete: 2,
        removeOnFail: 5,
        attempts: 1
      }
    }
  };

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.prisma = new PrismaClient();
    this.initializeQueues();
    this.initializeWorkers();
  }

  /**
   * Initialize job queues
   */
  private initializeQueues(): void {
    for (const [queueName, config] of Object.entries(this.queueConfig)) {
      const queue = new Queue(queueName, {
        connection: this.redis,
        defaultJobOptions: config.defaultJobOptions
      });

      this.queues.set(queueName, queue);
      console.log(`📋 Initialized queue: ${queueName}`);
    }
  }

  /**
   * Initialize workers
   */
  private initializeWorkers(): void {
    for (const [queueName, config] of Object.entries(this.queueConfig)) {
      const worker = new Worker(
        queueName,
        async (job: Job) => this.processJob(job),
        {
          connection: this.redis,
          concurrency: config.concurrency,
          limiter: 'rateLimiter' in config ? config.rateLimiter : undefined
        }
      );

      // Event listeners
      worker.on('completed', (job) => {
        console.log(`✅ Job completed: ${job.id} (${queueName})`);
        this.recordJobMetrics(job, 'completed');
      });

      worker.on('failed', (job, err) => {
        console.error(`❌ Job failed: ${job?.id} (${queueName}):`, err.message);
        if (job) this.recordJobMetrics(job, 'failed', err.message);
      });

      worker.on('progress', (job, progress) => {
        console.log(`📊 Job progress: ${job.id} - ${progress}%`);
      });

      this.workers.set(queueName, worker);
      console.log(`👷 Initialized worker: ${queueName} (concurrency: ${config.concurrency})`);
    }
  }

  /**
   * Add job to queue
   */
  async addJob(jobData: JobData): Promise<string> {
    const queue = this.queues.get(jobData.type);
    if (!queue) {
      throw new Error(`Unknown job type: ${jobData.type}`);
    }

    const jobOptions: any = {
      priority: this.getPriority(jobData.priority || 'normal'),
      attempts: jobData.retryAttempts || this.queueConfig[jobData.type].defaultJobOptions.attempts
    };

    if (jobData.scheduledFor) {
      jobOptions.delay = jobData.scheduledFor.getTime() - Date.now();
    }

    const job = await queue.add(jobData.type, jobData, jobOptions);
    
    console.log(`📝 Added job: ${job.id} (${jobData.type})`);
    return job.id!;
  }

  /**
   * Process individual job
   */
  private async processJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    console.log(`🔄 Processing job: ${job.id} (${job.name})`);

    try {
      const jobData: JobData = job.data;
      let result: any;

      switch (jobData.type) {
        case 'search-execution':
          result = await this.processSearchExecution(job, jobData);
          break;
        case 'organization-scraping':
          result = await this.processOrganizationScraping(job, jobData);
          break;
        case 'result-processing':
          result = await this.processResultProcessing(job, jobData);
          break;
        case 'data-validation':
          result = await this.processDataValidation(job, jobData);
          break;
        case 'bookmark-scraping':
          result = await this.processBookmarkScraping(job, jobData);
          break;
        case 'cleanup':
          result = await this.processCleanup(job, jobData);
          break;
        default:
          throw new Error(`Unknown job type: ${jobData.type}`);
      }

      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result,
        processingTime,
        metadata: {
          jobId: job.id,
          type: jobData.type,
          completedAt: new Date()
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        metadata: {
          jobId: job.id,
          type: job.data.type,
          failedAt: new Date()
        }
      };
    }
  }

  /**
   * Process search execution job
   */
  private async processSearchExecution(job: Job, jobData: JobData): Promise<any> {
    const { profileId, options = {} } = jobData.payload;
    
    await job.updateProgress(10);
    
    const result = await queryExecutionService.executeProfileSearch(profileId, {
      ...options,
      enableRateLimiting: true
    });
    
    await job.updateProgress(50);
    
    // Wait for completion
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max
    
    while (attempts < maxAttempts) {
      const status = queryExecutionService.getExecutionStatus(result.jobId);
      if (!status) break;
      
      if (status.status === 'completed') {
        await job.updateProgress(100);
        return status;
      } else if (status.status === 'failed') {
        throw new Error(status.error || 'Search execution failed');
      }
      
      await job.updateProgress(50 + (attempts / maxAttempts) * 40);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
    }
    
    throw new Error('Search execution timeout');
  }

  /**
   * Process organization scraping job
   */
  private async processOrganizationScraping(job: Job, jobData: JobData): Promise<any> {
    const { organizations = [] } = jobData.payload;
    
    await job.updateProgress(10);
    
    let results;
    if (organizations.length > 0) {
      // Scrape specific organizations
      results = [];
      for (const orgName of organizations) {
        const strategy = (organizationScrapers as any).strategies?.find((s: any) => s.name === orgName);
        if (strategy) {
          const orgResults = await organizationScrapers.scrapeOrganization(strategy);
          results.push({ organization: orgName, opportunities: orgResults });
        }
        await job.updateProgress(10 + (results.length / organizations.length) * 70);
      }
    } else {
      // Scrape all organizations
      results = await organizationScrapers.scrapeAllOrganizations();
      await job.updateProgress(80);
    }
    
    // Store results
    const storedCount = await organizationScrapers.storeOpportunities(results);
    
    await job.updateProgress(100);
    
    return {
      organizationsScraped: results.length,
      opportunitiesFound: results.reduce((sum, r) => sum + r.opportunities.length, 0),
      opportunitiesStored: storedCount,
      results: results.map(r => ({
        organization: r.organization,
        count: r.opportunities.length
      }))
    };
  }

  /**
   * Process result processing job
   */
  private async processResultProcessing(job: Job, jobData: JobData): Promise<any> {
    const { searchResults, options = {} } = jobData.payload;
    
    await job.updateProgress(10);
    
    const processedResults = await searchResultProcessor.processBatch(searchResults, {
      ...options,
      enableScraping: true,
      qualityThreshold: 50
    });
    
    await job.updateProgress(80);
    
    const storedCount = await searchResultProcessor.storeOpportunities(processedResults);
    
    await job.updateProgress(100);
    
    return {
      resultsProcessed: processedResults.length,
      opportunitiesStored: storedCount,
      averageQualityScore: processedResults.reduce((sum, r) => sum + r.qualityScore, 0) / processedResults.length
    };
  }

  /**
   * Process data validation job
   */
  private async processDataValidation(job: Job, jobData: JobData): Promise<any> {
    const { opportunities } = jobData.payload;
    
    await job.updateProgress(10);
    
    const validationResults = await dataValidationService.validateBatch(opportunities);
    
    await job.updateProgress(90);
    
    // Store valid opportunities
    let storedCount = 0;
    for (const { data } of validationResults.valid) {
      try {
        const existing = await this.prisma.opportunity.findFirst({
          where: { url: data.url }
        });
        
        if (!existing) {
          await this.prisma.opportunity.create({
            data: {
              title: data.title,
              description: data.description,
              url: data.url,
              organization: data.organization,
              deadline: data.deadline,
              amount: data.amount,
              location: data.location,
              tags: data.tags,
              sourceType: 'validation',
              processed: true
            }
          });
          storedCount++;
        }
      } catch (error) {
        console.error(`Failed to store validated opportunity: ${error}`);
      }
    }
    
    await job.updateProgress(100);
    
    return {
      ...validationResults.statistics,
      opportunitiesStored: storedCount
    };
  }

  /**
   * Process bookmark scraping job
   */
  private async processBookmarkScraping(job: Job, jobData: JobData): Promise<any> {
    const { portalIds = [], options = {} } = jobData.payload;
    
    await job.updateProgress(10);
    
    const bookmarkScraper = new BookmarkScraperService(this.prisma, {
      enableMetrics: true,
      maxConcurrent: 1
    });
    
    let results;
    if (portalIds.length > 0) {
      // Scrape specific portals
      results = [];
      for (const portalId of portalIds) {
        try {
          const portalResult = await bookmarkScraper.scrapePortalById(portalId);
          results.push(portalResult);
          await job.updateProgress(10 + (results.length / portalIds.length) * 70);
        } catch (error) {
          console.error(`Failed to scrape portal ${portalId}:`, error);
          results.push({
            portalId,
            portalName: 'Unknown',
            itemsFound: 0,
            itemsSaved: 0,
            duplicatesSkipped: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            duration: 0
          });
        }
      }
    } else {
      // Scrape all portals
      results = await bookmarkScraper.scrapeAllPortals();
      await job.updateProgress(80);
    }
    
    // Cleanup resources
    await bookmarkScraper.cleanup();
    
    await job.updateProgress(100);
    
    const totalItemsFound = results.reduce((sum, r) => sum + r.itemsFound, 0);
    const totalItemsSaved = results.reduce((sum, r) => sum + r.itemsSaved, 0);
    const totalDuplicates = results.reduce((sum, r) => sum + r.duplicatesSkipped, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    
    return {
      portalsScraped: results.length,
      itemsFound: totalItemsFound,
      itemsSaved: totalItemsSaved,
      duplicatesSkipped: totalDuplicates,
      errorsEncountered: totalErrors,
      averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      results: results.map(r => ({
        portalId: r.portalId,
        portalName: r.portalName,
        itemsFound: r.itemsFound,
        itemsSaved: r.itemsSaved,
        errors: r.errors.length
      }))
    };
  }

  /**
   * Process cleanup job
   */
  private async processCleanup(job: Job, jobData: JobData): Promise<any> {
    const { cleanupType = 'old-jobs', daysOld = 7 } = jobData.payload;
    
    await job.updateProgress(10);
    
    let cleanedCount = 0;
    
    switch (cleanupType) {
      case 'old-jobs':
        // Clean up old job records from database
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        // Implementation would depend on job tracking table
        break;
        
      case 'failed-opportunities':
        // Clean up opportunities marked as failed/invalid
        const failedOpportunities = await this.prisma.opportunity.deleteMany({
          where: {
            processed: false,
            id: {
              not: undefined // Just a placeholder condition
            }
          }
        });
        cleanedCount = failedOpportunities.count;
        break;
        
      case 'cache-cleanup':
        // Clean up expired cache entries
        const expiredCache = await this.prisma.aIAnalysisCache.deleteMany({
          where: {
            expiresAt: {
              lt: new Date()
            }
          }
        });
        cleanedCount = expiredCache.count;
        break;
    }
    
    await job.updateProgress(100);
    
    return {
      cleanupType,
      itemsCleaned: cleanedCount
    };
  }

  /**
   * Get priority number from string
   */
  private getPriority(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high': return 1;
      case 'normal': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }

  /**
   * Record job metrics
   */
  private async recordJobMetrics(job: Job, status: 'completed' | 'failed', error?: string): Promise<void> {
    try {
      await this.prisma.aIServiceMetrics.create({
        data: {
          serviceName: 'job-processor',
          operation: job.name || 'unknown',
          responseTimeMs: job.finishedOn ? job.finishedOn - job.processedOn! : 0,
          success: status === 'completed',
          errorMessage: error,
          metadata: {
            jobId: job.id,
            attempts: job.attemptsMade,
            queueName: job.queueName,
            data: job.data
          }
        }
      });
    } catch (error) {
      console.error('Failed to record job metrics:', error);
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, queueName: string): Promise<JobStatus | null> {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id!,
      type: job.name!,
      status: await job.getState() as any,
      progress: job.progress(),
      data: job.data,
      result: job.returnvalue,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts || 1
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [queueName, queue] of this.queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      stats[queueName] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    }

    return stats;
  }

  /**
   * Schedule recurring job
   */
  async scheduleRecurringJob(
    jobData: Omit<JobData, 'scheduledFor'>,
    cronExpression: string
  ): Promise<void> {
    const queue = this.queues.get(jobData.type);
    if (!queue) {
      throw new Error(`Unknown job type: ${jobData.type}`);
    }

    await queue.add(
      `recurring-${jobData.type}`,
      jobData,
      {
        repeat: { pattern: cronExpression },
        removeOnComplete: 1,
        removeOnFail: 3
      }
    );

    console.log(`⏰ Scheduled recurring job: ${jobData.type} (${cronExpression})`);
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      console.log(`⏸️  Paused queue: ${queueName}`);
    }
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      console.log(`▶️  Resumed queue: ${queueName}`);
    }
  }

  /**
   * Cleanup and close connections
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up job processor...');
    
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    
    await this.redis.quit();
    await this.prisma.$disconnect();
  }
}

// Global instance
export const jobProcessor = new JobProcessor();

// Cleanup on process exit
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down job processor...');
  await jobProcessor.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down job processor...');
  await jobProcessor.cleanup();
  process.exit(0);
});