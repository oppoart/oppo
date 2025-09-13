import { PrismaClient } from '@prisma/client';
import { AnalysisRequest, AnalysisResult } from '../core/AnalystService';
export interface AnalystApiConfig {
    prisma: PrismaClient;
    enableCaching?: boolean;
    aiProvider?: 'openai' | 'anthropic' | 'google';
}
export declare class AnalystApi {
    private analystService;
    private isInitialized;
    constructor(config: AnalystApiConfig);
    initialize(): Promise<void>;
    runAnalysis(request: AnalysisRequest): Promise<{
        success: boolean;
        data?: AnalysisResult;
        error?: string;
    }>;
    generateQueries(profileId: string, sources?: string[]): Promise<{
        success: boolean;
        data?: string[];
        error?: string;
    }>;
    scoreOpportunities(profileId: string, opportunityIds: string[]): Promise<{
        success: boolean;
        data?: Record<string, number>;
        error?: string;
    }>;
    getStats(): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    healthCheck(): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    shutdown(): Promise<void>;
}
