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
    initialize(): Promise<void>;
    scoreOpportunities(profile: ArtistProfile, opportunities: OpportunityData[]): Promise<Map<string, number>>;
    scoreOpportunitiesWithDetails(profile: ArtistProfile, opportunities: OpportunityData[]): Promise<BatchScoringResult>;
    scoreOpportunity(profile: ArtistProfile, opportunity: OpportunityData): Promise<ScoringResult>;
    updateWeights(weights: Partial<ScoringWeights>): void;
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
    healthCheck(): Promise<boolean>;
    clearCache(): void;
    shutdown(): Promise<void>;
    private calculateDeadlineScore;
    private generateScoreReasoning;
    private generateCacheKey;
    private createBatches;
}
