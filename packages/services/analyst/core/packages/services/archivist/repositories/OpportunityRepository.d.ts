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
    /**
     * Create a new opportunity with proper relationship handling
     */
    create(data: OpportunityData): Promise<Opportunity>;
    /**
     * Find opportunity by ID with full relationships
     */
    findById(id: string): Promise<Opportunity | null>;
    /**
     * Update opportunity with validation
     */
    update(id: string, data: Partial<OpportunityData>): Promise<Opportunity>;
    /**
     * Update opportunity status with history tracking
     */
    updateStatus(id: string, status: TypedOpportunityStatus, notes?: string): Promise<void>;
    /**
     * Delete opportunity and all related data
     */
    delete(id: string): Promise<void>;
    /**
     * Find opportunities with advanced filtering
     */
    findMany(options?: FindOpportunitiesOptions): Promise<Opportunity[]>;
    /**
     * Find upcoming deadlines
     */
    findUpcomingDeadlines(days?: number): Promise<Opportunity[]>;
    /**
     * Find high relevance opportunities
     */
    findHighRelevance(threshold?: number): Promise<Opportunity[]>;
    /**
     * Get opportunities with comprehensive stats
     */
    getOpportunitiesWithStats(): Promise<OpportunityWithStats[]>;
    /**
     * Get comprehensive opportunity statistics
     */
    getStats(): Promise<OpportunityStats>;
    /**
     * Search opportunities with full-text search capabilities
     */
    search(query: string, options?: FindOpportunitiesOptions): Promise<Opportunity[]>;
    /**
     * Mark opportunities as expired based on deadline
     */
    markExpiredOpportunities(): Promise<number>;
    /**
     * Get opportunity by source hash (for deduplication)
     */
    findBySourceHash(hash: string): Promise<Opportunity | null>;
    /**
     * Bulk create opportunities with conflict handling
     */
    bulkCreate(opportunities: OpportunityData[]): Promise<{
        created: number;
        duplicates: number;
        errors: string[];
    }>;
}
