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
    initialize(): Promise<void>;
    runAnalysis(request: AnalysisRequest): Promise<AnalysisResult>;
    generateQueries(profileId: string, sources?: SourceType[]): Promise<string[]>;
    scoreOpportunities(profileId: string, opportunityIds: string[]): Promise<Map<string, number>>;
    getStats(): Promise<AnalystStats>;
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
    shutdown(): Promise<void>;
    private executeAnalysis;
    private getArtistProfile;
    private generateRequestId;
}
