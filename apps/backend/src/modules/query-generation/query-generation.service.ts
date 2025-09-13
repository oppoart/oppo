import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../../shared/services/ai.service';
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
  QUERY_TEMPLATES,
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

  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiService: AiService,
    private readonly configService: ConfigService
  ) {}

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
      const stats = this.calculateStats(queries);
      
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

      // Store queries for analytics
      await this.storeQueryHistory(queries, validatedRequest.profileId as string);

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

    return {
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
        queries = await this.generateBasicQueries(request, context, queryTypes);
        break;
      case QUERY_STRATEGIES.SEMANTIC:
        queries = await this.generateSemanticQueries(request, context, queryTypes);
        break;
      case QUERY_STRATEGIES.TARGETED:
        queries = await this.generateTargetedQueries(request, context, queryTypes);
        break;
      case QUERY_STRATEGIES.EXPLORATORY:
        queries = await this.generateExploratoryQueries(request, context, queryTypes);
        break;
      default:
        queries = await this.generateSemanticQueries(request, context, queryTypes);
    }

    // Apply filters and limits
    queries = this.applyFilters(queries, request);
    queries = queries.slice(0, maxQueries);

    return queries;
  }

  private async generateBasicQueries(
    request: QueryGenerationRequest,
    context: QueryGenerationContext,
    queryTypes: QueryType[]
  ): Promise<GeneratedQuery[]> {
    const queries: GeneratedQuery[] = [];
    const queriesPerType = Math.max(1, Math.floor(QUERY_GENERATION_DEFAULTS.MAX_QUERIES_PER_TYPE / queryTypes.length));

    for (const queryType of queryTypes) {
      const templates = QUERY_TEMPLATES[queryType] || [];
      
      for (let i = 0; i < Math.min(queriesPerType, templates.length); i++) {
        const template = templates[i];
        const query = this.populateTemplate(template, context, request);
        
        if (query && !queries.some(q => q.query === query)) {
          queries.push({
            query,
            type: queryType,
            strategy: QUERY_STRATEGIES.BASIC,
            priority: QUERY_PRIORITIES.MEDIUM,
            keywords: this.extractKeywords(query, context),
            expectedResults: 20,
            confidence: 0.7,
            context: {
              profileId: context.profile.id,
              mediums: context.profile.mediums,
              interests: context.profile.interests,
              location: context.profile.location,
              careerStage: context.profile.careerStage,
            }
          });
        }
      }
    }

    return queries;
  }

  private async generateSemanticQueries(
    request: QueryGenerationRequest,
    context: QueryGenerationContext,
    queryTypes: QueryType[]
  ): Promise<GeneratedQuery[]> {
    if (!this.aiService.isConfigured()) {
      this.logger.warn('AI service not configured, falling back to basic query generation');
      return this.generateBasicQueries(request, context, queryTypes);
    }

    const queries: GeneratedQuery[] = [];
    const queriesPerType = Math.max(1, Math.floor(QUERY_GENERATION_DEFAULTS.MAX_QUERIES_PER_TYPE / queryTypes.length));

    for (const queryType of queryTypes) {
      try {
        const aiQueries = await this.generateAiQueries(queryType, context, queriesPerType);
        queries.push(...aiQueries);
      } catch (error) {
        this.logger.error(`AI query generation failed for type ${queryType}`, error);
        // Fallback to template-based queries
        const fallbackQueries = await this.generateBasicQueries(
          { ...request, queryTypes: [queryType] }, 
          context, 
          [queryType]
        );
        queries.push(...fallbackQueries);
      }
    }

    return queries;
  }

  private async generateTargetedQueries(
    request: QueryGenerationRequest,
    context: QueryGenerationContext,
    queryTypes: QueryType[]
  ): Promise<GeneratedQuery[]> {
    const queries = await this.generateSemanticQueries(request, context, queryTypes);
    
    // Apply location and career stage targeting
    return queries.map(query => {
      let targetedQuery = query.query;
      
      if (request.location || context.profile.location) {
        const location = (request.location || context.profile.location) as string;
        if (!targetedQuery.includes(location)) {
          targetedQuery += ` ${location}`;
        }
      }
      
      if (request.careerStage) {
        const careerStageText = CAREER_STAGE_MODIFIERS[request.careerStage as keyof typeof CAREER_STAGE_MODIFIERS];
        if (careerStageText && !targetedQuery.includes(careerStageText)) {
          targetedQuery = `${careerStageText} ${targetedQuery}`;
        }
      }
      
      return {
        ...query,
        query: targetedQuery,
        strategy: QUERY_STRATEGIES.TARGETED,
        priority: QUERY_PRIORITIES.HIGH,
        confidence: Math.min((query.confidence as number || 0) + 0.2, 1),
      };
    });
  }

  private async generateExploratoryQueries(
    request: QueryGenerationRequest,
    context: QueryGenerationContext,
    queryTypes: QueryType[]
  ): Promise<GeneratedQuery[]> {
    const queries: GeneratedQuery[] = [];
    
    // Generate broader, more diverse queries
    const exploratoryTerms = [
      'opportunities',
      'open calls',
      'artist programs',
      'creative funding',
      'art initiatives',
      'cultural programs'
    ];

    for (const queryType of queryTypes) {
      for (const term of exploratoryTerms) {
        const mediums = context.profile.mediums.slice(0, 2); // Limit to top 2 mediums
        
        for (const medium of mediums) {
          const query = `${term} ${medium} artists`;
          
          if (!queries.some(q => q.query === query)) {
            queries.push({
              query,
              type: queryType,
              strategy: QUERY_STRATEGIES.EXPLORATORY,
              priority: QUERY_PRIORITIES.LOW,
              keywords: [term, medium, 'artists'],
              expectedResults: 50,
              confidence: 0.5,
              context: {
                profileId: context.profile.id,
                mediums: [medium],
                interests: context.profile.interests,
                location: context.profile.location,
                careerStage: context.profile.careerStage,
              }
            });
          }
        }
      }
    }

    return queries.slice(0, QUERY_GENERATION_DEFAULTS.MAX_QUERIES_PER_TYPE * queryTypes.length);
  }

  private async generateAiQueries(
    queryType: QueryType, 
    context: QueryGenerationContext, 
    count: number
  ): Promise<GeneratedQuery[]> {
    const prompt = this.buildAiPrompt(queryType, context, count);
    const response = await this.aiService.enhancePrompt(prompt);
    
    // Parse AI response and convert to GeneratedQuery objects
    const queryStrings = this.parseAiResponse(response);
    
    return queryStrings.map(queryString => ({
      query: queryString,
      type: queryType,
      strategy: QUERY_STRATEGIES.SEMANTIC,
      priority: QUERY_PRIORITIES.MEDIUM,
      keywords: this.extractKeywords(queryString, context),
      expectedResults: 25,
      confidence: 0.8,
      context: {
        profileId: context.profile.id,
        mediums: context.profile.mediums,
        interests: context.profile.interests,
        location: context.profile.location,
        careerStage: context.profile.careerStage,
      }
    }));
  }

  private buildAiPrompt(queryType: QueryType, context: QueryGenerationContext, count: number): string {
    return `Generate ${count} diverse search queries to find ${queryType} opportunities for an artist with the following profile:

Name: ${context.profile.name}
Mediums: ${context.profile.mediums.join(', ')}
Location: ${context.profile.location || 'Not specified'}
Career Stage: ${context.profile.careerStage || 'Not specified'}
Interests: ${context.profile.interests.join(', ')}

The queries should be optimized for web search and help discover relevant ${queryType} opportunities. Return only the search queries, one per line, without numbering or additional text.`;
  }

  private parseAiResponse(response: string): string[] {
    return response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.match(/^\d+\./)) // Remove numbered items
      .slice(0, 10); // Limit to 10 queries max
  }

  private populateTemplate(
    template: string, 
    context: QueryGenerationContext, 
    request: QueryGenerationRequest
  ): string {
    let populatedQuery = template;
    
    // Replace placeholders
    const mediums = context.profile.mediums;
    if (mediums.length > 0) {
      populatedQuery = populatedQuery.replace(/{medium}/g, mediums[0]);
    }
    
    const location = request.location || context.profile.location;
    if (location) {
      populatedQuery = populatedQuery.replace(/{location}/g, location as string);
    }
    
    populatedQuery = populatedQuery.replace(/{year}/g, new Date().getFullYear().toString());
    
    // Add custom keywords if provided
    if (request.customKeywords && Array.isArray(request.customKeywords) && request.customKeywords.length > 0) {
      populatedQuery += ` ${request.customKeywords.join(' ')}`;
    }
    
    return populatedQuery;
  }

  private extractKeywords(query: string, context: QueryGenerationContext): string[] {
    const keywords = new Set<string>();
    
    // Add profile-based keywords
    context.profile.mediums.forEach(medium => keywords.add(medium.toLowerCase()));
    context.profile.interests.forEach(interest => keywords.add(interest.toLowerCase()));
    
    // Extract keywords from query
    const queryWords = query.toLowerCase().split(/\s+/);
    queryWords.forEach(word => {
      if (word.length > 3 && !['artist', 'artists', 'opportunities'].includes(word)) {
        keywords.add(word);
      }
    });
    
    return Array.from(keywords);
  }

  private applyFilters(queries: GeneratedQuery[], request: QueryGenerationRequest): GeneratedQuery[] {
    let filteredQueries = [...queries];
    
    // Exclude queries with excluded keywords
    if (request.excludeKeywords && Array.isArray(request.excludeKeywords) && request.excludeKeywords.length > 0) {
      const excludePattern = new RegExp(request.excludeKeywords.join('|'), 'i');
      filteredQueries = filteredQueries.filter(query => !excludePattern.test(query.query as string));
    }
    
    // Remove duplicates
    const seen = new Set<string>();
    filteredQueries = filteredQueries.filter(query => {
      const normalizedQuery = (query.query as string).toLowerCase().trim();
      if (seen.has(normalizedQuery)) {
        return false;
      }
      seen.add(normalizedQuery);
      return true;
    });
    
    return filteredQueries;
  }

  private calculateStats(queries: GeneratedQuery[]): QueryGenerationStats {
    const typeBreakdown: Record<QueryType, number> = {} as Record<QueryType, number>;
    const strategyBreakdown: Record<QueryStrategy, number> = {} as Record<QueryStrategy, number>;
    
    let totalConfidence = 0;
    
    queries.forEach(query => {
      typeBreakdown[query.type as QueryType] = (typeBreakdown[query.type as QueryType] || 0) + 1;
      strategyBreakdown[query.strategy as QueryStrategy] = (strategyBreakdown[query.strategy as QueryStrategy] || 0) + 1;
      totalConfidence += (query.confidence as number) || 0;
    });
    
    return {
      totalGenerated: queries.length,
      typeBreakdown,
      strategyBreakdown,
      averageConfidence: queries.length > 0 ? totalConfidence / queries.length : 0,
      processingTime: 0, // Set by caller
    };
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

  async getQueryTemplates(): Promise<QueryTemplate[]> {
    const templates: QueryTemplate[] = [];
    
    Object.entries(QUERY_TEMPLATES).forEach(([type, templateStrings]) => {
      (templateStrings as readonly string[]).forEach((template, index) => {
        templates.push({
          id: `${type}_${index}`,
          type: type as QueryType,
          template,
          variables: this.extractTemplateVariables(template),
          priority: QUERY_PRIORITIES.MEDIUM,
          description: `Template for ${type} queries`,
          active: true,
        });
      });
    });
    
    return templates;
  }

  private extractTemplateVariables(template: string): string[] {
    const variablePattern = /{(\w+)}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variablePattern.exec(template)) !== null) {
      variables.push(match[1]);
    }
    
    return [...new Set(variables)]; // Remove duplicates
  }
}