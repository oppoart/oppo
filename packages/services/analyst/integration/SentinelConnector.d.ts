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
    initialize(): Promise<void>;
    runDiscovery(request: DiscoveryRequest): Promise<OpportunityData[]>;
    runDiscoveryWithMetadata(request: DiscoveryRequest): Promise<DiscoveryResponse>;
    healthCheck(): Promise<boolean>;
    getDiscoveryStats(): Promise<{
        totalDiscoveries: number;
        cacheHits: number;
        averageOpportunitiesFound: number;
        mostUsedSources: SourceType[];
    }>;
    clearCache(): void;
    setSentinelService(sentinelService: SentinelService): void;
    shutdown(): Promise<void>;
    private generateCacheKey;
    private generateMockDiscoveryResults;
    private generateMockTags;
}
//# sourceMappingURL=SentinelConnector.d.ts.map