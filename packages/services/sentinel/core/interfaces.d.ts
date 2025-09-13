import { DiscoveryResult, SourceType, JobStatus } from '../../../../apps/backend/src/types/discovery';
export interface DiscoverySourceConfig {
    enabled: boolean;
    priority: 'low' | 'medium' | 'high';
    rateLimit: number;
    timeout: number;
    retryAttempts: number;
    metadata?: Record<string, any>;
}
export interface OpportunityDiscoverer {
    readonly name: string;
    readonly sourceType: SourceType;
    readonly version: string;
    initialize(config: DiscoverySourceConfig): Promise<void>;
    isHealthy(): Promise<boolean>;
    discover(context?: DiscoveryContext): Promise<DiscoveryResult>;
    getConfig(): DiscoverySourceConfig;
    updateConfig(config: Partial<DiscoverySourceConfig>): Promise<void>;
    cleanup(): Promise<void>;
}
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
export interface DiscovererPlugin {
    discoverer: OpportunityDiscoverer;
    config: DiscoverySourceConfig;
    lastRun?: Date;
    totalRuns: number;
    successfulRuns: number;
    averageProcessingTime: number;
}
export interface RateLimitInfo {
    domain: string;
    requestsPerMinute: number;
    requestsMade: number;
    resetTime: Date;
    isLimited: boolean;
}
export interface ScheduledJob {
    id: string;
    discovererName: string;
    schedule: string;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    context?: DiscoveryContext;
}
export interface DiscoveryJobStatus {
    id: string;
    discovererName: string;
    status: JobStatus;
    startTime?: Date;
    endTime?: Date;
    error?: string;
    result?: DiscoveryResult;
    progress?: number;
}
export interface SentinelConfig {
    maxConcurrentJobs: number;
    defaultTimeout: number;
    retryAttempts: number;
    rateLimitEnabled: boolean;
    schedulingEnabled: boolean;
    sources: Record<string, DiscoverySourceConfig>;
}
