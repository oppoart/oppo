import { PrismaClient, ArtistProfile, Opportunity } from '@prisma/client';
import { EventEmitter } from 'events';
import { QueryGeneratorService } from '../query-generation/QueryGeneratorService';
import { RelevanceScoringEngine } from '../relevance-scoring/RelevanceScoringEngine';
import { SentinelConnector } from '../integration/SentinelConnector';
import { ArchivistConnector } from '../integration/ArchivistConnector';
import { 
  OpportunityData,
  SourceType,
  AIServiceError
} from '../../../../apps/backend/src/types/discovery';

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

export class AnalystService extends EventEmitter {
  private queryGenerator: QueryGeneratorService;
  private scoringEngine: RelevanceScoringEngine;
  private sentinelConnector: SentinelConnector;
  private archivistConnector: ArchivistConnector;
  private config: AnalystConfig;
  private isInitialized: boolean = false;
  private activeAnalyses: Map<string, Promise<AnalysisResult>> = new Map();

  constructor(
    private prisma: PrismaClient,
    config: Partial<AnalystConfig> = {}
  ) {
    super();
    
    this.config = {
      maxConcurrentAnalyses: 3,
      queryGenerationTimeout: 30000,
      scoringTimeout: 60000,
      aiProvider: 'openai',
      cacheDuration: 3600000, // 1 hour
      enablePersonalization: true,
      ...config
    };

    // Initialize components
    this.queryGenerator = new QueryGeneratorService(prisma, {
      aiProvider: this.config.aiProvider,
      timeout: this.config.queryGenerationTimeout
    });

    this.scoringEngine = new RelevanceScoringEngine(prisma, {
      aiProvider: this.config.aiProvider,
      timeout: this.config.scoringTimeout
    });

    this.sentinelConnector = new SentinelConnector();
    this.archivistConnector = new ArchivistConnector(prisma);
  }

  /**
   * Initialize the Analyst service and all components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing Analyst AI-Powered Analysis Engine...');

    try {
      // Initialize all components
      await this.queryGenerator.initialize();
      await this.scoringEngine.initialize();
      await this.sentinelConnector.initialize();
      await this.archivistConnector.initialize();

      this.isInitialized = true;
      console.log('Analyst service initialized successfully');
    } catch (error) {
      const initError = new AIServiceError(
        `Failed to initialize Analyst service: ${error}`,
        'analyst',
        'initialization'
      );
      this.emit('error', initError);
      throw initError;
    }
  }

  /**
   * Run complete AI analysis for an artist profile
   * This is the core method that orchestrates the entire pipeline:
   * Profile → Query Generation → Discovery → Relevance Scoring → Storage
   */
  async runAnalysis(request: AnalysisRequest): Promise<AnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('Analyst service is not initialized');
    }

    // Check concurrent analysis limit
    if (this.activeAnalyses.size >= this.config.maxConcurrentAnalyses) {
      throw new Error('Maximum concurrent analyses limit reached');
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    const analysisPromise = this.executeAnalysis(requestId, request, startTime);
    this.activeAnalyses.set(requestId, analysisPromise);

    try {
      const result = await analysisPromise;
      this.emit('analysis.completed', result);
      return result;
    } catch (error) {
      this.emit('analysis.failed', error as Error, request);
      throw error;
    } finally {
      this.activeAnalyses.delete(requestId);
    }
  }

  /**
   * Generate queries for an artist profile without running full discovery
   */
  async generateQueries(profileId: string, sources?: SourceType[]): Promise<string[]> {
    const profile = await this.getArtistProfile(profileId);
    return await this.queryGenerator.generateQueries(profile, sources);
  }

  /**
   * Score opportunities for relevance to an artist profile
   */
  async scoreOpportunities(
    profileId: string, 
    opportunityIds: string[]
  ): Promise<Map<string, number>> {
    const profile = await this.getArtistProfile(profileId);
    const opportunities = await this.archivistConnector.getOpportunities(opportunityIds);
    
    return await this.scoringEngine.scoreOpportunities(profile, opportunities);
  }

  /**
   * Get analysis statistics
   */
  async getStats(): Promise<AnalystStats> {
    // This would need actual database queries to get real stats
    // For now, return placeholder stats
    return {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      averageProcessingTime: 0,
      totalQueriesGenerated: 0,
      totalOpportunitiesScored: 0,
      aiServiceUsage: {},
      lastAnalysis: undefined
    };
  }

  /**
   * Health check for the Analyst service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      database: boolean;
      queryGenerator: boolean;
      scoringEngine: boolean;
      sentinelConnection: boolean;
      archivistConnection: boolean;
    };
  }> {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      const databaseOk = true;

      // Test components
      const queryGeneratorOk = await this.queryGenerator.healthCheck();
      const scoringEngineOk = await this.scoringEngine.healthCheck();
      const sentinelConnectionOk = await this.sentinelConnector.healthCheck();
      const archivistConnectionOk = await this.archivistConnector.healthCheck();

      const allHealthy = databaseOk && queryGeneratorOk && scoringEngineOk && 
                        sentinelConnectionOk && archivistConnectionOk;

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        details: {
          database: databaseOk,
          queryGenerator: queryGeneratorOk,
          scoringEngine: scoringEngineOk,
          sentinelConnection: sentinelConnectionOk,
          archivistConnection: archivistConnectionOk
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          database: false,
          queryGenerator: false,
          scoringEngine: false,
          sentinelConnection: false,
          archivistConnection: false
        }
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Analyst service...');

    // Wait for active analyses to complete or timeout
    const activePromises = Array.from(this.activeAnalyses.values());
    if (activePromises.length > 0) {
      console.log(`Waiting for ${activePromises.length} active analyses to complete...`);
      await Promise.allSettled(activePromises);
    }

    // Shutdown components
    await this.queryGenerator.shutdown();
    await this.scoringEngine.shutdown();
    await this.sentinelConnector.shutdown();
    await this.archivistConnector.shutdown();

    // Clean up
    this.removeAllListeners();
    await this.prisma.$disconnect();

    this.isInitialized = false;
    console.log('Analyst service shutdown complete');
  }

  // =====================================
  // Private Methods
  // =====================================

  private async executeAnalysis(
    requestId: string,
    request: AnalysisRequest,
    startTime: number
  ): Promise<AnalysisResult> {
    this.emit('analysis.started', request);

    const errors: string[] = [];
    let queriesGenerated = 0;
    let opportunitiesDiscovered = 0;
    let opportunitiesScored = 0;
    let newOpportunities = 0;

    try {
      // Step 1: Get artist profile
      const profile = await this.getArtistProfile(request.artistProfileId);

      // Step 2: Generate search queries
      const queries = await this.queryGenerator.generateQueries(
        profile, 
        request.sources, 
        request.maxQueries
      );
      queriesGenerated = queries.length;
      
      queries.forEach(query => {
        this.emit('query.generated', query, { profileId: profile.id });
      });

      // Step 3: Execute discovery using Sentinel
      const discoveryResults = await this.sentinelConnector.runDiscovery({
        queries,
        priority: request.priority || 'medium'
      });
      opportunitiesDiscovered = discoveryResults.length;
      
      this.emit('opportunities.discovered', discoveryResults);

      // Step 4: Score discovered opportunities
      const scoredOpportunities = await this.scoringEngine.scoreOpportunities(
        profile, 
        discoveryResults
      );
      opportunitiesScored = scoredOpportunities.size;

      // Step 5: Store high-scoring opportunities via Archivist
      const storedResults = await this.archivistConnector.storeOpportunities(
        Array.from(scoredOpportunities.entries()).map(([oppId, score]) => ({
          ...discoveryResults.find(opp => opp.id === oppId)!,
          relevanceScore: score
        }))
      );
      newOpportunities = storedResults.created;

      this.emit('opportunities.scored', Array.from(scoredOpportunities.keys()));

      return {
        requestId,
        profileId: request.artistProfileId,
        queriesGenerated,
        opportunitiesDiscovered,
        opportunitiesScored,
        newOpportunities,
        processingTimeMs: Date.now() - startTime,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      
      throw new AIServiceError(
        `Analysis failed: ${errorMessage}`,
        'analyst',
        'analysis',
        { requestId, profileId: request.artistProfileId }
      );
    }
  }

  private async getArtistProfile(profileId: string): Promise<ArtistProfile> {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: profileId },
      include: {
        user: true
      }
    });

    if (!profile) {
      throw new Error(`Artist profile not found: ${profileId}`);
    }

    return profile;
  }

  private generateRequestId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}