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
    initialize(): Promise<void>;
    generateQueries(profile: ArtistProfile, sources?: SourceType[], maxQueries?: number): Promise<string[]>;
    generateQueriesWithMetadata(request: QueryGenerationRequest): Promise<QueryGenerationResult>;
    private generateQueriesForSource;
    private getDefaultSources;
    private generateCacheKey;
    private hashProfileCharacteristics;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
    healthCheck(): Promise<boolean>;
    shutdown(): Promise<void>;
}
