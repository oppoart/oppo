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
    generateSourceHash(opportunity: OpportunityData): string;
    checkDuplicate(opportunity: OpportunityData): Promise<DuplicateCheckResult>;
    private findExactMatch;
    private findSimilarityMatch;
    private calculateSimilarityFactors;
    private calculateOverallSimilarity;
    private calculateDateSimilarity;
    private recordDuplicate;
    private addSourceLink;
    runDeduplication(batchSize?: number): Promise<DeduplicationResult>;
    private findDuplicateCandidates;
    private mergeDuplicates;
    private normalizeText;
    private normalizeDate;
    getDeduplicationStats(): Promise<{
        totalOpportunities: any;
        duplicatesIdentified: any;
        deduplicationRate: number;
    }>;
}
//# sourceMappingURL=DeduplicationService.d.ts.map