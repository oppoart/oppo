import { QueryGenerationRequest, QueryGenerationContext, GeneratedQuery, QueryType } from '../../../types/query-generation';

export interface QueryStrategy {
  generate(
    request: QueryGenerationRequest,
    context: QueryGenerationContext,
    queryTypes: QueryType[]
  ): Promise<GeneratedQuery[]>;
}