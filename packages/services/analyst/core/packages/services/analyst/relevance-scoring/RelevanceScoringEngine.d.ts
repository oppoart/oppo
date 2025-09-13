import { PrismaClient, ArtistProfile } from '@prisma/client';
import { OpportunityData } from '../../../../apps/backend/src/types/discovery';
export interface ScoringConfig {
    aiProvider: 'openai' | 'anthropic' | 'google';
    timeout: number;
    enableSemanticScoring: boolean;
    scoringWeights: ScoringWeights;
    minRelevanceThreshold: number;
    cacheResults: boolean;
}
export interface ScoringWeights {
    semantic: number;
    keyword: number;
    category: number;
    location: number;
    experience: number;
    deadline: number;
}
export interface ScoringResult {
    opportunityId: string;
    overallScore: number;
    componentScores: {
        semantic: number;
        keyword: number;
        category: number;
        location: number;
        experience: number;
        deadline: number;
    };
    reasoning: string;
    processingTimeMs: number;
}
export interface BatchScoringResult {
    scores: Map<string, number>;
    detailedResults: ScoringResult[];
    averageScore: number;
    processingTimeMs: number;
    aiServiceUsed: string;
}
export declare class RelevanceScoringEngine {
    private prisma;
    private semanticScorer;
    private keywordScorer;
    private categoryScorer;
    private locationScorer;
    private experienceScorer;
    private scoreAggregator;
    private config;
    private isInitialized;
    private scoreCache;
    constructor(prisma: PrismaClient, config?: Partial<ScoringConfig>);
    /**
     * Initialize the scoring engine
     */
    initialize(): Promise<void>;
    /**
     * Score multiple opportunities for relevance to an artist profile
     */
    scoreOpportunities(profile: ArtistProfile, opportunities: OpportunityData[]): Promise<Map<string, number>>;
    /**
     * Score opportunities with detailed breakdown
     */
    scoreOpportunitiesWithDetails(profile: ArtistProfile, opportunities: OpportunityData[]): Promise<BatchScoringResult>;
    /**
     * Score a single opportunity for relevance to an artist profile
     */
    scoreOpportunity(profile: ArtistProfile, opportunity: OpportunityData): Promise<ScoringResult>;
    /**
     * Update scoring weights
     */
    updateWeights(weights: Partial<ScoringWeights>): void;
    /**
     * Get scoring statistics
     */
    getStats(): Promise<{
        totalScored: number;
        averageScore: number;
        cacheSize: number;
        componentStats: Record<string, {
            average: number;
            max: number;
            min: number;
        }>;
    }>;
    /**
     * Health check for scoring engine
     */
    healthCheck(): Promise<boolean>;
    /**
     * Clear scoring cache
     */
    clearCache(): void;
    /**
     * Shutdown the scoring engine
     */
    shutdown(): Promise<void>;
    /**
     * Calculate deadline urgency score
     */
    private calculateDeadlineScore;
    /**
     * Generate human-readable reasoning for the score
     */
    private generateScoreReasoning;
    /**
     * Generate cache key for scoring results
     */
    private generateCacheKey;
    /**
     * Create batches for processing
     */
    private createBatches;
}
