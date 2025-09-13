import { PrismaClient, Opportunity } from '@prisma/client';
import { ArchivistService } from '../../archivist/core/ArchivistService';
import { OpportunityData } from '../../../../apps/backend/src/types/discovery';
export interface ArchivistConnectorConfig {
    archivistInstance?: ArchivistService;
    minRelevanceThreshold: number;
    batchSize: number;
    enableFiltering: boolean;
}
export interface StorageRequest {
    opportunities: OpportunityData[];
    source: string;
    profileId?: string;
}
export interface StorageResult {
    created: number;
    duplicates: number;
    errors: string[];
    storedOpportunities: string[];
}
export declare class ArchivistConnector {
    private prisma;
    private config;
    private archivistService?;
    private isInitialized;
    constructor(prisma: PrismaClient, config?: Partial<ArchivistConnectorConfig>);
    /**
     * Initialize the Archivist connector
     */
    initialize(): Promise<void>;
    /**
     * Store analyzed opportunities with relevance scores
     */
    storeOpportunities(opportunities: OpportunityData[]): Promise<StorageResult>;
    /**
     * Get opportunities by IDs for scoring
     */
    getOpportunities(opportunityIds: string[]): Promise<Opportunity[]>;
    /**
     * Update opportunity relevance scores
     */
    updateRelevanceScores(scores: Map<string, number>): Promise<{
        updated: number;
        errors: string[];
    }>;
    /**
     * Get high-relevance opportunities for an artist profile
     */
    getHighRelevanceOpportunities(profileId: string, threshold?: number, limit?: number): Promise<Opportunity[]>;
    /**
     * Search opportunities with filters
     */
    searchOpportunities(filters: {
        tags?: string[];
        location?: string;
        minRelevanceScore?: number;
        maxResults?: number;
        status?: string;
    }): Promise<Opportunity[]>;
    /**
     * Get Archivist statistics
     */
    getArchivistStats(): Promise<{
        totalOpportunities: number;
        averageRelevanceScore: number;
        processedOpportunities: number;
        recentlyAdded: number;
    }>;
    /**
     * Health check for Archivist connection
     */
    healthCheck(): Promise<boolean>;
    /**
     * Set Archivist service instance
     */
    setArchivistService(archivistService: ArchivistService): void;
    /**
     * Shutdown the connector
     */
    shutdown(): Promise<void>;
    /**
     * Create batches for processing
     */
    private createBatches;
    /**
     * Validate opportunity data before storage
     */
    private validateOpportunity;
    /**
     * Filter opportunities by various criteria
     */
    private filterOpportunities;
}
