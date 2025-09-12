import { PrismaClient, ArtistProfile } from '@prisma/client';
import { ProfileAnalyzer } from './ProfileAnalyzer';
import { ContextBuilder } from './ContextBuilder';
import { QueryOptimizer } from './QueryOptimizer';
import { BasicQueryTemplate } from './templates/basic-query.template';
import { SemanticQueryTemplate } from './templates/semantic-query.template';
import { 
  SourceType,
  AIServiceError,
  SearchQueryContext,
  GeneratedSearchQuery
} from '../../../../apps/backend/src/types/discovery';

export interface QueryGeneratorConfig {
  aiProvider: 'openai' | 'anthropic' | 'google';
  timeout: number;
  maxQueriesPerSource: number;
  useSemanticEnhancement: boolean;
  cacheResults: boolean;
}

export interface QueryGenerationRequest {
  profile: ArtistProfile;
  sources?: SourceType[];
  maxQueries?: number;
  priority?: 'low' | 'medium' | 'high';
  context?: SearchQueryContext;
}

export interface QueryGenerationResult {
  queries: GeneratedSearchQuery[];
  sourceDistribution: Record<SourceType, number>;
  processingTimeMs: number;
  aiServiceUsed: string;
  cacheHit: boolean;
}

export class QueryGeneratorService {
  private profileAnalyzer: ProfileAnalyzer;
  private contextBuilder: ContextBuilder;
  private queryOptimizer: QueryOptimizer;
  private basicTemplate: BasicQueryTemplate;
  private semanticTemplate: SemanticQueryTemplate;
  private config: QueryGeneratorConfig;
  private queryCache: Map<string, QueryGenerationResult> = new Map();

  constructor(
    private prisma: PrismaClient,
    config: Partial<QueryGeneratorConfig> = {}
  ) {
    this.config = {
      aiProvider: 'openai',
      timeout: 30000,
      maxQueriesPerSource: 5,
      useSemanticEnhancement: true,
      cacheResults: true,
      ...config
    };

    // Initialize components
    this.profileAnalyzer = new ProfileAnalyzer();
    this.contextBuilder = new ContextBuilder(this.config.aiProvider);
    this.queryOptimizer = new QueryOptimizer();
    this.basicTemplate = new BasicQueryTemplate();
    this.semanticTemplate = new SemanticQueryTemplate(this.config.aiProvider);
  }

  /**
   * Initialize the query generation service
   */
  async initialize(): Promise<void> {
    console.log('Initializing Query Generation Service...');
    
    try {
      await this.contextBuilder.initialize();
      await this.semanticTemplate.initialize();
      console.log('Query Generation Service initialized successfully');
    } catch (error) {
      throw new AIServiceError(
        `Failed to initialize QueryGeneratorService: ${error}`,
        'query-generator',
        'initialization'
      );
    }
  }

  /**
   * Generate search queries from an artist profile
   * This is the core method that converts artist profiles into targeted search queries
   */
  async generateQueries(
    profile: ArtistProfile,
    sources?: SourceType[],
    maxQueries?: number
  ): Promise<string[]> {
    const result = await this.generateQueriesWithMetadata({
      profile,
      sources,
      maxQueries,
      priority: 'medium'
    });

    return result.queries.map(q => q.query);
  }

  /**
   * Generate queries with full metadata and analysis
   */
  async generateQueriesWithMetadata(
    request: QueryGenerationRequest
  ): Promise<QueryGenerationResult> {
    const startTime = Date.now();
    const { profile, sources, maxQueries, priority = 'medium' } = request;

    // Check cache first
    if (this.config.cacheResults) {
      const cacheKey = this.generateCacheKey(profile, sources, maxQueries);
      const cached = this.queryCache.get(cacheKey);
      if (cached) {
        return { ...cached, cacheHit: true };
      }
    }

    try {
      // Step 1: Analyze the artist profile to extract searchable elements
      const profileAnalysis = await this.profileAnalyzer.analyzeProfile(profile);
      
      // Step 2: Build AI context for query generation
      const aiContext = await this.contextBuilder.buildContext(profile, profileAnalysis);
      
      // Step 3: Determine target sources
      const targetSources = sources || this.getDefaultSources(priority);
      
      // Step 4: Generate queries for each source
      const allQueries: GeneratedSearchQuery[] = [];
      const sourceDistribution: Record<SourceType, number> = {} as Record<SourceType, number>;

      for (const sourceType of targetSources) {
        const sourceQueries = await this.generateQueriesForSource(
          sourceType,
          profile,
          aiContext,
          profileAnalysis,
          Math.min(maxQueries || this.config.maxQueriesPerSource, this.config.maxQueriesPerSource)
        );

        allQueries.push(...sourceQueries);
        sourceDistribution[sourceType] = sourceQueries.length;
      }

      // Step 5: Optimize and rank queries
      const optimizedQueries = await this.queryOptimizer.optimizeQueries(
        allQueries,
        profileAnalysis,
        maxQueries
      );

      const result: QueryGenerationResult = {
        queries: optimizedQueries,
        sourceDistribution,
        processingTimeMs: Date.now() - startTime,
        aiServiceUsed: this.config.aiProvider,
        cacheHit: false
      };

      // Cache the result
      if (this.config.cacheResults) {
        const cacheKey = this.generateCacheKey(profile, sources, maxQueries);
        this.queryCache.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      throw new AIServiceError(
        `Query generation failed: ${error}`,
        this.config.aiProvider,
        'query-generation',
        { profileId: profile.id }
      );
    }
  }

  /**
   * Generate queries specifically optimized for a source type
   */
  private async generateQueriesForSource(
    sourceType: SourceType,
    profile: ArtistProfile,
    aiContext: any,
    profileAnalysis: any,
    maxQueries: number
  ): Promise<GeneratedSearchQuery[]> {
    const queries: GeneratedSearchQuery[] = [];

    // Generate basic keyword-based queries
    const basicQueries = await this.basicTemplate.generateQueries(
      profileAnalysis,
      sourceType,
      Math.ceil(maxQueries * 0.4) // 40% basic queries
    );

    queries.push(...basicQueries);

    // Generate AI-enhanced semantic queries if enabled
    if (this.config.useSemanticEnhancement) {
      const semanticQueries = await this.semanticTemplate.generateQueries(
        aiContext,
        sourceType,
        Math.ceil(maxQueries * 0.6) // 60% semantic queries
      );

      queries.push(...semanticQueries);
    }

    return queries.slice(0, maxQueries);
  }

  /**
   * Get default sources based on priority
   */
  private getDefaultSources(priority: string): SourceType[] {
    switch (priority) {
      case 'high':
        return ['websearch', 'social', 'bookmark', 'newsletter'];
      case 'medium':
        return ['websearch', 'social', 'bookmark'];
      case 'low':
      default:
        return ['websearch', 'bookmark'];
    }
  }

  /**
   * Generate cache key for query caching
   */
  private generateCacheKey(
    profile: ArtistProfile,
    sources?: SourceType[],
    maxQueries?: number
  ): string {
    const sourcesStr = sources ? sources.sort().join(',') : 'default';
    const maxQueriesStr = maxQueries?.toString() || 'default';
    
    // Create a simple hash of profile characteristics
    const profileHash = this.hashProfileCharacteristics(profile);
    
    return `queries:${profileHash}:${sourcesStr}:${maxQueriesStr}`;
  }

  /**
   * Create a hash of key profile characteristics for caching
   */
  private hashProfileCharacteristics(profile: ArtistProfile): string {
    const characteristics = [
      profile.mediums.sort().join(','),
      profile.skills.sort().join(','),
      profile.interests.sort().join(','),
      profile.experience || '',
      profile.location || ''
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < characteristics.length; i++) {
      const char = characteristics.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.queryCache.size,
      hitRate: 0 // Would need to track hits/misses for real hit rate
    };
  }

  /**
   * Health check for query generation service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test basic functionality with a simple profile
      const testProfile: Partial<ArtistProfile> = {
        id: 'test',
        name: 'Test Artist',
        mediums: ['painting'],
        skills: ['oil painting'],
        interests: ['contemporary art'],
        experience: 'intermediate',
        location: 'New York',
        userId: 'test'
      } as ArtistProfile;

      const analysis = await this.profileAnalyzer.analyzeProfile(testProfile as ArtistProfile);
      return analysis !== null;
    } catch (error) {
      console.error('QueryGeneratorService health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.clearCache();
    await this.semanticTemplate.shutdown();
    await this.contextBuilder.shutdown();
  }
}