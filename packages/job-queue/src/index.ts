/**
 * @oppo/job-queue
 *
 * Simple BullMQ wrapper for job queue management in OPPO
 *
 * Features:
 * - Type-safe job handling
 * - Simple API (add, process, pause, resume)
 * - Built-in retry logic (3 retries by default)
 * - Event handling and progress tracking
 * - Pre-defined job handlers for common tasks
 */

// Main exports
export { JobQueue } from './queue';

// Type exports
export type {
  BaseJobData,
  DiscoveryJobData,
  ScrapingJobData,
  AnalysisJobData,
  NotificationJobData,
  CleanupJobData,
  JobData,
  JobHandler,
  QueueConfig,
  JobProgress,
} from './types';

export { JobType, JobStatus } from './types';

// Pre-defined job handlers
export {
  discoveryJobHandler,
  createDiscoveryQueue,
} from './jobs/discovery';

export {
  scrapingJobHandler,
  createScrapingQueue,
} from './jobs/scraping';

export {
  analysisJobHandler,
  createAnalysisQueue,
} from './jobs/analysis';
