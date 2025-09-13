import axios from 'axios';
import { apiKeyManager } from '../../../../packages/shared/src/config/ApiKeyManager';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  domain?: string;
  date?: string;
}

export interface GoogleSearchOptions {
  query: string;
  num?: number; // Number of results (1-100)
  location?: string;
  hl?: string; // Language
  gl?: string; // Country
  start?: number; // Starting position for pagination
}

export interface GoogleSearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  query: string;
}

export class GoogleSearchService {
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search';

  constructor(apiKey?: string) {
    // Use provided key or get from API Key Manager with fallback support
    this.apiKey = apiKey || apiKeyManager.getApiKey('SERPAPI_KEY') || '';
    
    if (!this.apiKey || !apiKeyManager.validateApiKey('SERPAPI_KEY', this.apiKey)) {
      console.warn('GoogleSearchService: No valid SerpAPI key provided.');
      console.warn('Please add SERPAPI_KEY to your .env file or configure an alternative search service.');
      
      // Check for alternative search services
      const alternatives = apiKeyManager.getBestSearchService();
      if (alternatives && alternatives !== 'SERPAPI_KEY') {
        console.log(`Alternative search service available: ${alternatives}`);
      }
      
      this.apiKey = '';
    }
  }

  async search(options: GoogleSearchOptions): Promise<GoogleSearchResponse> {
    const startTime = Date.now();
    
    if (!this.apiKey) {
      throw new Error('❌ SERPAPI_KEY not configured. Please add your SerpAPI key to .env file or use a different search service.');
    }

    try {
      console.log(`🔍 SerpAPI Search: "${options.query}"`);
      
      const params = {
        engine: 'google',
        q: options.query,
        api_key: this.apiKey,
        num: options.num || 10,
        hl: options.hl || 'en',
        gl: options.gl || 'us',
        start: options.start || 0,
        ...(options.location && { location: options.location })
      };

      const response = await axios.get(this.baseUrl, { params });
      const data = response.data;

      if (data.error) {
        throw new Error(`SerpAPI Error: ${data.error}`);
      }

      const results: SearchResult[] = (data.organic_results || []).map((result: any, index: number) => ({
        title: result.title || '',
        link: result.link || '',
        snippet: result.snippet || '',
        position: (options.start || 0) + index + 1,
        domain: this.extractDomain(result.link),
        date: result.date
      }));

      console.log(`✅ SerpAPI found ${results.length} results`);

      return {
        results,
        totalResults: data.search_information?.total_results || results.length,
        searchTime: Date.now() - startTime,
        query: options.query
      };

    } catch (error: any) {
      console.error('❌ SerpAPI Search failed:', error.message);
      
      if (error.response?.status === 401) {
        throw new Error('❌ Invalid SERPAPI_KEY. Please check your SerpAPI credentials in .env file.');
      } else if (error.response?.status === 429) {
        throw new Error('❌ SerpAPI rate limit exceeded. Please upgrade your plan or try again later.');
      } else if (error.response?.status === 403) {
        throw new Error('❌ SerpAPI access denied. Please check your API key permissions.');
      } else {
        throw new Error(`❌ SerpAPI Search failed: ${error.message}`);
      }
    }
  }

  async searchMultipleQueries(queries: string[], options: Omit<GoogleSearchOptions, 'query'> = {}): Promise<GoogleSearchResponse[]> {
    const results = await Promise.allSettled(
      queries.map(query => this.search({ ...options, query }))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Search failed for query "${queries[index]}":`, result.reason);
        return {
          results: [],
          totalResults: 0,
          searchTime: 0,
          query: queries[index]
        };
      }
    });
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      await this.search({ query: 'test', num: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // Search specifically for art opportunities
  async searchArtOpportunities(query: string, options: Partial<GoogleSearchOptions> = {}): Promise<GoogleSearchResponse> {
    const artQuery = `${query} art opportunity grant exhibition residency call artists`;
    
    return this.search({
      query: artQuery,
      num: 20,
      ...options
    });
  }

  // Filter results for art-related content
  filterArtResults(results: SearchResult[]): SearchResult[] {
    const artKeywords = [
      'art', 'artist', 'exhibition', 'gallery', 'museum', 'grant', 'residency',
      'competition', 'award', 'fellowship', 'call', 'opportunity', 'curator',
      'painting', 'sculpture', 'photography', 'drawing', 'ceramics', 'printmaking',
      'digital art', 'contemporary', 'fine art', 'visual art'
    ];

    return results.filter(result => {
      const text = `${result.title} ${result.snippet}`.toLowerCase();
      return artKeywords.some(keyword => text.includes(keyword));
    });
  }

  // Generate mock search results for development
  private generateMockResults(options: GoogleSearchOptions, startTime: number): GoogleSearchResponse {
    const mockResults: SearchResult[] = [];
    const resultCount = Math.min(options.num || 10, 20);

    const artOpportunityTemplates = [
      {
        title: 'Art Grant Opportunity - [QUERY] Foundation',
        domain: 'artfoundation.org',
        snippet: 'Apply for grants supporting contemporary artists working in [QUERY]. Funding available up to $25,000 for emerging and mid-career artists.'
      },
      {
        title: 'Open Call: [QUERY] Exhibition 2025',
        domain: 'gallery-space.com', 
        snippet: 'International exhibition seeking [QUERY] artists. Application deadline approaching. Cash prizes and catalog publication for selected artists.'
      },
      {
        title: '[QUERY] Artist Residency Program',
        domain: 'residency.art',
        snippet: 'Three-month residency program for artists working in [QUERY]. Includes studio space, stipend, and exhibition opportunity.'
      },
      {
        title: 'Call for Artists - [QUERY] Community Project',
        domain: 'public-art.org',
        snippet: 'Public art commission seeking [QUERY] proposals. $50,000 budget for community-based art installation.'
      },
      {
        title: '[QUERY] Art Competition - Submit Now',
        domain: 'art-competitions.net',
        snippet: 'Annual [QUERY] competition with $10,000 first prize. Professional development opportunities for finalists.'
      }
    ];

    for (let i = 0; i < resultCount; i++) {
      const template = artOpportunityTemplates[i % artOpportunityTemplates.length];
      mockResults.push({
        title: template.title.replace(/\[QUERY\]/g, options.query),
        link: `https://${template.domain}/opportunity-${i + 1}`,
        snippet: template.snippet.replace(/\[QUERY\]/g, options.query),
        position: i + 1,
        domain: template.domain,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Random date within last 30 days
      });
    }

    return {
      results: mockResults,
      totalResults: resultCount * 10, // Simulate larger result pool
      searchTime: Date.now() - startTime,
      query: options.query
    };
  }
}

export const googleSearchService = new GoogleSearchService();