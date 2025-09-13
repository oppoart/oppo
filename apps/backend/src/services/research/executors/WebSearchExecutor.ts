import { BaseServiceExecutor } from './BaseServiceExecutor';
import { ServiceExecutionOptions, ServiceExecutionResult } from '../types';

export class WebSearchExecutor extends BaseServiceExecutor {
  constructor() {
    super('web-search');
  }

  async execute(profileId: string, options?: ServiceExecutionOptions): Promise<ServiceExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Use enhanced query execution service for intelligent search
      const { queryExecutionService } = await import('../../search/QueryExecutionService');
      
      const executionResult = await queryExecutionService.executeProfileSearch(profileId, {
        maxQueriesPerProfile: options?.maxQueries || 10,
        searchOptions: {
          maxResults: options?.limit || 15,
          priority: options?.priority || 'medium'
        },
        enableRateLimiting: true,
        opportunityTypes: options?.opportunityTypes || ['grants', 'residencies', 'exhibitions'],
        locations: options?.locations
      });

      // Wait for completion and return results
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max
      
      while (attempts < maxAttempts) {
        const status = queryExecutionService.getExecutionStatus(executionResult.jobId);
        if (!status) break;
        
        if (status.status === 'completed') {
          return this.createResult({
            executionId: executionResult.jobId,
            queriesGenerated: status.queriesGenerated,
            opportunitiesFound: status.opportunitiesFound,
            highQualityOpportunities: status.highQualityOpportunities
          }, {
            executionTime: Date.now() - startTime,
            itemsProcessed: status.opportunitiesFound || 0,
            profileId,
            jobId: executionResult.jobId
          });
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Search execution failed');
        }
        
        await this.sleep(10000); // Wait 10 seconds
        attempts++;
      }
      
      // Return partial results if still running
      return this.createResult({
        executionId: executionResult.jobId,
        status: 'running',
        queriesGenerated: executionResult.queriesGenerated,
        message: 'Search is still in progress'
      }, {
        executionTime: Date.now() - startTime,
        itemsProcessed: 0,
        profileId,
        jobId: executionResult.jobId,
        partialResult: true
      });
      
    } catch (error) {
      console.error('Enhanced web search failed:', error);
      return this.handleError(error, 'web search');
    }
  }

  validate(options?: ServiceExecutionOptions): boolean {
    if (options?.maxQueries && (options.maxQueries < 1 || options.maxQueries > 50)) {
      return false;
    }
    if (options?.limit && (options.limit < 1 || options.limit > 100)) {
      return false;
    }
    return true;
  }
}