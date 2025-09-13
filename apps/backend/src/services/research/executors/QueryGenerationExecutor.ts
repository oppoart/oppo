import { BaseServiceExecutor } from './BaseServiceExecutor';
import { ServiceExecutionOptions, ServiceExecutionResult } from '../types';
import { AnalystService } from '../../../../../packages/services/analyst';
import { 
  DEFAULT_RESEARCH_OPTIONS, 
  SOURCE_TYPES 
} from '../../../../../../packages/shared/src/constants/research.constants';

export class QueryGenerationExecutor extends BaseServiceExecutor {
  private analystService: AnalystService;

  constructor(analystService: AnalystService) {
    super('query-generation');
    this.analystService = analystService;
  }

  async execute(profileId: string, options?: ServiceExecutionOptions): Promise<ServiceExecutionResult> {
    const startTime = Date.now();
    
    try {
      const queries = await this.analystService.generateQueries(profileId, {
        maxQueries: options?.maxQueries || DEFAULT_RESEARCH_OPTIONS.MAX_QUERIES,
        sourceTypes: options?.sources || [
          SOURCE_TYPES.WEBSEARCH, 
          SOURCE_TYPES.SOCIAL, 
          SOURCE_TYPES.BOOKMARK, 
          SOURCE_TYPES.NEWSLETTER
        ]
      });

      return this.createResult(queries, {
        executionTime: Date.now() - startTime,
        itemsProcessed: queries.length,
        profileId,
        optionsUsed: {
          maxQueries: options?.maxQueries || DEFAULT_RESEARCH_OPTIONS.MAX_QUERIES,
          sourceTypes: options?.sources?.length || 4
        }
      });
    } catch (error) {
      return this.handleError(error, 'query generation');
    }
  }

  validate(options?: ServiceExecutionOptions): boolean {
    if (options?.maxQueries && (options.maxQueries < 1 || options.maxQueries > 100)) {
      return false;
    }
    return true;
  }
}