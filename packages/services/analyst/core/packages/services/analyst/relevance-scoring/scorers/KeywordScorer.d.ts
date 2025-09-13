import { ArtistProfile } from '@prisma/client';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
export interface KeywordScorerConfig {
    enableStemming: boolean;
    caseSensitive: boolean;
    useWeights: boolean;
    stopWords: string[];
}
export interface KeywordMatch {
    word: string;
    weight: number;
    occurrences: number;
    field: string;
}
export interface KeywordAnalysis {
    matches: KeywordMatch[];
    totalMatches: number;
    weightedScore: number;
    coverage: number;
}
export declare class KeywordScorer {
    private config;
    private isInitialized;
    private stemCache;
    private keywordWeights;
    private fieldWeights;
    constructor(config?: Partial<KeywordScorerConfig>);
    /**
     * Initialize the keyword scorer
     */
    initialize(): Promise<void>;
    /**
     * Calculate keyword matching score between artist profile and opportunity
     */
    calculateScore(profile: ArtistProfile, opportunity: OpportunityData): Promise<number>;
    /**
     * Analyze keyword matches with detailed breakdown
     */
    analyzeKeywordMatches(profile: ArtistProfile, opportunity: OpportunityData): Promise<KeywordAnalysis>;
    /**
     * Extract and categorize keywords from artist profile
     */
    private extractProfileKeywords;
    /**
     * Extract text fields from opportunity
     */
    private extractOpportunityTexts;
    /**
     * Process keywords (normalize, stem, filter)
     */
    private processKeywords;
    /**
     * Extract keywords from text
     */
    private extractKeywordsFromText;
    /**
     * Count occurrences of a keyword in text
     */
    private countOccurrences;
    /**
     * Simple stemming algorithm (Porter stemmer approximation)
     */
    private stemWord;
    /**
     * Normalize score to 0-1 range
     */
    private normalizeScore;
    /**
     * Escape special regex characters
     */
    private escapeRegExp;
    /**
     * Get top matching keywords for analysis
     */
    getTopMatches(analysis: KeywordAnalysis, limit?: number): KeywordMatch[];
    /**
     * Get keyword statistics
     */
    getKeywordStats(analysis: KeywordAnalysis): {
        uniqueMatches: number;
        averageWeight: number;
        fieldDistribution: Record<string, number>;
    };
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Clear stem cache
     */
    clearCache(): void;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<KeywordScorerConfig>): void;
    /**
     * Shutdown the scorer
     */
    shutdown(): Promise<void>;
}
