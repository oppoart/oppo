import { Injectable } from '@nestjs/common';
import { QueryStrategy } from './query-strategy.interface';
import { QueryTemplateEngine } from '../templates/template-engine';
import { QueryProcessor } from '../processors/query-processor';
import { 
  QueryGenerationRequest, 
  QueryGenerationContext, 
  GeneratedQuery,
  QueryType
} from '../../../types/query-generation';
import { 
  QUERY_TEMPLATES,
  QUERY_STRATEGIES,
  QUERY_PRIORITIES,
  QUERY_GENERATION_DEFAULTS
} from '../../../constants/query.constants';

@Injectable()
export class BasicQueryStrategy implements QueryStrategy {
  
  constructor(
    private readonly templateEngine: QueryTemplateEngine,
    private readonly queryProcessor: QueryProcessor
  ) {}

  async generate(
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
        const query = this.templateEngine.populateTemplate(template, context, request);
        
        if (query && !queries.some(q => q.query === query)) {
          queries.push({
            query,
            type: queryType,
            strategy: QUERY_STRATEGIES.BASIC,
            priority: QUERY_PRIORITIES.MEDIUM,
            keywords: this.queryProcessor.extractKeywords(query, context),
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
}