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
    initialize(): Promise<void>;
    storeOpportunities(opportunities: OpportunityData[]): Promise<StorageResult>;
    getOpportunities(opportunityIds: string[]): Promise<Opportunity[]>;
    updateRelevanceScores(scores: Map<string, number>): Promise<{
        updated: number;
        errors: string[];
    }>;
    getHighRelevanceOpportunities(profileId: string, threshold?: number, limit?: number): Promise<Opportunity[]>;
    searchOpportunities(filters: {
        tags?: string[];
        location?: string;
        minRelevanceScore?: number;
        maxResults?: number;
        status?: string;
    }): Promise<Opportunity[]>;
    getArchivistStats(): Promise<{
        totalOpportunities: number;
        averageRelevanceScore: number;
        processedOpportunities: number;
        recentlyAdded: number;
    }>;
    healthCheck(): Promise<boolean>;
    setArchivistService(archivistService: ArchivistService): void;
    shutdown(): Promise<void>;
    private createBatches;
    private validateOpportunity;
    private filterOpportunities;
}
//# sourceMappingURL=ArchivistConnector.d.ts.map