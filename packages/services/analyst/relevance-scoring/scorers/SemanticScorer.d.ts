import { ArtistProfile } from '@prisma/client';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
export interface SemanticScorerConfig {
    aiProvider: 'openai' | 'anthropic' | 'google';
    embeddingModel?: string;
    maxTextLength: number;
    useCache: boolean;
}
export interface EmbeddingResult {
    embedding: number[];
    text: string;
    processingTime: number;
}
export declare class SemanticScorer {
    private config;
    private embeddingCache;
    private isInitialized;
    constructor(aiProvider?: 'openai' | 'anthropic' | 'google');
    initialize(): Promise<void>;
    calculateScore(profile: ArtistProfile, opportunity: OpportunityData): Promise<number>;
    private generateEmbedding;
    private generateOpenAIEmbedding;
    private generateGoogleEmbedding;
    private generateFallbackEmbedding;
    private generateMockEmbedding;
    private generateWordFrequencyEmbedding;
    private calculateCosineSimilarity;
    private createProfileText;
    private createOpportunityText;
    private normalizeScore;
    private fallbackSemanticScore;
    private getDefaultEmbeddingModel;
    private seededRandom;
    private hashText;
    private hashString;
    healthCheck(): Promise<boolean>;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
    shutdown(): Promise<void>;
}
//# sourceMappingURL=SemanticScorer.d.ts.map