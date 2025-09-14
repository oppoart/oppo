import { Injectable, Logger } from '@nestjs/common';
import { QueryStrategy } from './query-strategy.interface';
import { BasicQueryStrategy } from './basic-strategy';
import { QueryAiService } from '../ai/query-ai.service';
import { AiService } from '../../../shared/services/ai.service';
import { 
  QueryGenerationRequest, 
  QueryGenerationContext, 
  GeneratedQuery,
  QueryType
} from '../../../types/query-generation';
import { QUERY_GENERATION_DEFAULTS } from '../../../constants/query.constants';

@Injectable()
export class SemanticQueryStrategy implements QueryStrategy {
  private readonly logger = new Logger(SemanticQueryStrategy.name);

  constructor(
    private readonly aiService: AiService,
    private readonly queryAiService: QueryAiService,
    private readonly basicStrategy: BasicQueryStrategy
  ) {}

  async generate(
    request: QueryGenerationRequest,
    context: QueryGenerationContext,
    queryTypes: QueryType[]
  ): Promise<GeneratedQuery[]> {
    if (!this.aiService.isConfigured()) {
      this.logger.warn('AI service not configured, falling back to basic query generation');
      return this.basicStrategy.generate(request, context, queryTypes);
    }

    const queriesPerType = Math.max(1, Math.floor(QUERY_GENERATION_DEFAULTS.MAX_QUERIES_PER_TYPE / queryTypes.length));

    // Parallelize AI calls for all query types
    const aiQueryPromises = queryTypes.map(async (queryType) => {
      try {
        this.logger.debug(`Starting AI query generation for type: ${queryType}`);
        const aiQueries = await this.queryAiService.generateAiQueries(queryType, context, queriesPerType);
        this.logger.debug(`Completed AI query generation for type: ${queryType}, generated ${aiQueries.length} queries`);
        return aiQueries;
      } catch (error) {
        this.logger.error(`AI query generation failed for type ${queryType}`, error);
        // Fallback to template-based queries
        const fallbackQueries = await this.basicStrategy.generate(
          { ...request, queryTypes: [queryType] }, 
          context, 
          [queryType]
        );
        this.logger.debug(`Using fallback queries for type: ${queryType}, generated ${fallbackQueries.length} queries`);
        return fallbackQueries;
      }
    });

    // Wait for all AI calls to complete in parallel
    const allQueryResults = await Promise.all(aiQueryPromises);
    const queries = allQueryResults.flat();

    this.logger.log(`Semantic query generation completed: ${queries.length} total queries from ${queryTypes.length} types`);
    return queries;
  }
}