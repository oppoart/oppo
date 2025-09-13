import { PrismaClient, Opportunity } from '@prisma/client';
import { EventEmitter } from 'events';
import { OpportunityData, SourceType } from '../../../../apps/backend/src/types/discovery';
export interface AnalystConfig {
    maxConcurrentAnalyses: number;
    queryGenerationTimeout: number;
    scoringTimeout: number;
    aiProvider: 'openai' | 'anthropic' | 'google';
    cacheDuration: number;
    enablePersonalization: boolean;
}
export interface AnalysisRequest {
    artistProfileId: string;
    sources?: SourceType[];
    maxQueries?: number;
    priority?: 'low' | 'medium' | 'high';
}
export interface AnalysisResult {
    requestId: string;
    profileId: string;
    queriesGenerated: number;
    opportunitiesDiscovered: number;
    opportunitiesScored: number;
    newOpportunities: number;
    processingTimeMs: number;
    errors: string[];
    metadata?: Record<string, any>;
}
export interface AnalystEvents {
    'analysis.started': (request: AnalysisRequest) => void;
    'analysis.completed': (result: AnalysisResult) => void;
    'analysis.failed': (error: Error, request: AnalysisRequest) => void;
    'query.generated': (query: string, context: any) => void;
    'opportunities.discovered': (opportunities: OpportunityData[]) => void;
    'opportunities.scored': (opportunities: Opportunity[]) => void;
    'error': (error: Error) => void;
}
export interface AnalystStats {
    totalAnalyses: number;
    successfulAnalyses: number;
    averageProcessingTime: number;
    totalQueriesGenerated: number;
    totalOpportunitiesScored: number;
    aiServiceUsage: Record<string, number>;
    lastAnalysis?: Date;
}
export declare class AnalystService extends EventEmitter {
    private prisma;
    private queryGenerator;
    private scoringEngine;
    private sentinelConnector;
    private archivistConnector;
    private config;
    private isInitialized;
    private activeAnalyses;
    constructor(prisma: PrismaClient, config?: Partial<AnalystConfig>);
    /**
     * Initialize the Analyst service and all components
     */
    initialize(): Promise<void>;
    /**
     * Run complete AI analysis for an artist profile
     * This is the core method that orchestrates the entire pipeline:
     * Profile → Query Generation → Discovery → Relevance Scoring → Storage
     */
    runAnalysis(request: AnalysisRequest): Promise<AnalysisResult>;
    /**
     * Generate queries for an artist profile without running full discovery
     */
    generateQueries(profileId: string, sources?: SourceType[]): Promise<string[]>;
    /**
     * Score opportunities for relevance to an artist profile
     */
    scoreOpportunities(profileId: string, opportunityIds: string[]): Promise<Map<string, number>>;
    /**
     * Get analysis statistics
     */
    getStats(): Promise<AnalystStats>;
    /**
     * Health check for the Analyst service
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        details: {
            database: boolean;
            queryGenerator: boolean;
            scoringEngine: boolean;
            sentinelConnection: boolean;
            archivistConnection: boolean;
        };
    }>;
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
    private executeAnalysis;
    private getArtistProfile;
    private generateRequestId;
}
