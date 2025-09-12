import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { DataExtractor, RawData } from '../../processors/DataExtractor';
import { DataCleaner } from '../../processors/DataCleaner';

/**
 * Brave Search API response interfaces
 */
interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  language?: string;
  family_friendly?: boolean;
}

interface BraveSearchResponse {
  query: {
    original: string;
    show_strict_warning: boolean;
    is_navigational: boolean;
    spellcheck_off: boolean;
  };
  mixed: {
    type: string;
    main: BraveSearchResult[];
    top: BraveSearchResult[];
    side: BraveSearchResult[];
  };
  web: {
    type: string;
    results: BraveSearchResult[];
    family_friendly: boolean;
  };
}

/**
 * Brave Search configuration
 */
interface BraveSearchConfig {
  apiKey: string;
  baseUrl: string;
  maxResultsPerQuery: number;
  safesearch: 'off' | 'moderate' | 'strict';
  freshness: 'pd' | 'pw' | 'pm' | 'py' | 'YYYY-MM-DDtoYYYY-MM-DD';
  country: string;
  language: string;
  timeout: number;
}

/**
 * Search query templates for artist opportunities
 */
interface SearchQuery {
  query: string;
  priority: number;
  expectedRelevance: number;
}

/**
 * Brave Search API integration for intelligent opportunity discovery
 * Uses AI-powered search queries to find relevant artist opportunities
 */
export class BraveSearchDiscoverer extends BaseDiscoverer {
  private searchConfig: BraveSearchConfig;
  private dataExtractor: DataExtractor;
  private dataCleaner: DataCleaner;

  constructor() {
    super('brave-search', 'websearch', '1.0.0');
    
    this.searchConfig = {
      apiKey: process.env.BRAVE_SEARCH_API_KEY || '',
      baseUrl: 'https://api.search.brave.com/res/v1',
      maxResultsPerQuery: 10,
      safesearch: 'moderate',
      freshness: 'pm', // Past month
      country: 'US',
      language: 'en',
      timeout: 15000
    };

    this.dataExtractor = new DataExtractor({
      enabled: true,
      timeout: 10000,
      extractImages: false,
      extractLinks: true
    });

    this.dataCleaner = new DataCleaner({
      enabled: true,
      maxTitleLength: 150,
      maxDescriptionLength: 2000
    });
  }

  protected async onInitialize(): Promise<void> {
    console.log('Initializing Brave Search discoverer...');
    
    if (!this.searchConfig.apiKey) {
      throw new Error('Brave Search API key is required (BRAVE_SEARCH_API_KEY)');
    }
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      // Simple API health check
      const testQuery = 'test';
      const url = `${this.searchConfig.baseUrl}/web/search?q=${encodeURIComponent(testQuery)}&count=1`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.searchConfig.apiKey
        },
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch (error) {
      console.error('Brave Search health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 50;

    console.log(`Starting Brave Search discovery (max results: ${maxResults})`);

    try {
      // Generate search queries based on context
      const queries = this.generateSearchQueries(context);
      console.log(`Generated ${queries.length} search queries`);

      // Execute searches and collect results
      const allSearchResults: BraveSearchResult[] = [];
      
      for (const queryObj of queries) {
        try {
          console.log(`Searching: "${queryObj.query}"`);
          const results = await this.executeSearch(queryObj.query);
          
          // Filter and deduplicate results
          const filteredResults = this.filterSearchResults(results, queryObj.expectedRelevance);
          allSearchResults.push(...filteredResults);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.warn(`Search query failed: "${queryObj.query}"`, error);
        }
      }

      console.log(`Total search results collected: ${allSearchResults.length}`);

      // Remove duplicates based on URL
      const uniqueResults = this.deduplicateResults(allSearchResults);
      console.log(`Unique search results: ${uniqueResults.length}`);

      // Convert search results to opportunities
      for (let i = 0; i < uniqueResults.length && opportunities.length < maxResults; i++) {
        try {
          const opportunity = await this.convertSearchResultToOpportunity(uniqueResults[i], context);
          if (opportunity) {
            opportunities.push(opportunity);
          }
        } catch (error) {
          console.warn(`Failed to process search result ${i + 1}:`, error);
        }

        // Rate limiting for content fetching
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`Brave Search discovery completed: ${opportunities.length} opportunities found`);
      return opportunities;

    } catch (error) {
      console.error('Brave Search discovery failed:', error);
      throw error;
    }
  }

  /**
   * Generate intelligent search queries based on context
   */
  private generateSearchQueries(context?: DiscoveryContext): SearchQuery[] {
    const baseQueries: SearchQuery[] = [
      // High-priority, specific queries
      { query: 'artist grant 2024 2025 application', priority: 10, expectedRelevance: 0.9 },
      { query: 'artist fellowship deadline apply', priority: 10, expectedRelevance: 0.9 },
      { query: 'art residency open call artists', priority: 9, expectedRelevance: 0.85 },
      { query: 'visual arts grant funding opportunity', priority: 9, expectedRelevance: 0.85 },
      { query: 'emerging artist grant program', priority: 8, expectedRelevance: 0.8 },
      
      // Medium-priority queries
      { query: 'artist competition prize award', priority: 7, expectedRelevance: 0.75 },
      { query: 'art exhibition call for artists', priority: 7, expectedRelevance: 0.75 },
      { query: 'creative professional development grant', priority: 6, expectedRelevance: 0.7 },
      { query: 'artist studio space opportunity', priority: 6, expectedRelevance: 0.7 },
      { query: 'art commission public project', priority: 5, expectedRelevance: 0.65 },
      
      // Broader, lower-priority queries
      { query: 'artist opportunity deadline', priority: 4, expectedRelevance: 0.6 },
      { query: 'creative grant arts funding', priority: 4, expectedRelevance: 0.6 },
      { query: 'artist job position curator', priority: 3, expectedRelevance: 0.55 }
    ];

    const queries: SearchQuery[] = [...baseQueries];

    // Add context-specific queries
    if (context?.searchTerms && context.searchTerms.length > 0) {
      context.searchTerms.forEach(term => {
        queries.push({
          query: `${term} artist grant opportunity`,
          priority: 8,
          expectedRelevance: 0.8
        });
        
        queries.push({
          query: `${term} art fellowship application`,
          priority: 7,
          expectedRelevance: 0.75
        });
      });
    }

    // Add location-specific queries
    if (context?.location) {
      queries.push({
        query: `artist grant ${context.location} local opportunity`,
        priority: 9,
        expectedRelevance: 0.85
      });
      
      queries.push({
        query: `art residency ${context.location} region`,
        priority: 8,
        expectedRelevance: 0.8
      });
    }

    // Add date-specific queries if we have a date range
    if (context?.dateRange) {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      
      queries.push({
        query: `artist grant deadline ${currentYear} ${nextYear}`,
        priority: 9,
        expectedRelevance: 0.85
      });
    }

    // Sort by priority and return top queries
    return queries
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8); // Limit to avoid too many API calls
  }

  /**
   * Execute a search query via Brave Search API
   */
  private async executeSearch(query: string): Promise<BraveSearchResult[]> {
    const url = `${this.searchConfig.baseUrl}/web/search`;
    const params = new URLSearchParams({
      q: query,
      count: this.searchConfig.maxResultsPerQuery.toString(),
      safesearch: this.searchConfig.safesearch,
      freshness: this.searchConfig.freshness,
      country: this.searchConfig.country,
      search_lang: this.searchConfig.language,
      ui_lang: this.searchConfig.language,
      result_filter: 'web'
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.searchConfig.apiKey
      },
      signal: AbortSignal.timeout(this.searchConfig.timeout)
    });

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
    }

    const data: BraveSearchResponse = await response.json();
    
    // Combine results from different sections
    const results: BraveSearchResult[] = [
      ...(data.web?.results || []),
      ...(data.mixed?.main || []),
      ...(data.mixed?.top || [])
    ];

    return results;
  }

  /**
   * Filter search results based on relevance and quality
   */
  private filterSearchResults(results: BraveSearchResult[], expectedRelevance: number): BraveSearchResult[] {
    return results.filter(result => {
      // Basic quality checks
      if (!result.title || !result.url || !result.description) {
        return false;
      }

      // Skip results that are too short
      if (result.description.length < 50) {
        return false;
      }

      // Skip results from low-quality domains
      const lowQualityDomains = [
        'pinterest.com', 'facebook.com', 'twitter.com', 'instagram.com',
        'linkedin.com', 'youtube.com', 'tiktok.com', 'reddit.com'
      ];
      
      if (lowQualityDomains.some(domain => result.url.includes(domain))) {
        return false;
      }

      // Check for artist/art-related content
      const artKeywords = [
        'artist', 'art', 'creative', 'grant', 'fellowship', 'residency',
        'exhibition', 'gallery', 'museum', 'visual', 'fine arts', 'contemporary'
      ];

      const text = `${result.title} ${result.description}`.toLowerCase();
      const keywordMatches = artKeywords.filter(keyword => text.includes(keyword)).length;
      
      // Require at least one art-related keyword for lower expected relevance
      if (expectedRelevance < 0.7 && keywordMatches === 0) {
        return false;
      }

      // Check for opportunity-related keywords
      const opportunityKeywords = [
        'grant', 'fellowship', 'residency', 'opportunity', 'application',
        'deadline', 'apply', 'funding', 'award', 'prize', 'competition',
        'call for', 'open call', 'submission'
      ];

      const opportunityMatches = opportunityKeywords.filter(keyword => text.includes(keyword)).length;
      
      // Require at least one opportunity-related keyword
      return opportunityMatches > 0;
    });
  }

  /**
   * Remove duplicate results based on URL
   */
  private deduplicateResults(results: BraveSearchResult[]): BraveSearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const normalizedUrl = this.normalizeUrl(result.url);
      if (seen.has(normalizedUrl)) {
        return false;
      }
      seen.add(normalizedUrl);
      return true;
    });
  }

  /**
   * Normalize URL for deduplication
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString().toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Convert search result to opportunity data
   */
  private async convertSearchResultToOpportunity(
    result: BraveSearchResult,
    context?: DiscoveryContext
  ): Promise<OpportunityData | null> {
    try {
      console.log(`Processing: ${result.title}`);

      // Create initial opportunity from search result
      let opportunity: Partial<OpportunityData> = {
        title: result.title,
        description: result.description,
        url: result.url,
        sourceType: 'websearch',
        sourceMetadata: {
          searchEngine: 'brave',
          discoveredAt: new Date().toISOString(),
          originalTitle: result.title,
          originalDescription: result.description
        }
      };

      // Try to fetch and extract more detailed information
      try {
        const detailedData = await this.fetchDetailedOpportunity(result.url);
        if (detailedData) {
          // Merge detailed data with search result data
          opportunity = {
            ...opportunity,
            ...detailedData,
            // Keep search result data as fallback
            title: detailedData.title || opportunity.title,
            description: detailedData.description || opportunity.description,
            sourceMetadata: {
              ...opportunity.sourceMetadata,
              ...detailedData.sourceMetadata,
              enhancedWithContent: true
            }
          };
        }
      } catch (error) {
        console.warn(`Failed to fetch detailed content for ${result.url}:`, error);
        // Continue with search result data only
      }

      // Validate we have minimum required data
      if (!opportunity.title || !opportunity.description || !opportunity.url) {
        console.warn('Insufficient data for opportunity');
        return null;
      }

      // Clean the data
      const cleaningResult = await this.dataCleaner.clean(opportunity as OpportunityData);
      
      if (!cleaningResult.success || !cleaningResult.data) {
        console.warn('Data cleaning failed for opportunity');
        return null;
      }

      return cleaningResult.data;

    } catch (error) {
      console.error('Error converting search result to opportunity:', error);
      return null;
    }
  }

  /**
   * Fetch detailed opportunity information from the URL
   */
  private async fetchDetailedOpportunity(url: string): Promise<Partial<OpportunityData> | null> {
    try {
      // Fetch page content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      // Extract data using DataExtractor
      const rawData: RawData = {
        content: html,
        contentType: 'html' as const,
        url: url,
        metadata: {
          source: 'brave_search_detail',
          fetchedAt: new Date().toISOString()
        }
      };

      const extractionResult = await this.dataExtractor.extract(rawData, 'websearch');
      
      if (extractionResult.success && extractionResult.data) {
        return extractionResult.data;
      }

      return null;

    } catch (error) {
      // Don't log every error to avoid spam, just return null
      return null;
    }
  }

  protected getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      rateLimit: 60, // 60 requests per minute (Brave's limit)
      timeout: 20000, // 20 seconds
      retryAttempts: 2
    };
  }
}