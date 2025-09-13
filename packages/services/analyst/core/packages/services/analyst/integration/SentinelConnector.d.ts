import { SentinelService } from '../../sentinel/core/SentinelService';
import { DiscoveryContext } from '../../sentinel/core/interfaces';
import { OpportunityData, SourceType } from '../../../../apps/backend/src/types/discovery';
export interface SentinelConnectorConfig {
    sentinelInstance?: SentinelService;
    timeout: number;
    maxRetries: number;
    enableCaching: boolean;
}
export interface DiscoveryRequest {
    queries: string[];
    sources?: SourceType[];
    priority?: 'low' | 'medium' | 'high';
    maxResults?: number;
    context?: DiscoveryContext;
}
export interface DiscoveryResponse {
    opportunities: OpportunityData[];
    totalFound: number;
    sourcesUsed: SourceType[];
    processingTimeMs: number;
    errors: string[];
}
export declare class SentinelConnector {
    private config;
    private sentinelService?;
    private isInitialized;
    private discoveryCache;
    constructor(config?: Partial<SentinelConnectorConfig>);
    /**
     * Initialize the Sentinel connector
     */
    initialize(): Promise<void>;
    /**
     * Run discovery using Sentinel with generated queries
     * This is the key method that bridges query generation with opportunity discovery
     */
    runDiscovery(request: DiscoveryRequest): Promise<OpportunityData[]>;
    /**
     * Run discovery with detailed response metadata
     */
    runDiscoveryWithMetadata(request: DiscoveryRequest): Promise<DiscoveryResponse>;
    /**
     * Check if Sentinel service is available and healthy
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get discovery statistics
     */
    getDiscoveryStats(): Promise<{
        totalDiscoveries: number;
        cacheHits: number;
        averageOpportunitiesFound: number;
        mostUsedSources: SourceType[];
    }>;
    /**
     * Clear discovery cache
     */
    clearCache(): void;
    /**
     * Update Sentinel service instance
     */
    setSentinelService(sentinelService: SentinelService): void;
    /**
     * Shutdown the connector
     */
    shutdown(): Promise<void>;
    /**
     * Generate cache key for discovery requests
     */
    private generateCacheKey;
    /**
     * Generate mock discovery results for development/testing
     */
    private generateMockDiscoveryResults;
    /**
     * Generate mock tags based on search queries
     */
    private generateMockTags;
}
