import { PrismaClient, Opportunity } from '@prisma/client';
import { EventEmitter } from 'events';
import { FindOpportunitiesOptions, OpportunityWithStats } from '../repositories/OpportunityRepository';
import { DuplicateCheckResult } from '../deduplication/DeduplicationService';
import { OpportunityData, DeduplicationResult } from '../../../../apps/backend/src/types/discovery';
export interface ArchivistConfig {
    maxOpportunities: number;
    maxSourcesPerOpportunity: number;
    autoCleanup: boolean;
    cleanupIntervalHours: number;
    archiveAfterDays: number;
    duplicateThreshold: number;
}
export interface ArchivistEvents {
    'opportunity.created': (opportunity: Opportunity) => void;
    'opportunity.updated': (opportunity: Opportunity) => void;
    'opportunity.deleted': (opportunityId: string) => void;
    'duplicate.detected': (result: DuplicateCheckResult) => void;
    'cleanup.completed': (stats: {
        archived: number;
        deleted: number;
    }) => void;
    'error': (error: Error) => void;
}
export interface ArchivistStats {
    totalOpportunities: number;
    opportunitiesByStatus: Record<string, number>;
    averageRelevanceScore: number;
    recentlyAdded: number;
    upcomingDeadlines: number;
    duplicatesDetected: number;
    sourcesActive: number;
    storageUsed: string;
}
export declare class ArchivistService extends EventEmitter {
    private prisma;
    private opportunityRepository;
    private deduplicationService;
    private config;
    constructor(prisma: PrismaClient, config?: Partial<ArchivistConfig>);
    saveOpportunity(data: unknown): Promise<{
        opportunity?: Opportunity;
        isDuplicate: boolean;
        duplicateOf?: string;
        validationErrors?: string[];
    }>;
    bulkSaveOpportunities(opportunities: unknown[]): Promise<{
        created: number;
        duplicates: number;
        errors: string[];
        results: Array<{
            index: number;
            success: boolean;
            opportunityId?: string;
            isDuplicate?: boolean;
            error?: string;
        }>;
    }>;
    getOpportunity(id: string): Promise<Opportunity | null>;
    searchOpportunities(options: FindOpportunitiesOptions): Promise<Opportunity[]>;
    updateOpportunity(id: string, data: Partial<OpportunityData>): Promise<Opportunity>;
    deleteOpportunity(id: string): Promise<void>;
    getHighRelevanceOpportunities(threshold?: number): Promise<Opportunity[]>;
    getUpcomingDeadlines(days?: number): Promise<Opportunity[]>;
    getOpportunitiesWithStats(): Promise<OpportunityWithStats[]>;
    getStarredOpportunities(): Promise<Opportunity[]>;
    runDeduplication(): Promise<DeduplicationResult>;
    getDeduplicationStats(): Promise<{
        totalOpportunities: any;
        duplicatesIdentified: any;
        deduplicationRate: number;
    }>;
    performMaintenance(): Promise<{
        archived: number;
        deleted: number;
    }>;
    getStats(): Promise<ArchivistStats>;
    validateDataIntegrity(): Promise<{
        totalRecords: number;
        invalidRecords: number;
        missingRelationships: number;
        orphanedRecords: number;
        issues: string[];
    }>;
    repairDataIntegrity(): Promise<{
        repaired: number;
        errors: string[];
    }>;
    private scheduleCleanup;
    private getStorageInfo;
    healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        details: {
            database: boolean;
            repositories: boolean;
            deduplication: boolean;
            lastMaintenance?: Date;
        };
    }>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ArchivistService.d.ts.map