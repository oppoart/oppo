import axios from 'axios';
import { SearchResult, GoogleSearchOptions, GoogleSearchResponse } from './GoogleSearchService';

/**
 * Google Custom Search API Client
 * Uses the official Google Custom Search JSON API
 */
export class GoogleCustomSearchService {
  private apiKey: string;
  private searchEngineId: string;
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';

  constructor(apiKey?: string, searchEngineId?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || '';
    this.searchEngineId = searchEngineId || process.env.GOOGLE_SEARCH_ENGINE_ID || '';
    
    if (!this.apiKey || !this.searchEngineId) {
      console.warn('GoogleCustomSearchService: API key or Search Engine ID not configured. Service will not be available.');
    }
  }

  async search(options: GoogleSearchOptions): Promise<GoogleSearchResponse> {
    const startTime = Date.now();
    
    if (!this.apiKey || !this.searchEngineId) {
      throw new Error('Google Custom Search API not configured');
    }

    try {
      const params = {
        key: this.apiKey,
        cx: this.searchEngineId,
        q: options.query,
        num: Math.min(options.num || 10, 10), // Google CSE API max is 10
        start: options.start || 1,
        hl: options.hl || 'en',
        gl: options.gl || 'us',
        ...(options.location && { cr: this.getCountryCode(options.location) })
      };

      const response = await axios.get(this.baseUrl, { params });
      const data = response.data;

      const results: SearchResult[] = (data.items || []).map((item: any, index: number) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        position: (options.start || 1) + index,
        domain: this.extractDomain(item.link),
        date: this.extractDate(item)
      }));

      return {
        results,
        totalResults: parseInt(data.searchInformation?.totalResults) || results.length,
        searchTime: Date.now() - startTime,
        query: options.query
      };

    } catch (error: any) {
      console.error('Google Custom Search API error:', error);
      
      if (error.response?.status === 403) {
        throw new Error('Google Custom Search API quota exceeded or invalid credentials');
      } else if (error.response?.status === 429) {
        throw new Error('Google Custom Search API rate limit exceeded');
      } else {
        throw new Error(`Google Custom Search failed: ${error.message}`);
      }
    }
  }

  async searchMultipleQueries(queries: string[], options: Omit<GoogleSearchOptions, 'query'> = {}): Promise<GoogleSearchResponse[]> {
    const results = [];
    
    // Process queries sequentially to avoid rate limits
    for (const query of queries) {
      try {
        const result = await this.search({ ...options, query });
        results.push(result);
        
        // Add delay between requests to respect rate limits
        if (queries.indexOf(query) < queries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Search failed for query "${query}":`, error);
        results.push({
          results: [],
          totalResults: 0,
          searchTime: 0,
          query
        });
      }
    }
    
    return results;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  private extractDate(item: any): string | undefined {
    // Try to extract date from structured data or meta info
    if (item.pagemap?.metatags?.[0]) {
      const meta = item.pagemap.metatags[0];
      return meta['article:published_time'] || 
             meta['article:modified_time'] || 
             meta['date'] || 
             meta['publish_date'];
    }
    return undefined;
  }

  private getCountryCode(location: string): string {
    const locationMap: { [key: string]: string } = {
      'usa': 'countryUS',
      'united states': 'countryUS',
      'uk': 'countryGB',
      'united kingdom': 'countryGB',
      'canada': 'countryCA',
      'australia': 'countryAU',
      'germany': 'countryDE',
      'france': 'countryFR',
      'italy': 'countryIT',
      'spain': 'countryES',
      'netherlands': 'countryNL',
      'sweden': 'countrySE',
      'norway': 'countryNO',
      'denmark': 'countryDK',
      'finland': 'countryFI'
    };
    
    return locationMap[location.toLowerCase()] || '';
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey || !this.searchEngineId) {
      return false;
    }

    try {
      await this.search({ query: 'test', num: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // Art-specific search methods
  async searchArtOpportunities(query: string, options: Partial<GoogleSearchOptions> = {}): Promise<GoogleSearchResponse> {
    const enhancedQuery = `${query} (art OR artist OR exhibition OR gallery OR grant OR residency OR fellowship) -job -employment`;
    
    return this.search({
      query: enhancedQuery,
      num: 10,
      ...options
    });
  }

  // Search with quality filters
  async searchHighQualityResults(query: string, options: Partial<GoogleSearchOptions> = {}): Promise<GoogleSearchResponse> {
    const qualityQuery = `${query} site:*.org OR site:*.edu OR site:*.gov -site:pinterest.com -site:facebook.com -site:twitter.com`;
    
    return this.search({
      query: qualityQuery,
      num: 10,
      ...options
    });
  }

  // Get search suggestions for query expansion
  async getQuerySuggestions(baseQuery: string): Promise<string[]> {
    const expansions = [
      `${baseQuery} grant`,
      `${baseQuery} residency`,
      `${baseQuery} exhibition`,
      `${baseQuery} fellowship`,
      `${baseQuery} competition`,
      `${baseQuery} call for artists`,
      `${baseQuery} funding opportunity`,
      `${baseQuery} art prize`
    ];
    
    return expansions;
  }
}

export const googleCustomSearchService = new GoogleCustomSearchService();