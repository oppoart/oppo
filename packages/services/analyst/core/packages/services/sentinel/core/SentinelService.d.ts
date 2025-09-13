import { OpportunityDiscoverer, SentinelConfig, DiscoveryContext, DiscoveryJobStatus } from './interfaces';
import { SourceConfigManager } from '../config/SourceConfigManager';
import { RateLimiter } from '../managers/RateLimiter';
import { JobScheduler } from '../managers/JobScheduler';
import { DiscoveryJobManager } from '../managers/DiscoveryJobManager';
import { OpportunityRepository } from '../../archivist/repositories/OpportunityRepository';
import { DeduplicationService } from '../../archivist/deduplication/DeduplicationService';
import { ConsolidatedDiscoveryResult } from '../../../../apps/backend/src/types/discovery';
/**
 * Main orchestration service for the Sentinel discovery engine
 * Manages all discovery plugins and coordinates their execution
 */
export declare class SentinelService {
    private configManager;
    private rateLimiter;
    private jobScheduler;
    private jobManager;
    private opportunityRepository;
    private deduplicationService;
    private config;
    private plugins;
    private isInitialized;
    constructor(configManager: SourceConfigManager, rateLimiter: RateLimiter, jobScheduler: JobScheduler, jobManager: DiscoveryJobManager, opportunityRepository: OpportunityRepository, deduplicationService: DeduplicationService, config: SentinelConfig);
    /**
     * Initialize the Sentinel service and all plugins
     */
    initialize(): Promise<void>;
    /**
     * Register a new discovery plugin
     */
    registerDiscoverer(discoverer: OpportunityDiscoverer): Promise<void>;
    /**
     * Unregister a discovery plugin
     */
    unregisterDiscoverer(discovererName: string): Promise<void>;
    /**
     * Get all registered discoverers
     */
    getDiscoverers(): OpportunityDiscoverer[];
    /**
     * Get discoverer by name
     */
    getDiscoverer(name: string): OpportunityDiscoverer | undefined;
    /**
     * Check health of all discoverers
     */
    checkHealth(): Promise<Record<string, boolean>>;
    /**
     * Run discovery from all enabled sources
     */
    runDiscovery(context?: DiscoveryContext): Promise<ConsolidatedDiscoveryResult>;
    /**
     * Run discovery from specific sources
     */
    runSpecificDiscovery(discovererNames: string[], context?: DiscoveryContext): Promise<ConsolidatedDiscoveryResult>;
    /**
     * Enable/disable a specific discoverer
     */
    toggleDiscoverer(discovererName: string, enabled: boolean): Promise<void>;
    /**
     * Get plugin statistics
     */
    getPluginStats(): Record<string, any>;
    /**
     * Get current job statuses
     */
    getJobStatuses(): Promise<DiscoveryJobStatus[]>;
    /**
     * Shutdown the Sentinel service
     */
    shutdown(): Promise<void>;
    private getEnabledDiscoverersByPriority;
    private createBatches;
    private runSingleDiscovery;
    private updatePluginStats;
    private processDiscoveredOpportunities;
}
