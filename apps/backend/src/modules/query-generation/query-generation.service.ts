import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../../shared/services/ai.service';
import { QueryTemplateEngine } from './templates/template-engine';
import { QueryProcessor } from './processors/query-processor';
import { BasicQueryStrategy } from './strategies/basic-strategy';
import { SemanticQueryStrategy } from './strategies/semantic-strategy';
import { TargetedQueryStrategy } from './strategies/targeted-strategy';
import { ExploratoryQueryStrategy } from './strategies/exploratory-strategy';
import { QueryAiService } from './ai/query-ai.service';
import {
  QueryGenerationRequest,
  QueryGenerationResponse,
  GeneratedQuery,
  QueryGenerationContext,
  QueryVariation,
  QueryGenerationStats,
  QueryTemplate,
  QueryGenerationError,
  validateQueryGenerationRequest,
  validateGeneratedQuery,
} from '../../types/query-generation';
import {
  QUERY_TYPES,
  QUERY_STRATEGIES,
  QUERY_PRIORITIES,
  QUERY_GENERATION_DEFAULTS,
  LOCATION_MODIFIERS,
  CAREER_STAGE_MODIFIERS,
  QueryType,
  QueryStrategy,
  QueryPriority,
} from '../../constants/query.constants';

@Injectable()
export class QueryGenerationService {
  private readonly logger = new Logger(QueryGenerationService.name);
  private readonly profileCache = new Map<string, { context: QueryGenerationContext; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
    private readonly templateEngine: QueryTemplateEngine,
    private readonly queryProcessor: QueryProcessor,
    private readonly basicStrategy: BasicQueryStrategy,
    private readonly semanticStrategy: SemanticQueryStrategy,
    private readonly targetedStrategy: TargetedQueryStrategy,
    private readonly exploratoryStrategy: ExploratoryQueryStrategy,
    private readonly queryAiService: QueryAiService
  ) {
    // Clean up expired cache entries every 10 minutes
    setInterval(() => this.cleanupCache(), 10 * 60 * 1000);
  }

  async generateQueries(request: QueryGenerationRequest): Promise<QueryGenerationResponse> {
    const startTime = Date.now();
    
    try {
      // Validate request
      const validatedRequest = validateQueryGenerationRequest(request);
      
      // Get profile context
      const context = await this.buildQueryContext(validatedRequest.profileId as string);
      
      // Generate queries based on strategy
      const queries = await this.executeQueryGeneration(validatedRequest, context);
      
      // Calculate stats
      const stats = this.queryProcessor.calculateStats(queries);
      
      const processingTimeMs = Date.now() - startTime;
      
      const response: QueryGenerationResponse = {
        success: true,
        message: `Generated ${queries.length} queries successfully`,
        data: {
          profileId: validatedRequest.profileId,
          totalQueries: queries.length,
          queriesByType: stats.typeBreakdown,
          queries,
          processingTimeMs,
          strategy: validatedRequest.strategy || QUERY_GENERATION_DEFAULTS.DEFAULT_STRATEGY,
          aiServiceUsed: this.aiService.isConfigured() ? 'openai' : undefined,
          recommendations: await this.generateRecommendations(context, queries)
        }
      };

      // Store queries for analytics (non-blocking)
      this.storeQueryHistory(queries, validatedRequest.profileId as string)
        .catch(error => this.logger.warn('Failed to store query history', error));

      return response;

    } catch (error) {
      this.logger.error('Query generation failed', error);
      throw new QueryGenerationError(
        `Query generation failed: ${error.message}`,
        'GENERATION_FAILED',
        { profileId: request.profileId, error: error.message }
      );
    }
  }

  private async buildQueryContext(profileId: string): Promise<QueryGenerationContext> {
    // Check cache first
    const cached = this.profileCache.get(profileId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Using cached profile context for ${profileId}`);
      return cached.context;
    }

    const profile = await this.prismaService.artistProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    });

    if (!profile) {
      throw new QueryGenerationError('Profile not found', 'PROFILE_NOT_FOUND', { profileId });
    }

    const context: QueryGenerationContext = {
      profile: {
        id: profile.id,
        name: profile.name || profile.user.name || 'Artist',
        mediums: profile.mediums || [],
        interests: profile.interests || [],
        location: profile.location,
        careerStage: undefined, // Not in schema yet
        bio: profile.bio,
        artistStatement: profile.artistStatement,
      }
    };

    // Cache the context
    this.profileCache.set(profileId, { context, timestamp: Date.now() });
    this.logger.debug(`Cached profile context for ${profileId}`);

    return context;
  }

  private async executeQueryGeneration(
    request: QueryGenerationRequest, 
    context: QueryGenerationContext
  ): Promise<GeneratedQuery[]> {
    const strategy = request.strategy || QUERY_GENERATION_DEFAULTS.DEFAULT_STRATEGY;
    const maxQueries = request.maxQueries || QUERY_GENERATION_DEFAULTS.MAX_TOTAL_QUERIES;
    const queryTypes = request.queryTypes || (Object.values(QUERY_TYPES) as QueryType[]);

    let queries: GeneratedQuery[] = [];

    switch (strategy) {
      case QUERY_STRATEGIES.BASIC:
        queries = await this.basicStrategy.generate(request, context, queryTypes);
        break;
      case QUERY_STRATEGIES.SEMANTIC:
        queries = await this.semanticStrategy.generate(request, context, queryTypes);
        break;
      case QUERY_STRATEGIES.TARGETED:
        queries = await this.targetedStrategy.generate(request, context, queryTypes);
        break;
      case QUERY_STRATEGIES.EXPLORATORY:
        queries = await this.exploratoryStrategy.generate(request, context, queryTypes);
        break;
      default:
        queries = await this.semanticStrategy.generate(request, context, queryTypes);
    }

    // Apply filters and limits
    queries = this.queryProcessor.applyFilters(queries, request);
    queries = queries.slice(0, maxQueries);

    return queries;
  }



  private async generateRecommendations(
    context: QueryGenerationContext, 
    queries: GeneratedQuery[]
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (context.profile.mediums.length === 0) {
      recommendations.push('Consider adding artistic mediums to your profile for more targeted results');
    }
    
    if (!context.profile.location) {
      recommendations.push('Adding your location will help find local opportunities');
    }
    
    if (queries.length < 10) {
      recommendations.push('Try using different query strategies for more diverse results');
    }
    
    const aiConfigured = this.aiService.isConfigured();
    if (!aiConfigured) {
      recommendations.push('Configure AI service for enhanced semantic query generation');
    }
    
    return recommendations;
  }

  private async storeQueryHistory(queries: GeneratedQuery[], profileId: string): Promise<void> {
    try {
      const historyRecords = queries.map(query => ({
        profileId,
        query: query.query,
        type: query.type,
        strategy: query.strategy,
        metadata: {
          keywords: query.keywords,
          confidence: query.confidence,
          expectedResults: query.expectedResults,
        }
      }));
      
      // Store in database for analytics (if QueryHistory table exists)
      // await this.prismaService.queryHistory.createMany({ data: historyRecords });
      
    } catch (error) {
      this.logger.warn('Failed to store query history', error);
      // Non-blocking error
    }
  }

  /**
   * Get all query templates from database
   * Templates are now stored in QueryTemplateGroup and QueryTemplate models
   */
  async getQueryTemplates(): Promise<QueryTemplate[]> {
    const groups = await this.prismaService.queryTemplateGroup.findMany({
      include: {
        templates: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    const templates: QueryTemplate[] = [];

    groups.forEach(group => {
      group.templates.forEach(template => {
        templates.push({
          id: template.id,
          type: 'custom' as QueryType, // Database templates don't have fixed types
          template: template.template,
          variables: this.templateEngine.extractTemplateVariables(template.template),
          priority: QUERY_PRIORITIES.MEDIUM,
          description: `${group.name}: ${template.template}`,
          active: true,
          groupId: group.id,
          groupName: group.name,
          placeholders: template.placeholders,
        });
      });
    });

    return templates;
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [profileId, cached] of this.profileCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.profileCache.delete(profileId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }
}