import { Job, JobsOptions } from 'bullmq';

/**
 * Common job types in OPPO system
 */
export enum JobType {
  DISCOVERY = 'discovery',
  SCRAPING = 'scraping',
  ANALYSIS = 'analysis',
  NOTIFICATION = 'notification',
  CLEANUP = 'cleanup',
}

/**
 * Job status
 */
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
}

/**
 * Base job data interface
 */
export interface BaseJobData {
  userId?: string;
  profileId?: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

/**
 * Discovery job data
 */
export interface DiscoveryJobData extends BaseJobData {
  query: string;
  sources?: string[];
  maxResults?: number;
}

/**
 * Scraping job data
 */
export interface ScrapingJobData extends BaseJobData {
  url: string;
  selector?: string;
  waitFor?: number;
}

/**
 * Analysis job data
 */
export interface AnalysisJobData extends BaseJobData {
  opportunityId: string;
  analysisType: 'relevance' | 'sentiment' | 'entity';
}

/**
 * Notification job data
 */
export interface NotificationJobData extends BaseJobData {
  userId: string;
  type: 'email' | 'push' | 'websocket';
  message: string;
  title?: string;
}

/**
 * Cleanup job data
 */
export interface CleanupJobData extends BaseJobData {
  target: 'cache' | 'logs' | 'temp' | 'old-data';
  olderThan?: number; // Days
}

/**
 * Union type for all job data
 */
export type JobData =
  | DiscoveryJobData
  | ScrapingJobData
  | AnalysisJobData
  | NotificationJobData
  | CleanupJobData;

/**
 * Job handler function type
 */
export type JobHandler<T extends BaseJobData = BaseJobData> = (
  job: Job<T>
) => Promise<any>;

/**
 * Queue configuration options
 */
export interface QueueConfig {
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions?: JobsOptions;
}

/**
 * Job progress data
 */
export interface JobProgress {
  percentage: number;
  message?: string;
  data?: any;
}
