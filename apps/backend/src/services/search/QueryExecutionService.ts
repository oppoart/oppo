import { PrismaClient } from '@prisma/client';
import { WebSearchService, SearchJob, SearchJobOptions } from './WebSearchService';
import { queryGenerationService } from '../ai-services/QueryGenerationService';
import { analysisService } from '../ai-services/AnalysisService';

export interface QueryExecutionOptions {
  maxQueriesPerProfile?: number;
  searchOptions?: SearchJobOptions;
  enableRateLimiting?: boolean;
  prioritizeRecent?: boolean;
  opportunityTypes?: string[];
  locations?: string[];
}

export interface ExecutionResult {
  jobId: string;
  profileId: string;
  queriesGenerated: number;
  queriesExecuted: number;
  opportunitiesFound: number;
  highQualityOpportunities: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface QueryBatch {
  id: string;
  profileId: string;
  queries: string[];
  generatedAt: Date;
  executedAt?: Date;
  results?: SearchJob;
}

/**
 * Intelligent Search Query Execution Service
 * Combines AI query generation with intelligent search execution
 */
export class QueryExecutionService {
  private prisma: PrismaClient;
  private webSearchService: WebSearchService;
  private activeExecutions = new Map<string, ExecutionResult>();
  private queryCache = new Map<string, QueryBatch>();

  // Rate limiting
  private lastExecutionTime = 0;
  private minExecutionInterval = 5000; // 5 seconds between executions

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.webSearchService = new WebSearchService(prisma);
  }

  /**
   * Execute comprehensive search for an artist profile
   */
  async executeProfileSearch(
    profileId: string, 
    options: QueryExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result: ExecutionResult = {
      jobId: executionId,
      profileId,
      queriesGenerated: 0,
      queriesExecuted: 0,
      opportunitiesFound: 0,
      highQualityOpportunities: 0,
      status: 'running',
      startedAt: new Date()
    };

    this.activeExecutions.set(executionId, result);
    
    // Start background processing
    this.processProfileSearch(executionId, profileId, options).catch(error => {
      console.error(`Profile search execution ${executionId} failed:`, error);
      const failedResult = this.activeExecutions.get(executionId);
      if (failedResult) {
        failedResult.status = 'failed';
        failedResult.error = error.message;
        failedResult.completedAt = new Date();
        this.activeExecutions.set(executionId, failedResult);
      }
    });

    return result;
  }

  /**
   * Process profile search in background
   */
  private async processProfileSearch(
    executionId: string, 
    profileId: string, 
    options: QueryExecutionOptions
  ): Promise<void> {
    const result = this.activeExecutions.get(executionId);
    if (!result) return;

    try {
      // Get artist profile
      const profile = await this.prisma.artistProfile.findUnique({
        where: { id: profileId }
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Apply rate limiting
      if (options.enableRateLimiting) {
        await this.applyRateLimit();
      }

      // Step 1: Generate intelligent queries
      console.log(`🔍 Generating queries for profile: ${profile.name}`);
      const queries = await this.generateQueriesForProfile(profile, options);
      
      result.queriesGenerated = queries.length;
      this.activeExecutions.set(executionId, result);

      // Step 2: Execute searches
      console.log(`🌐 Executing ${queries.length} search queries`);
      const searchJob = await this.webSearchService.executeSearch(queries, {
        maxResults: options.searchOptions?.maxResults || 15,
        filterDomains: this.getRelevantDomains(),
        excludeDomains: this.getSpamDomains(),
        priority: options.searchOptions?.priority || 'medium'
      });

      result.queriesExecuted = queries.length;
      this.activeExecutions.set(executionId, result);

      // Step 3: Wait for search completion and analyze results
      await this.waitForSearchCompletion(searchJob.id, result);
      
      // Step 4: Analyze opportunities against profile
      const finalJob = this.webSearchService.getJobStatus(searchJob.id);
      if (finalJob && finalJob.results) {
        console.log(`🎯 Analyzing ${finalJob.results.length} found opportunities`);
        const analyzedOpportunities = await this.analyzeOpportunities(finalJob.results, profile);
        
        result.opportunitiesFound = finalJob.results.length;
        result.highQualityOpportunities = analyzedOpportunities.length;
      }

      // Step 5: Store query execution history
      await this.storeExecutionHistory(executionId, profileId, queries, result);

      result.status = 'completed';
      result.completedAt = new Date();
      this.activeExecutions.set(executionId, result);

      console.log(`✅ Profile search completed: ${result.opportunitiesFound} opportunities found, ${result.highQualityOpportunities} high-quality`);

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.completedAt = new Date();
      this.activeExecutions.set(executionId, result);
      throw error;
    }
  }

  /**
   * Generate intelligent queries for a profile
   */
  private async generateQueriesForProfile(
    profile: any, 
    options: QueryExecutionOptions
  ): Promise<string[]> {
    const baseQueries = await queryGenerationService.generateQueries(
      profile,
      options.opportunityTypes || ['grants', 'residencies', 'exhibitions', 'fellowships']
    );

    // Enhance queries based on profile specifics
    const enhancedQueries = [];
    
    for (const query of baseQueries) {
      enhancedQueries.push(query);
      
      // Add location-specific variants if profile has location
      if (profile.location && !options.locations?.length) {
        enhancedQueries.push(`${query} ${profile.location}`);
      }
      
      // Add location filters if specified
      if (options.locations?.length) {
        for (const location of options.locations) {
          enhancedQueries.push(`${query} ${location}`);
        }
      }
      
      // Add medium-specific variants for high-match mediums
      const primaryMediums = profile.mediums?.slice(0, 2) || [];
      for (const medium of primaryMediums) {
        if (medium !== 'other') {
          enhancedQueries.push(`${query} ${medium}`);
        }
      }
    }

    // Deduplicate and limit
    const uniqueQueries = [...new Set(enhancedQueries)];
    const maxQueries = options.maxQueriesPerProfile || 15;
    
    return uniqueQueries.slice(0, maxQueries);
  }

  /**
   * Get relevant domains for filtering
   */
  private getRelevantDomains(): string[] {
    return [
      'arts.gov',
      'nea.gov',
      'foundation.org',
      'artsfoundation.org',
      'artists.org',
      'gallery.org',
      'museum.org',
      'residency.org',
      'artsletter.com',
      'callforentry.org',
      'submittable.com',
      'artopportunities.org',
      'grants.org',
      'fellowship.org'
    ];
  }

  /**
   * Get spam domains to exclude
   */
  private getSpamDomains(): string[] {
    return [
      'pinterest.com',
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'linkedin.com',
      'youtube.com',
      'reddit.com',
      'quora.com',
      'answers.com',
      'yahoo.com',
      'amazon.com',
      'ebay.com',
      'craigslist.org'
    ];
  }

  /**
   * Wait for search completion with timeout
   */
  private async waitForSearchCompletion(jobId: string, result: ExecutionResult): Promise<void> {
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const checkInterval = 2000; // 2 seconds
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const job = this.webSearchService.getJobStatus(jobId);
        
        if (!job) {
          reject(new Error('Search job not found'));
          return;
        }

        if (job.status === 'completed') {
          resolve();
          return;
        }

        if (job.status === 'failed') {
          reject(new Error(`Search failed: ${job.error}`));
          return;
        }

        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('Search timeout'));
          return;
        }

        // Update progress
        result.queriesExecuted = Math.round((job.progress / 100) * result.queriesGenerated);
        this.activeExecutions.set(result.jobId, result);

        setTimeout(checkStatus, checkInterval);
      };

      checkStatus();
    });
  }

  /**
   * Analyze opportunities against profile
   */
  private async analyzeOpportunities(searchResults: any[], profile: any): Promise<any[]> {
    const opportunities = searchResults.map(result => ({
      id: `temp_${Math.random().toString(36).substr(2, 9)}`,
      title: result.title,
      description: result.snippet,
      url: result.link,
      organization: result.extractedData?.organization,
      deadline: result.extractedData?.deadline,
      amount: result.extractedData?.amount,
      location: result.extractedData?.location,
      requirements: result.extractedData?.requirements,
      type: result.opportunityType
    }));

    const analyses = await analysisService.batchAnalyzeOpportunities(opportunities, profile, {
      maxConcurrent: 3
    });

    // Return high-relevance opportunities
    return analyses.analyses.filter(analysis => analysis.relevanceScore > 0.6);
  }

  /**
   * Store execution history
   */
  private async storeExecutionHistory(
    executionId: string,
    profileId: string, 
    queries: string[],
    result: ExecutionResult
  ): Promise<void> {
    try {
      await this.prisma.queryGenerationHistory.create({
        data: {
          artistProfileId: profileId,
          opportunityType: 'all',
          generatedQueries: queries,
          queryGenerationStyle: 'intelligent_search',
          aiProvider: 'combined',
          aiModel: 'search_execution_v1',
          temperature: 0.7,
          maxTokens: 1000,
          processingTimeMs: result.completedAt 
            ? result.completedAt.getTime() - result.startedAt.getTime()
            : 0,
          queryCount: queries.length,
          responseHash: executionId,
          metadata: {
            executionId,
            opportunitiesFound: result.opportunitiesFound,
            highQualityOpportunities: result.highQualityOpportunities,
            status: result.status
          }
        }
      });
    } catch (error) {
      console.error('Failed to store execution history:', error);
    }
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastExecution = now - this.lastExecutionTime;
    
    if (timeSinceLastExecution < this.minExecutionInterval) {
      const waitTime = this.minExecutionInterval - timeSinceLastExecution;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastExecutionTime = Date.now();
  }

  /**
   * Execute targeted search for specific opportunity types
   */
  async executeTargetedSearch(
    profileId: string,
    opportunityTypes: string[],
    options: QueryExecutionOptions = {}
  ): Promise<ExecutionResult> {
    return this.executeProfileSearch(profileId, {
      ...options,
      opportunityTypes,
      maxQueriesPerProfile: Math.min(opportunityTypes.length * 3, 12)
    });
  }

  /**
   * Execute location-based search
   */
  async executeLocationSearch(
    profileId: string,
    locations: string[],
    options: QueryExecutionOptions = {}
  ): Promise<ExecutionResult> {
    return this.executeProfileSearch(profileId, {
      ...options,
      locations,
      maxQueriesPerProfile: locations.length * 5
    });
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): ExecutionResult | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'failed';
      execution.error = 'Cancelled by user';
      execution.completedAt = new Date();
      this.activeExecutions.set(executionId, execution);
      return true;
    }
    return false;
  }

  /**
   * Get recent executions for a profile
   */
  async getRecentExecutions(profileId: string, limit = 10): Promise<any[]> {
    return this.prisma.queryGenerationHistory.findMany({
      where: { 
        artistProfileId: profileId,
        queryGenerationStyle: 'intelligent_search'
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        queryCount: true,
        processingTimeMs: true,
        metadata: true
      }
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const searchHealth = await this.webSearchService.healthCheck();
      return searchHealth.serpapi || searchHealth.customSearch;
    } catch {
      return false;
    }
  }
}

export const queryExecutionService = new QueryExecutionService(new PrismaClient());