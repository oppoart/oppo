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
    /**
     * Save a new opportunity with deduplication and validation
     */
    saveOpportunity(data: unknown): Promise<{
        opportunity?: Opportunity;
        isDuplicate: boolean;
        duplicateOf?: string;
        validationErrors?: string[];
    }>;
    /**
     * Bulk save opportunities with batch processing
     */
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
    /**
     * Get opportunity by ID with full details
     */
    getOpportunity(id: string): Promise<Opportunity | null>;
    /**
     * Search opportunities with advanced filtering
     */
    searchOpportunities(options: FindOpportunitiesOptions): Promise<Opportunity[]>;
    /**
     * Update an opportunity
     */
    updateOpportunity(id: string, data: Partial<OpportunityData>): Promise<Opportunity>;
    /**
     * Delete an opportunity
     */
    deleteOpportunity(id: string): Promise<void>;
    /**
     * Get high relevance opportunities
     */
    getHighRelevanceOpportunities(threshold?: number): Promise<Opportunity[]>;
    /**
     * Get upcoming deadlines
     */
    getUpcomingDeadlines(days?: number): Promise<Opportunity[]>;
    /**
     * Get opportunities with comprehensive stats
     */
    getOpportunitiesWithStats(): Promise<OpportunityWithStats[]>;
    /**
     * Get starred/bookmarked opportunities
     */
    getStarredOpportunities(): Promise<Opportunity[]>;
    /**
     * Run comprehensive deduplication
     */
    runDeduplication(): Promise<DeduplicationResult>;
    /**
     * Get deduplication statistics
     */
    getDeduplicationStats(): Promise<{
        totalOpportunities: any;
        duplicatesIdentified: any;
        deduplicationRate: number;
    }>;
    /**
     * Clean up expired and old opportunities
     */
    performMaintenance(): Promise<{
        archived: number;
        deleted: number;
    }>;
    /**
     * Get comprehensive Archivist statistics
     */
    getStats(): Promise<ArchivistStats>;
    /**
     * Validate data integrity
     */
    validateDataIntegrity(): Promise<{
        totalRecords: number;
        invalidRecords: number;
        missingRelationships: number;
        orphanedRecords: number;
        issues: string[];
    }>;
    /**
     * Repair data integrity issues
     */
    repairDataIntegrity(): Promise<{
        repaired: number;
        errors: string[];
    }>;
    /**
     * Schedule automatic cleanup
     */
    private scheduleCleanup;
    /**
     * Get storage information
     */
    private getStorageInfo;
    /**
     * Health check for the Archivist service
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        details: {
            database: boolean;
            repositories: boolean;
            deduplication: boolean;
            lastMaintenance?: Date;
        };
    }>;
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
}
