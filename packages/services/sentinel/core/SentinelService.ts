import { 
  OpportunityDiscoverer, 
  DiscovererPlugin, 
  SentinelConfig, 
  DiscoveryContext,
  DiscoveryJobStatus
} from './interfaces';
import { SourceConfigManager } from '../config/SourceConfigManager';
import { RateLimiter } from '../managers/RateLimiter';
import { JobScheduler } from '../managers/JobScheduler';
import { DiscoveryJobManager } from '../managers/DiscoveryJobManager';
import { OpportunityRepository } from '../../archivist/repositories/OpportunityRepository';
import { DeduplicationService } from '../../archivist/deduplication/DeduplicationService';
import { 
  ConsolidatedDiscoveryResult, 
  DiscoveryResult,
  OpportunityData 
} from '../../../../apps/backend/src/types/discovery';

/**
 * Main orchestration service for the Sentinel discovery engine
 * Manages all discovery plugins and coordinates their execution
 */
export class SentinelService {
  private plugins: Map<string, DiscovererPlugin> = new Map();
  private isInitialized: boolean = false;
  
  constructor(
    private configManager: SourceConfigManager,
    private rateLimiter: RateLimiter,
    private jobScheduler: JobScheduler,
    private jobManager: DiscoveryJobManager,
    private opportunityRepository: OpportunityRepository,
    private deduplicationService: DeduplicationService,
    private config: SentinelConfig
  ) {}
  
  /**
   * Initialize the Sentinel service and all plugins
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    console.log('Initializing Sentinel Discovery Engine...');
    
    // Initialize configuration manager
    await this.configManager.initialize();
    
    // Initialize rate limiter
    await this.rateLimiter.initialize();
    
    // Initialize job scheduler
    await this.jobScheduler.initialize();
    
    // Initialize job manager
    await this.jobManager.initialize();
    
    console.log(`Sentinel initialized with ${this.plugins.size} discoverers`);
    this.isInitialized = true;
  }
  
  /**
   * Register a new discovery plugin
   */
  async registerDiscoverer(discoverer: OpportunityDiscoverer): Promise<void> {
    const config = await this.configManager.getSourceConfig(discoverer.name);
    
    if (!config) {
      console.warn(`No configuration found for discoverer ${discoverer.name}, using defaults`);
    }
    
    const plugin: DiscovererPlugin = {
      discoverer,
      config: config || {
        enabled: false, // Disabled by default if no config
        priority: 'medium',
        rateLimit: 60,
        timeout: 30000,
        retryAttempts: 3,
        metadata: {}
      },
      totalRuns: 0,
      successfulRuns: 0,
      averageProcessingTime: 0
    };
    
    // Initialize the discoverer
    await discoverer.initialize(plugin.config);
    
    this.plugins.set(discoverer.name, plugin);
    
    console.log(`Registered discoverer: ${discoverer.name} (${plugin.config.enabled ? 'enabled' : 'disabled'})`);
  }
  
  /**
   * Unregister a discovery plugin
   */
  async unregisterDiscoverer(discovererName: string): Promise<void> {
    const plugin = this.plugins.get(discovererName);
    if (plugin) {
      await plugin.discoverer.cleanup();
      this.plugins.delete(discovererName);
      console.log(`Unregistered discoverer: ${discovererName}`);
    }
  }
  
  /**
   * Get all registered discoverers
   */
  getDiscoverers(): OpportunityDiscoverer[] {
    return Array.from(this.plugins.values()).map(plugin => plugin.discoverer);
  }
  
  /**
   * Get discoverer by name
   */
  getDiscoverer(name: string): OpportunityDiscoverer | undefined {
    const plugin = this.plugins.get(name);
    return plugin?.discoverer;
  }
  
  /**
   * Check health of all discoverers
   */
  async checkHealth(): Promise<Record<string, boolean>> {
    const healthStatus: Record<string, boolean> = {};
    
    for (const [name, plugin] of Array.from(this.plugins.entries())) {
      try {
        healthStatus[name] = await plugin.discoverer.isHealthy();
      } catch (error) {
        healthStatus[name] = false;
        console.error(`Health check failed for ${name}:`, error);
      }
    }
    
    return healthStatus;
  }
  
  /**
   * Run discovery from all enabled sources
   */
  async runDiscovery(context?: DiscoveryContext): Promise<ConsolidatedDiscoveryResult> {
    if (!this.isInitialized) {
      throw new Error('Sentinel service is not initialized');
    }
    
    const startTime = Date.now();
    const results: DiscoveryResult[] = [];
    const errors: string[] = [];
    
    // Get enabled discoverers sorted by priority
    const enabledDiscoverers = this.getEnabledDiscoverersByPriority();
    
    console.log(`Starting discovery from ${enabledDiscoverers.length} enabled sources...`);
    
    // Run discoveries with concurrency control
    const concurrentLimit = this.config.maxConcurrentJobs;
    const batches = this.createBatches(enabledDiscoverers, concurrentLimit);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (plugin) => {
        const jobId = await this.jobManager.createJob({
          sourceType: plugin.discoverer.sourceType,
          sourceName: plugin.discoverer.name,
          status: 'pending'
        });
        
        try {
          await this.jobManager.updateJobStatus(jobId, 'running');
          
          const result = await this.runSingleDiscovery(plugin, context);
          results.push(result);
          
          await this.jobManager.updateJobStatus(jobId, 'completed');
          
          // Update plugin statistics
          this.updatePluginStats(plugin, true, result.processingTimeMs);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Discovery failed for ${plugin.discoverer.name}: ${errorMessage}`);
          
          await this.jobManager.updateJobStatus(jobId, 'failed', errorMessage);
          
          // Update plugin statistics
          this.updatePluginStats(plugin, false, 0);
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    // Process and store discovered opportunities
    const { newOpportunities, duplicatesRemoved } = await this.processDiscoveredOpportunities(results);
    
    const totalOpportunities = results.reduce((sum, result) => sum + result.opportunities.length, 0);
    
    const consolidatedResult: ConsolidatedDiscoveryResult = {
      totalOpportunities,
      newOpportunities,
      duplicatesRemoved,
      sources: results,
      processingTimeMs: Date.now() - startTime,
      errors
    };
    
    console.log(`Discovery completed: ${newOpportunities} new opportunities, ${duplicatesRemoved} duplicates removed`);
    
    return consolidatedResult;
  }
  
  /**
   * Run discovery from specific sources
   */
  async runSpecificDiscovery(
    discovererNames: string[], 
    context?: DiscoveryContext
  ): Promise<ConsolidatedDiscoveryResult> {
    const startTime = Date.now();
    const results: DiscoveryResult[] = [];
    const errors: string[] = [];
    
    for (const name of discovererNames) {
      const plugin = this.plugins.get(name);
      if (!plugin) {
        errors.push(`Discoverer not found: ${name}`);
        continue;
      }
      
      if (!plugin.config.enabled) {
        errors.push(`Discoverer is disabled: ${name}`);
        continue;
      }
      
      try {
        const result = await this.runSingleDiscovery(plugin, context);
        results.push(result);
        this.updatePluginStats(plugin, true, result.processingTimeMs);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Discovery failed for ${name}: ${errorMessage}`);
        this.updatePluginStats(plugin, false, 0);
      }
    }
    
    // Process and store discovered opportunities
    const { newOpportunities, duplicatesRemoved } = await this.processDiscoveredOpportunities(results);
    
    const totalOpportunities = results.reduce((sum, result) => sum + result.opportunities.length, 0);
    
    return {
      totalOpportunities,
      newOpportunities,
      duplicatesRemoved,
      sources: results,
      processingTimeMs: Date.now() - startTime,
      errors
    };
  }
  
  /**
   * Enable/disable a specific discoverer
   */
  async toggleDiscoverer(discovererName: string, enabled: boolean): Promise<void> {
    const plugin = this.plugins.get(discovererName);
    if (!plugin) {
      throw new Error(`Discoverer not found: ${discovererName}`);
    }
    
    plugin.config.enabled = enabled;
    await plugin.discoverer.updateConfig(plugin.config);
    await this.configManager.updateSourceConfig(discovererName, plugin.config);
    
    console.log(`${enabled ? 'Enabled' : 'Disabled'} discoverer: ${discovererName}`);
  }
  
  /**
   * Get plugin statistics
   */
  getPluginStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [name, plugin] of Array.from(this.plugins.entries())) {
      stats[name] = {
        enabled: plugin.config.enabled,
        priority: plugin.config.priority,
        totalRuns: plugin.totalRuns,
        successfulRuns: plugin.successfulRuns,
        successRate: plugin.totalRuns > 0 ? plugin.successfulRuns / plugin.totalRuns : 0,
        averageProcessingTime: plugin.averageProcessingTime,
        lastRun: plugin.lastRun
      };
    }
    
    return stats;
  }
  
  /**
   * Get current job statuses
   */
  async getJobStatuses(): Promise<DiscoveryJobStatus[]> {
    return await this.jobManager.getActiveJobs();
  }
  
  /**
   * Shutdown the Sentinel service
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Sentinel Discovery Engine...');
    
    // Cleanup all discoverers
    for (const [name, plugin] of Array.from(this.plugins.entries())) {
      try {
        await plugin.discoverer.cleanup();
      } catch (error) {
        console.error(`Error cleaning up discoverer ${name}:`, error);
      }
    }
    
    // Shutdown other services
    await this.jobScheduler.shutdown();
    await this.jobManager.shutdown();
    
    this.plugins.clear();
    this.isInitialized = false;
    
    console.log('Sentinel shutdown complete');
  }
  
  // =====================================
  // Private methods
  // =====================================
  
  private getEnabledDiscoverersByPriority(): DiscovererPlugin[] {
    const enabled = Array.from(this.plugins.values())
      .filter(plugin => plugin.config.enabled);
    
    // Sort by priority: high -> medium -> low
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return enabled.sort((a, b) => 
      priorityOrder[b.config.priority] - priorityOrder[a.config.priority]
    );
  }
  
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
  
  private async runSingleDiscovery(
    plugin: DiscovererPlugin, 
    context?: DiscoveryContext
  ): Promise<DiscoveryResult> {
    console.log(`Running discovery: ${plugin.discoverer.name}`);
    
    const result = await plugin.discoverer.discover(context);
    plugin.lastRun = new Date();
    
    console.log(`Completed discovery: ${plugin.discoverer.name} - ${result.opportunities.length} opportunities found`);
    
    return result;
  }
  
  private updatePluginStats(plugin: DiscovererPlugin, success: boolean, processingTime: number): void {
    plugin.totalRuns++;
    if (success) {
      plugin.successfulRuns++;
    }
    
    // Calculate running average
    if (plugin.totalRuns === 1) {
      plugin.averageProcessingTime = processingTime;
    } else {
      plugin.averageProcessingTime = 
        (plugin.averageProcessingTime * (plugin.totalRuns - 1) + processingTime) / plugin.totalRuns;
    }
  }
  
  private async processDiscoveredOpportunities(
    results: DiscoveryResult[]
  ): Promise<{ newOpportunities: number; duplicatesRemoved: number }> {
    const allOpportunities: OpportunityData[] = [];
    
    // Collect all opportunities
    for (const result of results) {
      allOpportunities.push(...result.opportunities);
    }
    
    if (allOpportunities.length === 0) {
      return { newOpportunities: 0, duplicatesRemoved: 0 };
    }
    
    // Process opportunities through deduplication
    let newOpportunities = 0;
    let duplicatesRemoved = 0;
    
    for (const opportunity of allOpportunities) {
      try {
        // Check for duplicates
        const duplicationResult = await this.deduplicationService.checkDuplicate(opportunity);
        
        if (!duplicationResult.isDuplicate) {
          // Store new opportunity
          await this.opportunityRepository.create(opportunity);
          newOpportunities++;
        } else {
          duplicatesRemoved++;
          console.log(`Duplicate opportunity detected: ${opportunity.title}`);
        }
      } catch (error) {
        console.error(`Error processing opportunity "${opportunity.title}":`, error);
      }
    }
    
    return { newOpportunities, duplicatesRemoved };
  }
}