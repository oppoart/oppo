import { GeneratedSearchQuery, SourceType } from './types';

export class QueryOptimizer {
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async optimizeQueries(
    queries: GeneratedSearchQuery[],
    profileAnalysis: any,
    maxQueries?: number
  ): Promise<GeneratedSearchQuery[]> {
    if (!this.isInitialized) {
      throw new Error('QueryOptimizer is not initialized');
    }

    // Sort by priority and expected results
    const sortedQueries = queries.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Higher expected results first
      return b.expectedResults - a.expectedResults;
    });

    // Remove duplicates
    const uniqueQueries = this.removeDuplicates(sortedQueries);

    // Limit if requested
    if (maxQueries && uniqueQueries.length > maxQueries) {
      return uniqueQueries.slice(0, maxQueries);
    }

    return uniqueQueries;
  }

  private removeDuplicates(queries: GeneratedSearchQuery[]): GeneratedSearchQuery[] {
    const seen = new Set<string>();
    return queries.filter(query => {
      const normalized = query.query.toLowerCase().trim();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }
}