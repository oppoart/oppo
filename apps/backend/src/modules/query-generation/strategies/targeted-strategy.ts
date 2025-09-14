import { Injectable } from '@nestjs/common';
import { QueryStrategy } from './query-strategy.interface';
import { SemanticQueryStrategy } from './semantic-strategy';
import { 
  QueryGenerationRequest, 
  QueryGenerationContext, 
  GeneratedQuery,
  QueryType
} from '../../../types/query-generation';
import { 
  QUERY_STRATEGIES,
  QUERY_PRIORITIES,
  CAREER_STAGE_MODIFIERS
} from '../../../constants/query.constants';

@Injectable()
export class TargetedQueryStrategy implements QueryStrategy {
  
  constructor(private readonly semanticStrategy: SemanticQueryStrategy) {}

  async generate(
    request: QueryGenerationRequest,
    context: QueryGenerationContext,
    queryTypes: QueryType[]
  ): Promise<GeneratedQuery[]> {
    const queries = await this.semanticStrategy.generate(request, context, queryTypes);
    
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
}