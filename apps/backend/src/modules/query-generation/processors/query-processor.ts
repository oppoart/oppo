import { Injectable } from '@nestjs/common';
import { QueryGenerationRequest, QueryGenerationContext, GeneratedQuery, QueryGenerationStats } from '../../../types/query-generation';
import { QueryType, QueryStrategy } from '../../../constants/query.constants';

@Injectable()
export class QueryProcessor {
  
  extractKeywords(query: string, context: QueryGenerationContext): string[] {
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

  applyFilters(queries: GeneratedQuery[], request: QueryGenerationRequest): GeneratedQuery[] {
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

  calculateStats(queries: GeneratedQuery[]): QueryGenerationStats {
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
}