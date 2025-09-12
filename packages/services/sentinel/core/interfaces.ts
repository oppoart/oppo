import { 
  OpportunityData, 
  DiscoveryResult, 
  SourceType 
} from '../../../../apps/backend/src/types/discovery';

/**
 * Configuration for discovery sources
 */
export interface DiscoverySourceConfig {
  enabled: boolean;
  priority: 'low' | 'medium' | 'high';
  rateLimit: number; // requests per minute
  timeout: number; // milliseconds
  retryAttempts: number;
  metadata?: Record<string, any>;
}

/**
 * Core interface that all opportunity discoverers must implement
 */
export interface OpportunityDiscoverer {
  readonly name: string;
  readonly sourceType: SourceType;
  readonly version: string;
  
  /**
   * Initialize the discoverer with configuration
   */
  initialize(config: DiscoverySourceConfig): Promise<void>;
  
  /**
   * Check if the discoverer is properly configured and ready
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * Discover opportunities from this source
   */
  discover(context?: DiscoveryContext): Promise<DiscoveryResult>;
  
  /**
   * Get the current configuration
   */
  getConfig(): DiscoverySourceConfig;
  
  /**
   * Update the configuration
   */
  updateConfig(config: Partial<DiscoverySourceConfig>): Promise<void>;
  
  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;
}

/**
 * Context passed to discoverers during discovery
 */
export interface DiscoveryContext {
  searchTerms?: string[];
  location?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  maxResults?: number;
  metadata?: Record<string, any>;
}

/**
 * Plugin registration information
 */
export interface DiscovererPlugin {
  discoverer: OpportunityDiscoverer;
  config: DiscoverySourceConfig;
  lastRun?: Date;
  totalRuns: number;
  successfulRuns: number;
  averageProcessingTime: number;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  domain: string;
  requestsPerMinute: number;
  requestsMade: number;
  resetTime: Date;
  isLimited: boolean;
}

/**
 * Job scheduling information
 */
export interface ScheduledJob {
  id: string;
  discovererName: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  context?: DiscoveryContext;
}

/**
 * Discovery job status
 */
export interface DiscoveryJobStatus {
  id: string;
  discovererName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
  result?: DiscoveryResult;
  progress?: number; // 0-100
}

/**
 * Sentinel service configuration
 */
export interface SentinelConfig {
  maxConcurrentJobs: number;
  defaultTimeout: number;
  retryAttempts: number;
  rateLimitEnabled: boolean;
  schedulingEnabled: boolean;
  sources: Record<string, DiscoverySourceConfig>;
}