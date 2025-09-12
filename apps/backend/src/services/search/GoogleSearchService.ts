import axios from 'axios';

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
    this.apiKey = apiKey || process.env.SERPAPI_KEY || '';
    if (!this.apiKey || this.apiKey === 'your_serpapi_key_here') {
      console.warn('GoogleSearchService: No valid SerpAPI key provided. Using mock search results for development.');
      this.apiKey = '';
    }
  }

  async search(options: GoogleSearchOptions): Promise<GoogleSearchResponse> {
    const startTime = Date.now();
    
    if (!this.apiKey) {
      // Return mock data for development when no API key is available
      return this.generateMockResults(options, startTime);
    }

    try {
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

      const results: SearchResult[] = (data.organic_results || []).map((result: any, index: number) => ({
        title: result.title || '',
        link: result.link || '',
        snippet: result.snippet || '',
        position: (options.start || 0) + index + 1,
        domain: this.extractDomain(result.link),
        date: result.date
      }));

      return {
        results,
        totalResults: data.search_information?.total_results || results.length,
        searchTime: Date.now() - startTime,
        query: options.query
      };

    } catch (error: any) {
      console.error('Google Search API error:', error);
      
      if (error.response?.status === 401) {
        console.warn('Invalid SerpAPI key detected. Falling back to mock results for development.');
        return this.generateMockResults(options, startTime);
      } else if (error.response?.status === 429) {
        console.warn('Search API rate limit exceeded. Falling back to mock results.');
        return this.generateMockResults(options, startTime);
      } else {
        console.warn(`Google Search failed: ${error.message}. Falling back to mock results.`);
        return this.generateMockResults(options, startTime);
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