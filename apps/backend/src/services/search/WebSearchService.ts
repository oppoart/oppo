import { GoogleSearchService, SearchResult, GoogleSearchOptions, GoogleSearchResponse } from './GoogleSearchService';
import { GoogleCustomSearchService } from './GoogleCustomSearchService';
import { PrismaClient } from '@prisma/client';

export interface SearchJobOptions {
  maxResults?: number;
  includeSnippets?: boolean;
  filterDomains?: string[];
  excludeDomains?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  priority?: 'low' | 'medium' | 'high';
}

export interface SearchJob {
  id: string;
  queries: string[];
  options: SearchJobOptions;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: SearchResult[];
  totalResults: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress: number;
}

export interface ProcessedSearchResult extends SearchResult {
  qualityScore: number;
  artRelevanceScore: number;
  opportunityType?: string;
  extractedData: {
    deadline?: Date;
    amount?: string;
    location?: string;
    organization?: string;
    requirements?: string[];
  };
}

/**
 * Enhanced Web Search Service for External Data Pipeline
 * Combines multiple search APIs with intelligent processing
 */
export class WebSearchService {
  private serpApiService: GoogleSearchService;
  private customSearchService: GoogleCustomSearchService;
  private prisma: PrismaClient;
  private activeJobs = new Map<string, SearchJob>();

  constructor(prisma: PrismaClient) {
    this.serpApiService = new GoogleSearchService();
    this.customSearchService = new GoogleCustomSearchService();
    this.prisma = prisma;
  }

  /**
   * Execute intelligent search with multiple providers
   */
  async executeSearch(queries: string[], options: SearchJobOptions = {}): Promise<SearchJob> {
    const jobId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: SearchJob = {
      id: jobId,
      queries,
      options,
      status: 'pending',
      results: [],
      totalResults: 0,
      progress: 0
    };

    this.activeJobs.set(jobId, job);
    
    // Start background processing
    this.processSearchJob(jobId).catch(error => {
      console.error(`Search job ${jobId} failed:`, error);
      const failedJob = this.activeJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error.message;
        failedJob.completedAt = new Date();
        this.activeJobs.set(jobId, failedJob);
      }
    });

    return job;
  }

  /**
   * Process search job in background
   */
  private async processSearchJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      job.startedAt = new Date();
      this.activeJobs.set(jobId, job);

      const allResults: SearchResult[] = [];
      const totalQueries = job.queries.length;
      let processedQueries = 0;

      for (const query of job.queries) {
        try {
          // Try SerpAPI first (more reliable)
          let searchResults = await this.searchWithProvider('serpapi', query, job.options);
          
          // If SerpAPI fails or returns few results, try Google Custom Search
          if (searchResults.results.length < 5) {
            const customResults = await this.searchWithProvider('custom', query, job.options);
            if (customResults.results.length > searchResults.results.length) {
              searchResults = customResults;
            }
          }

          // Process and filter results
          const processedResults = await this.processSearchResults(searchResults.results, job.options);
          allResults.push(...processedResults);

          processedQueries++;
          job.progress = Math.round((processedQueries / totalQueries) * 100);
          this.activeJobs.set(jobId, job);

          // Rate limiting between queries
          if (processedQueries < totalQueries) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (error) {
          console.error(`Query "${query}" failed:`, error);
          // Continue with other queries
        }
      }

      // Deduplicate and rank results
      const deduplicatedResults = await this.deduplicateResults(allResults);
      const rankedResults = await this.rankResults(deduplicatedResults);

      job.results = rankedResults;
      job.totalResults = rankedResults.length;
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      
      this.activeJobs.set(jobId, job);

      // Store results in database if they look like opportunities
      await this.storeOpportunityResults(rankedResults);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      this.activeJobs.set(jobId, job);
    }
  }

  /**
   * Search with specific provider
   */
  private async searchWithProvider(
    provider: 'serpapi' | 'custom', 
    query: string, 
    options: SearchJobOptions
  ): Promise<GoogleSearchResponse> {
    const searchOptions: GoogleSearchOptions = {
      query,
      num: options.maxResults || 10,
      hl: 'en',
      gl: 'us'
    };

    if (provider === 'serpapi') {
      return await this.serpApiService.searchArtOpportunities(query, searchOptions);
    } else {
      return await this.customSearchService.searchArtOpportunities(query, searchOptions);
    }
  }

  /**
   * Process raw search results with quality scoring
   */
  private async processSearchResults(
    results: SearchResult[], 
    options: SearchJobOptions
  ): Promise<ProcessedSearchResult[]> {
    const processedResults: ProcessedSearchResult[] = [];

    for (const result of results) {
      try {
        // Apply domain filters
        if (options.filterDomains && !options.filterDomains.some(domain => result.domain?.includes(domain))) {
          continue;
        }
        
        if (options.excludeDomains && options.excludeDomains.some(domain => result.domain?.includes(domain))) {
          continue;
        }

        // Calculate quality scores
        const qualityScore = this.calculateQualityScore(result);
        const artRelevanceScore = this.calculateArtRelevanceScore(result);
        
        // Skip low-quality results
        if (qualityScore < 30 || artRelevanceScore < 40) {
          continue;
        }

        // Extract structured data
        const extractedData = this.extractOpportunityData(result);
        
        // Determine opportunity type
        const opportunityType = this.classifyOpportunityType(result);

        const processedResult: ProcessedSearchResult = {
          ...result,
          qualityScore,
          artRelevanceScore,
          opportunityType,
          extractedData
        };

        processedResults.push(processedResult);

      } catch (error) {
        console.error(`Failed to process result "${result.title}":`, error);
      }
    }

    return processedResults;
  }

  /**
   * Calculate quality score based on multiple factors
   */
  private calculateQualityScore(result: SearchResult): number {
    let score = 50; // Base score
    
    // Domain reputation
    const highQualityDomains = ['.org', '.edu', '.gov', '.museum', '.foundation'];
    if (highQualityDomains.some(domain => result.link.includes(domain))) {
      score += 25;
    }
    
    // Title quality
    if (result.title.length > 20 && result.title.length < 100) {
      score += 10;
    }
    
    // Snippet quality
    if (result.snippet.length > 50 && result.snippet.length < 300) {
      score += 10;
    }
    
    // Avoid spam indicators
    const spamIndicators = ['click here', 'free money', 'guaranteed', 'act now'];
    if (spamIndicators.some(indicator => 
      result.title.toLowerCase().includes(indicator) || 
      result.snippet.toLowerCase().includes(indicator)
    )) {
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate art relevance score
   */
  private calculateArtRelevanceScore(result: SearchResult): number {
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    
    const artKeywords = [
      'art', 'artist', 'artistic', 'exhibition', 'gallery', 'museum',
      'grant', 'residency', 'fellowship', 'competition', 'award',
      'painting', 'sculpture', 'photography', 'digital art', 'performance',
      'contemporary', 'fine art', 'visual art', 'creative', 'curator'
    ];
    
    const opportunityKeywords = [
      'call for', 'submit', 'apply', 'deadline', 'funding', 'prize',
      'opportunity', 'open call', 'application', 'submission'
    ];

    let score = 0;
    let artMatches = 0;
    let oppMatches = 0;

    for (const keyword of artKeywords) {
      if (text.includes(keyword)) {
        artMatches++;
        score += 5;
      }
    }

    for (const keyword of opportunityKeywords) {
      if (text.includes(keyword)) {
        oppMatches++;
        score += 10;
      }
    }

    // Bonus for multiple matches
    if (artMatches > 2 && oppMatches > 1) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * Extract structured opportunity data from search result
   */
  private extractOpportunityData(result: SearchResult): ProcessedSearchResult['extractedData'] {
    const text = `${result.title} ${result.snippet}`;
    
    return {
      deadline: this.extractDeadline(text),
      amount: this.extractAmount(text),
      location: this.extractLocation(text),
      organization: this.extractOrganization(text),
      requirements: this.extractRequirements(text)
    };
  }

  private extractDeadline(text: string): Date | undefined {
    const deadlinePatterns = [
      /deadline[:\s]+([^,.]+)/i,
      /due[:\s]+([^,.]+)/i,
      /closes[:\s]+([^,.]+)/i,
      /apply by[:\s]+([^,.]+)/i
    ];

    for (const pattern of deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime()) && parsed > new Date()) {
          return parsed;
        }
      }
    }
    return undefined;
  }

  private extractAmount(text: string): string | undefined {
    const amountPattern = /\$[\d,]+(?:\.\d{2})?/;
    const match = text.match(amountPattern);
    return match?.[0];
  }

  private extractLocation(text: string): string | undefined {
    const locationPattern = /(?:in|at)\s+([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*)/;
    const match = text.match(locationPattern);
    return match?.[1];
  }

  private extractOrganization(text: string): string | undefined {
    const orgPatterns = [
      /by\s+([A-Z][^,.]+(?:Foundation|Institute|Gallery|Museum|Center|Council|Arts?))/i,
      /([A-Z][^,.]+(?:Foundation|Institute|Gallery|Museum|Center|Council|Arts?))/i
    ];

    for (const pattern of orgPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  private extractRequirements(text: string): string[] {
    const reqKeywords = ['must', 'required', 'eligibility', 'qualify'];
    const requirements = [];
    
    for (const keyword of reqKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        const sentences = text.split(/[.!?]/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            requirements.push(sentence.trim());
            break;
          }
        }
      }
    }
    
    return requirements.slice(0, 3); // Limit to 3 requirements
  }

  /**
   * Classify opportunity type
   */
  private classifyOpportunityType(result: SearchResult): string {
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    
    if (text.includes('grant') || text.includes('funding')) return 'grant';
    if (text.includes('residency') || text.includes('residence')) return 'residency';
    if (text.includes('exhibition') || text.includes('show')) return 'exhibition';
    if (text.includes('fellowship')) return 'fellowship';
    if (text.includes('competition') || text.includes('contest')) return 'competition';
    if (text.includes('award') || text.includes('prize')) return 'award';
    if (text.includes('job') || text.includes('position')) return 'employment';
    
    return 'other';
  }

  /**
   * Deduplicate results based on URL and title similarity
   */
  private async deduplicateResults(results: ProcessedSearchResult[]): Promise<ProcessedSearchResult[]> {
    const unique = [];
    const seen = new Set<string>();

    for (const result of results) {
      // Create a key for deduplication
      const key = `${result.domain}:${result.title.toLowerCase().substring(0, 50)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Rank results by combined quality and relevance scores
   */
  private async rankResults(results: ProcessedSearchResult[]): Promise<ProcessedSearchResult[]> {
    return results.sort((a, b) => {
      const scoreA = (a.qualityScore * 0.4) + (a.artRelevanceScore * 0.6);
      const scoreB = (b.qualityScore * 0.4) + (b.artRelevanceScore * 0.6);
      return scoreB - scoreA;
    });
  }

  /**
   * Store high-quality results as opportunities in database
   */
  private async storeOpportunityResults(results: ProcessedSearchResult[]): Promise<void> {
    const highQualityResults = results.filter(r => 
      r.qualityScore > 60 && r.artRelevanceScore > 70
    );

    for (const result of highQualityResults) {
      try {
        // Check if opportunity already exists
        const existing = await this.prisma.opportunity.findFirst({
          where: { url: result.link }
        });

        if (!existing) {
          await this.prisma.opportunity.create({
            data: {
              title: result.title.substring(0, 255),
              description: result.snippet.substring(0, 2000),
              url: result.link,
              sourceType: 'websearch',
              sourceUrl: result.link,
              organization: result.extractedData.organization,
              deadline: result.extractedData.deadline,
              amount: result.extractedData.amount,
              location: result.extractedData.location,
              tags: [result.opportunityType || 'general'],
              relevanceScore: (result.qualityScore + result.artRelevanceScore) / 200,
              processed: true,
              sourceMetadata: {
                provider: 'websearch',
                qualityScore: result.qualityScore,
                artRelevanceScore: result.artRelevanceScore,
                extractedData: result.extractedData
              }
            }
          });
        }
      } catch (error) {
        console.error(`Failed to store opportunity "${result.title}":`, error);
      }
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): SearchJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.completedAt = new Date();
      this.activeJobs.set(jobId, job);
      return true;
    }
    return false;
  }

  /**
   * Health check for all search providers
   */
  async healthCheck(): Promise<{ serpapi: boolean; customSearch: boolean }> {
    const [serpapiHealth, customSearchHealth] = await Promise.all([
      this.serpApiService.healthCheck(),
      this.customSearchService.healthCheck()
    ]);

    return {
      serpapi: serpapiHealth,
      customSearch: customSearchHealth
    };
  }
}

export const webSearchService = new WebSearchService(new PrismaClient());