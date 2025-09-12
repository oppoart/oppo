import { PrismaClient } from '@prisma/client';
import { AnalystService, AnalysisRequest, AnalysisResult } from '../core/AnalystService';

export interface AnalystApiConfig {
  prisma: PrismaClient;
  enableCaching?: boolean;
  aiProvider?: 'openai' | 'anthropic' | 'google';
}

export class AnalystApi {
  private analystService: AnalystService;
  private isInitialized: boolean = false;

  constructor(config: AnalystApiConfig) {
    this.analystService = new AnalystService(config.prisma, {
      aiProvider: config.aiProvider || 'openai',
      enablePersonalization: true
    });
  }

  /**
   * Initialize the API
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.analystService.initialize();
    this.isInitialized = true;
    console.log('AnalystApi initialized successfully');
  }

  /**
   * POST /analyst/analyze - Run complete analysis for an artist profile
   */
  async runAnalysis(request: AnalysisRequest): Promise<{
    success: boolean;
    data?: AnalysisResult;
    error?: string;
  }> {
    try {
      if (!this.isInitialized) {
        throw new Error('AnalystApi is not initialized');
      }

      const result = await this.analystService.runAnalysis(request);
      
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('Analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * POST /analyst/generate-queries - Generate queries only
   */
  async generateQueries(profileId: string, sources?: string[]): Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }> {
    try {
      if (!this.isInitialized) {
        throw new Error('AnalystApi is not initialized');
      }

      const queries = await this.analystService.generateQueries(
        profileId, 
        sources as any
      );
      
      return {
        success: true,
        data: queries
      };

    } catch (error) {
      console.error('Query generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * POST /analyst/score-opportunities - Score opportunities only
   */
  async scoreOpportunities(
    profileId: string, 
    opportunityIds: string[]
  ): Promise<{
    success: boolean;
    data?: Record<string, number>;
    error?: string;
  }> {
    try {
      if (!this.isInitialized) {
        throw new Error('AnalystApi is not initialized');
      }

      const scores = await this.analystService.scoreOpportunities(
        profileId, 
        opportunityIds
      );
      
      // Convert Map to object for JSON serialization
      const scoresObject = Object.fromEntries(scores);
      
      return {
        success: true,
        data: scoresObject
      };

    } catch (error) {
      console.error('Scoring failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * GET /analyst/stats - Get analysis statistics
   */
  async getStats(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      if (!this.isInitialized) {
        throw new Error('AnalystApi is not initialized');
      }

      const stats = await this.analystService.getStats();
      
      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * GET /analyst/health - Health check
   */
  async healthCheck(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const health = await this.analystService.healthCheck();
      
      return {
        success: health.status !== 'unhealthy',
        data: health
      };

    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Shutdown the API
   */
  async shutdown(): Promise<void> {
    await this.analystService.shutdown();
    this.isInitialized = false;
  }
}