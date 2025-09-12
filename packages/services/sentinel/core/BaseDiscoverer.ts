import { 
  OpportunityDiscoverer, 
  DiscoverySourceConfig, 
  DiscoveryContext 
} from './interfaces';
import { 
  DiscoveryResult, 
  OpportunityData, 
  SourceType 
} from '../../../../apps/backend/src/types/discovery';

/**
 * Abstract base class for all opportunity discoverers
 * Provides common functionality and enforces the plugin interface
 */
export abstract class BaseDiscoverer implements OpportunityDiscoverer {
  protected config: DiscoverySourceConfig;
  protected isInitialized: boolean = false;
  
  constructor(
    public readonly name: string,
    public readonly sourceType: SourceType,
    public readonly version: string = '1.0.0'
  ) {
    this.config = this.getDefaultConfig();
  }
  
  /**
   * Initialize the discoverer with configuration
   */
  async initialize(config: DiscoverySourceConfig): Promise<void> {
    this.config = { ...this.getDefaultConfig(), ...config };
    await this.onInitialize();
    this.isInitialized = true;
  }
  
  /**
   * Check if the discoverer is properly configured and ready
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    
    try {
      return await this.checkHealth();
    } catch (error) {
      console.error(`Health check failed for ${this.name}:`, error);
      return false;
    }
  }
  
  /**
   * Discover opportunities from this source
   */
  async discover(context?: DiscoveryContext): Promise<DiscoveryResult> {
    if (!this.isInitialized) {
      throw new Error(`Discoverer ${this.name} is not initialized`);
    }
    
    const startTime = Date.now();
    const result: DiscoveryResult = {
      sourceId: this.name,
      sourceName: this.name,
      sourceType: this.sourceType,
      opportunities: [],
      errors: [],
      processingTimeMs: 0,
      metadata: {}
    };
    
    try {
      // Apply rate limiting
      await this.waitForRateLimit();
      
      // Perform the actual discovery
      const opportunities = await this.performDiscovery(context);
      
      // Process and validate opportunities
      result.opportunities = await this.processOpportunities(opportunities);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Discovery failed for ${this.name}: ${errorMessage}`);
      console.error(`Discovery error in ${this.name}:`, error);
    }
    
    result.processingTimeMs = Date.now() - startTime;
    return result;
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): DiscoverySourceConfig {
    return { ...this.config };
  }
  
  /**
   * Update the configuration
   */
  async updateConfig(config: Partial<DiscoverySourceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.onConfigUpdate();
  }
  
  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.onCleanup();
    this.isInitialized = false;
  }
  
  // =====================================
  // Protected methods for subclasses
  // =====================================
  
  /**
   * Get default configuration for this discoverer
   */
  protected getDefaultConfig(): DiscoverySourceConfig {
    return {
      enabled: true,
      priority: 'medium',
      rateLimit: 60, // 60 requests per minute by default
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      metadata: {}
    };
  }
  
  /**
   * Override this to perform discoverer-specific initialization
   */
  protected async onInitialize(): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Override this to perform discoverer-specific health checks
   */
  protected async checkHealth(): Promise<boolean> {
    return true; // Default: always healthy
  }
  
  /**
   * Override this to handle configuration updates
   */
  protected async onConfigUpdate(): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Override this to perform discoverer-specific cleanup
   */
  protected async onCleanup(): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Wait for rate limiting if necessary
   */
  protected async waitForRateLimit(): Promise<void> {
    // This will be implemented by the RateLimiter service
    // For now, just add a small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  /**
   * Process and validate discovered opportunities
   */
  protected async processOpportunities(
    opportunities: OpportunityData[]
  ): Promise<OpportunityData[]> {
    const processed: OpportunityData[] = [];
    
    for (const opp of opportunities) {
      try {
        // Basic validation
        if (!opp.title || !opp.description || !opp.url) {
          continue; // Skip incomplete opportunities
        }
        
        // Ensure required fields are set
        const processedOpp: OpportunityData = {
          ...opp,
          sourceType: this.sourceType,
          processed: false,
          status: 'new',
          applied: false,
          starred: false,
          tags: opp.tags || [],
          sourceMetadata: {
            ...opp.sourceMetadata,
            discovererName: this.name,
            discovererVersion: this.version,
            discoveredAt: new Date().toISOString()
          }
        };
        
        processed.push(processedOpp);
      } catch (error) {
        console.warn(`Failed to process opportunity: ${error}`);
      }
    }
    
    return processed;
  }
  
  // =====================================
  // Abstract methods for subclasses
  // =====================================
  
  /**
   * Implement this method to perform the actual discovery logic
   */
  protected abstract performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]>;
}