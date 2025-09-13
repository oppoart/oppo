import { PrismaClient } from '@prisma/client';
import { OpportunityData, DeduplicationResult } from '../../../../apps/backend/src/types/discovery';
export interface DuplicateCheckResult {
    isDuplicate: boolean;
    existingId?: string;
    hash?: string;
    action?: 'source_added' | 'new_opportunity';
    similarityScore?: number;
}
export interface SimilarityFactors {
    titleSimilarity: number;
    organizationSimilarity: number;
    deadlineSimilarity: number;
    descriptionSimilarity: number;
    urlSimilarity: number;
}
export declare class DeduplicationService {
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * Generate a canonical hash for deduplication
     */
    generateSourceHash(opportunity: OpportunityData): string;
    /**
     * Check if an opportunity is a duplicate
     */
    checkDuplicate(opportunity: OpportunityData): Promise<DuplicateCheckResult>;
    /**
     * Find exact matches using hash comparison
     */
    private findExactMatch;
    /**
     * Find similar opportunities using text similarity
     */
    private findSimilarityMatch;
    /**
     * Calculate similarity factors between two opportunities
     */
    private calculateSimilarityFactors;
    /**
     * Calculate overall similarity score from factors
     */
    private calculateOverallSimilarity;
    /**
     * Calculate similarity between two dates
     */
    private calculateDateSimilarity;
    /**
     * Record a duplicate relationship
     */
    private recordDuplicate;
    /**
     * Add a source link to an existing opportunity
     */
    private addSourceLink;
    /**
     * Run comprehensive deduplication on existing opportunities
     */
    runDeduplication(batchSize?: number): Promise<DeduplicationResult>;
    /**
     * Find duplicate candidates for a given opportunity
     */
    private findDuplicateCandidates;
    /**
     * Merge duplicate opportunities
     */
    private mergeDuplicates;
    /**
     * Normalize text for consistent comparison
     */
    private normalizeText;
    /**
     * Normalize date for consistent comparison
     */
    private normalizeDate;
    /**
     * Get deduplication statistics
     */
    getDeduplicationStats(): Promise<{
        totalOpportunities: any;
        duplicatesIdentified: any;
        deduplicationRate: number;
    }>;
}
