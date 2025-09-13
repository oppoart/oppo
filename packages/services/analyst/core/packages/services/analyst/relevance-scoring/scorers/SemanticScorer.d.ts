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
    /**
     * Initialize the semantic scorer
     */
    initialize(): Promise<void>;
    /**
     * Calculate semantic similarity score between artist profile and opportunity
     */
    calculateScore(profile: ArtistProfile, opportunity: OpportunityData): Promise<number>;
    /**
     * Generate text embedding using configured AI service
     */
    private generateEmbedding;
    /**
     * Generate embedding using OpenAI
     */
    private generateOpenAIEmbedding;
    /**
     * Generate embedding using Google (Vertex AI)
     */
    private generateGoogleEmbedding;
    /**
     * Generate fallback embedding (for providers without embedding APIs)
     */
    private generateFallbackEmbedding;
    /**
     * Generate mock embedding for development/testing
     */
    private generateMockEmbedding;
    /**
     * Generate word frequency-based embedding
     */
    private generateWordFrequencyEmbedding;
    /**
     * Calculate cosine similarity between two embeddings
     */
    private calculateCosineSimilarity;
    /**
     * Create text representation of artist profile for embedding
     */
    private createProfileText;
    /**
     * Create text representation of opportunity for embedding
     */
    private createOpportunityText;
    /**
     * Normalize similarity score to 0-1 range with sigmoid enhancement
     */
    private normalizeScore;
    /**
     * Fallback semantic score when AI embedding fails
     */
    private fallbackSemanticScore;
    /**
     * Get default embedding model for AI provider
     */
    private getDefaultEmbeddingModel;
    /**
     * Simple seeded random number generator
     */
    private seededRandom;
    /**
     * Hash text for caching
     */
    private hashText;
    /**
     * Hash string for word positioning
     */
    private hashString;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Clear embedding cache
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
     * Shutdown the scorer
     */
    shutdown(): Promise<void>;
}
