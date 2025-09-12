import { PrismaClient, Opportunity } from '@prisma/client';
import { OpportunityData, OpportunityStatus as TypedOpportunityStatus } from '../../../../apps/backend/src/types/discovery';
export interface OpportunityWithStats extends Opportunity {
    sourceCount: number;
    applicationCount: number;
    lastAction?: Date;
}
export interface FindOpportunitiesOptions {
    limit?: number;
    offset?: number;
    status?: TypedOpportunityStatus;
    minRelevanceScore?: number;
    deadlineAfter?: Date;
    deadlineBefore?: Date;
    search?: string;
    tags?: string[];
    organizationName?: string;
    starred?: boolean;
}
export interface OpportunityStats {
    total: number;
    byStatus: Record<string, number>;
    averageRelevanceScore: number;
    upcomingDeadlines: number;
    recentlyAdded: number;
}
export declare class OpportunityRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: OpportunityData): Promise<Opportunity>;
    findById(id: string): Promise<Opportunity | null>;
    update(id: string, data: Partial<OpportunityData>): Promise<Opportunity>;
    updateStatus(id: string, status: TypedOpportunityStatus, notes?: string): Promise<void>;
    delete(id: string): Promise<void>;
    findMany(options?: FindOpportunitiesOptions): Promise<Opportunity[]>;
    findUpcomingDeadlines(days?: number): Promise<Opportunity[]>;
    findHighRelevance(threshold?: number): Promise<Opportunity[]>;
    getOpportunitiesWithStats(): Promise<OpportunityWithStats[]>;
    getStats(): Promise<OpportunityStats>;
    search(query: string, options?: FindOpportunitiesOptions): Promise<Opportunity[]>;
    markExpiredOpportunities(): Promise<number>;
    findBySourceHash(hash: string): Promise<Opportunity | null>;
    bulkCreate(opportunities: OpportunityData[]): Promise<{
        created: number;
        duplicates: number;
        errors: string[];
    }>;
}
//# sourceMappingURL=OpportunityRepository.d.ts.map