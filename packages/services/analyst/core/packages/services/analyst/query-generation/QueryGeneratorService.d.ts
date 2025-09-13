export interface ArtistProfile {
    id: string;
    name: string;
    mediums: string[];
    skills: string[];
    interests: string[];
    experience: string;
    location?: string;
    bio?: string;
    artistStatement?: string;
    userId: string;
}
import { SourceType, SearchQueryContext, GeneratedSearchQuery } from './types';
export interface QueryGeneratorConfig {
    aiProvider: 'openai' | 'anthropic' | 'google';
    timeout: number;
    maxQueriesPerSource: number;
    useSemanticEnhancement: boolean;
    cacheResults: boolean;
}
export interface QueryGenerationRequest {
    profile: ArtistProfile;
    sources?: SourceType[];
    maxQueries?: number;
    priority?: 'low' | 'medium' | 'high';
    context?: SearchQueryContext;
}
export interface QueryGenerationResult {
    queries: GeneratedSearchQuery[];
    sourceDistribution: Record<SourceType, number>;
    processingTimeMs: number;
    aiServiceUsed: string;
    cacheHit: boolean;
}
export declare class QueryGeneratorService {
    private profileAnalyzer;
    private contextBuilder;
    private queryOptimizer;
    private basicTemplate;
    private semanticTemplate;
    private config;
    private queryCache;
    constructor(config?: Partial<QueryGeneratorConfig>);
    /**
     * Initialize the query generation service
     */
    initialize(): Promise<void>;
    /**
     * Generate search queries from an artist profile
     * This is the core method that converts artist profiles into targeted search queries
     */
    generateQueries(profile: ArtistProfile, sources?: SourceType[], maxQueries?: number): Promise<string[]>;
    /**
     * Generate queries with full metadata and analysis
     */
    generateQueriesWithMetadata(request: QueryGenerationRequest): Promise<QueryGenerationResult>;
    /**
     * Generate queries specifically optimized for a source type
     */
    private generateQueriesForSource;
    /**
     * Get default sources based on priority
     */
    private getDefaultSources;
    /**
     * Generate cache key for query caching
     */
    private generateCacheKey;
    /**
     * Create a hash of key profile characteristics for caching
     */
    private hashProfileCharacteristics;
    /**
     * Clear query cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
    /**
     * Health check for query generation service
     */
    healthCheck(): Promise<boolean>;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
