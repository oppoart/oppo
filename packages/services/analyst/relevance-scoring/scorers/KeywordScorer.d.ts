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
    initialize(): Promise<void>;
    calculateScore(profile: ArtistProfile, opportunity: OpportunityData): Promise<number>;
    analyzeKeywordMatches(profile: ArtistProfile, opportunity: OpportunityData): Promise<KeywordAnalysis>;
    private extractProfileKeywords;
    private extractOpportunityTexts;
    private processKeywords;
    private extractKeywordsFromText;
    private countOccurrences;
    private stemWord;
    private normalizeScore;
    private escapeRegExp;
    getTopMatches(analysis: KeywordAnalysis, limit?: number): KeywordMatch[];
    getKeywordStats(analysis: KeywordAnalysis): {
        uniqueMatches: number;
        averageWeight: number;
        fieldDistribution: Record<string, number>;
    };
    healthCheck(): Promise<boolean>;
    clearCache(): void;
    updateConfig(config: Partial<KeywordScorerConfig>): void;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=KeywordScorer.d.ts.map