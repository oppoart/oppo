import { Injectable } from '@nestjs/common';
import { QueryStrategy } from './query-strategy.interface';
import { 
  QueryGenerationRequest, 
  QueryGenerationContext, 
  GeneratedQuery,
  QueryType
} from '../../../types/query-generation';
import { 
  QUERY_STRATEGIES,
  QUERY_PRIORITIES,
  QUERY_GENERATION_DEFAULTS
} from '../../../constants/query.constants';

@Injectable()
export class ExploratoryQueryStrategy implements QueryStrategy {
  
  async generate(
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
}