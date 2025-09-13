import { PrismaClient, Opportunity } from '@prisma/client';
import { EventEmitter } from 'events';
import { LiaisonConfig, FeedbackAction, ExportFormat, LiaisonStats } from '../types';
export interface FeedbackCapture {
    opportunityId: string;
    action: FeedbackAction;
    reason?: string;
    userId?: string;
}
export declare class LiaisonService extends EventEmitter {
    private prisma;
    private exportService;
    private webSocketService;
    private config;
    private isInitialized;
    constructor(prisma: PrismaClient, config?: Partial<LiaisonConfig>, wsUrl?: string);
    initialize(): Promise<void>;
    getOpportunities(filters?: {
        status?: string[];
        type?: string[];
        organization?: string;
        relevanceMinScore?: number;
        page?: number;
        limit?: number;
    }): Promise<{
        opportunities: Opportunity[];
        total: number;
        page: number;
        limit: number;
    }>;
    updateOpportunityStatus(opportunityId: string, status: string, userId?: string): Promise<Opportunity>;
    captureFeedback(feedback: FeedbackCapture): Promise<void>;
    exportOpportunities(format: ExportFormat, filters?: {
        status?: string[];
        type?: string[];
        organization?: string[];
        relevanceMinScore?: number;
        deadlineAfter?: Date;
        deadlineBefore?: Date;
    }, options?: {
        filename?: string;
        includeMetadata?: boolean;
    }): Promise<Blob | void>;
    generateExportTemplate(format: ExportFormat): Promise<Blob>;
    broadcastUpdate(type: 'added' | 'updated', opportunity: Opportunity): void;
    getStats(): Promise<LiaisonStats>;
    getDashboardData(): Promise<{
        stats: {
            totalOpportunities: number;
            newThisWeek: number;
            upcomingDeadlines: number;
            highRelevance: number;
            inProgress: number;
            submitted: number;
        };
        recentOpportunities: Opportunity[];
        upcomingDeadlines: Opportunity[];
    }>;
    healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        details: {
            database: boolean;
            websocket: boolean;
            export: boolean;
        };
    }>;
    shutdown(): Promise<void>;
    private setupEventHandlers;
    private getOpportunityStatus;
    private calculateTimeToDecision;
}
