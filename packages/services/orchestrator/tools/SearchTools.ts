import { Tool } from '../types';

export class SearchTools {
  private apiKeys: {
    google?: string;
    bing?: string;
    serp?: string;
  };

  constructor(apiKeys: { google?: string; bing?: string; serp?: string } = {}) {
    this.apiKeys = apiKeys;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'search_web',
        description: 'Searches the web for information using search APIs',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: 'Search query string',
            required: true
          },
          {
            name: 'count',
            type: 'number',
            description: 'Number of results to return',
            required: false,
            default: 10
          },
          {
            name: 'type',
            type: 'string',
            description: 'Type of search (web, news, images)',
            required: false,
            default: 'web'
          }
        ],
        handler: async (params) => {
          const query = params.query;
          const count = Math.min(params.count || 10, 20); // Limit to 20
          const type = params.type || 'web';

          try {
            // Try different search providers in order of preference
            if (this.apiKeys.google) {
              return await this.searchGoogle(query, count, type);
            } else if (this.apiKeys.bing) {
              return await this.searchBing(query, count, type);
            } else if (this.apiKeys.serp) {
              return await this.searchSERP(query, count, type);
            } else {
              // Fallback to mock results
              return this.getMockSearchResults(query, count);
            }
          } catch (error) {
            console.error('Web search failed:', error);
            return {
              results: [],
              count: 0,
              query,
              error: 'Search service temporarily unavailable',
              summary: 'Unable to perform web search at this time'
            };
          }
        }
      },

      {
        name: 'search_art_opportunities',
        description: 'Searches specifically for art opportunities using targeted queries',
        parameters: [
          {
            name: 'medium',
            type: 'string',
            description: 'Artistic medium (painting, sculpture, digital, etc.)',
            required: false
          },
          {
            name: 'type',
            type: 'string',
            description: 'Opportunity type (grant, residency, exhibition, etc.)',
            required: false
          },
          {
            name: 'location',
            type: 'string',
            description: 'Geographic location or region',
            required: false
          },
          {
            name: 'deadline_months',
            type: 'number',
            description: 'Deadline within this many months',
            required: false,
            default: 6
          }
        ],
        handler: async (params) => {
          const medium = params.medium || '';
          const type = params.type || '';
          const location = params.location || '';
          const deadlineMonths = params.deadline_months || 6;

          // Build targeted search query
          let query = 'art opportunities';
          if (medium) query += ` ${medium}`;
          if (type) query += ` ${type}`;
          if (location) query += ` ${location}`;
          query += ` deadline 2024 2025`;

          // Add common art opportunity keywords
          const artQueries = [
            `${query} artists apply`,
            `${query} grants funding`,
            `${query} call for artists`,
            `${query} submissions open`
          ];

          const allResults = [];
          for (const artQuery of artQueries.slice(0, 2)) { // Limit to 2 queries
            try {
              const results = await this.performSearch(artQuery, 5);
              if (results && results.results) {
                allResults.push(...results.results);
              }
            } catch (error) {
              console.warn(`Art search failed for query: ${artQuery}`, error);
            }
          }

          // Deduplicate by URL
          const uniqueResults = this.deduplicateResults(allResults);

          return {
            results: uniqueResults.slice(0, 15), // Limit final results
            count: uniqueResults.length,
            originalQuery: query,
            parameters: { medium, type, location, deadlineMonths },
            summary: `Found ${uniqueResults.length} potential art opportunities`
          };
        }
      },

      {
        name: 'fetch_source_updates',
        description: 'Checks configured sources for new opportunities',
        parameters: [
          {
            name: 'sources',
            type: 'array',
            description: 'Array of source URLs to check',
            required: false
          },
          {
            name: 'hours_since',
            type: 'number',
            description: 'Only check for updates within this many hours',
            required: false,
            default: 24
          }
        ],
        handler: async (params) => {
          const sources = params.sources || this.getDefaultArtSources();
          const hoursSince = params.hours_since || 24;

          const sourceResults = [];
          for (const source of sources.slice(0, 5)) { // Limit to 5 sources
            try {
              const result = await this.checkSourceUpdates(source, hoursSince);
              sourceResults.push(result);
            } catch (error) {
              console.warn(`Failed to check source: ${source}`, error);
              sourceResults.push({
                source,
                success: false,
                error: (error as Error).message,
                opportunities: []
              });
            }
          }

          const totalOpportunities = sourceResults.reduce(
            (sum, result) => sum + (result.opportunities?.length || 0), 0
          );

          return {
            sources: sourceResults,
            totalSources: sourceResults.length,
            totalOpportunities,
            timeframe: `Last ${hoursSince} hours`,
            summary: `Checked ${sourceResults.length} sources, found ${totalOpportunities} new opportunities`
          };
        }
      },

      {
        name: 'get_trending_topics',
        description: 'Gets trending topics related to art and opportunities',
        parameters: [
          {
            name: 'category',
            type: 'string',
            description: 'Category to focus on (art, grants, exhibitions, etc.)',
            required: false,
            default: 'art'
          }
        ],
        handler: async (params) => {
          const category = params.category || 'art';

          // Get trending topics (mock implementation)
          const trendingQueries = [
            `${category} trending topics`,
            `${category} news this week`,
            `${category} opportunities 2024`,
            `emerging ${category} trends`
          ];

          const trends = [];
          for (const trendQuery of trendingQueries.slice(0, 2)) {
            try {
              const results = await this.performSearch(trendQuery, 3);
              if (results && results.results) {
                trends.push(...results.results.map((result: any) => ({
                  title: result.title,
                  url: result.url,
                  snippet: result.snippet,
                  relevance: this.calculateRelevance(result, category)
                })));
              }
            } catch (error) {
              console.warn(`Trending search failed: ${trendQuery}`, error);
            }
          }

          // Sort by relevance
          trends.sort((a, b) => b.relevance - a.relevance);

          return {
            trends: trends.slice(0, 10),
            category,
            count: trends.length,
            summary: `Found ${trends.length} trending topics in ${category}`
          };
        }
      }
    ];
  }

  // Private Methods

  private async performSearch(query: string, count: number): Promise<any> {
    if (this.apiKeys.google) {
      return await this.searchGoogle(query, count);
    } else if (this.apiKeys.bing) {
      return await this.searchBing(query, count);
    } else {
      return this.getMockSearchResults(query, count);
    }
  }

  private async searchGoogle(query: string, count: number, type: string = 'web'): Promise<any> {
    if (!this.apiKeys.google) {
      throw new Error('Google API key not configured');
    }

    const endpoint = 'https://www.googleapis.com/customsearch/v1';
    const params = new URLSearchParams({
      key: this.apiKeys.google,
      cx: process.env.GOOGLE_CSE_ID || 'your-cse-id',
      q: query,
      num: Math.min(count, 10).toString(),
      safe: 'active'
    });

    const response = await fetch(`${endpoint}?${params}`);
    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status}`);
    }

    const data = await response.json();
    const results = (data.items || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      displayUrl: item.displayLink
    }));

    return {
      results,
      count: results.length,
      query,
      source: 'Google',
      summary: `Found ${results.length} results from Google`
    };
  }

  private async searchBing(query: string, count: number, type: string = 'web'): Promise<any> {
    if (!this.apiKeys.bing) {
      throw new Error('Bing API key not configured');
    }

    const endpoint = 'https://api.bing.microsoft.com/v7.0/search';
    const headers = {
      'Ocp-Apim-Subscription-Key': this.apiKeys.bing
    };

    const params = new URLSearchParams({
      q: query,
      count: Math.min(count, 20).toString(),
      safeSearch: 'Moderate'
    });

    const response = await fetch(`${endpoint}?${params}`, { headers });
    if (!response.ok) {
      throw new Error(`Bing Search API error: ${response.status}`);
    }

    const data = await response.json();
    const results = (data.webPages?.value || []).map((item: any) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      displayUrl: item.displayUrl
    }));

    return {
      results,
      count: results.length,
      query,
      source: 'Bing',
      summary: `Found ${results.length} results from Bing`
    };
  }

  private async searchSERP(query: string, count: number, type: string = 'web'): Promise<any> {
    if (!this.apiKeys.serp) {
      throw new Error('SERP API key not configured');
    }

    const endpoint = 'https://serpapi.com/search';
    const params = new URLSearchParams({
      api_key: this.apiKeys.serp,
      engine: 'google',
      q: query,
      num: Math.min(count, 20).toString(),
      safe: 'active'
    });

    const response = await fetch(`${endpoint}?${params}`);
    if (!response.ok) {
      throw new Error(`SERP API error: ${response.status}`);
    }

    const data = await response.json();
    const results = (data.organic_results || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      displayUrl: item.displayed_link
    }));

    return {
      results,
      count: results.length,
      query,
      source: 'SERP',
      summary: `Found ${results.length} results from SERP`
    };
  }

  private getMockSearchResults(query: string, count: number): any {
    // Mock search results for testing/fallback
    const mockResults = [
      {
        title: `Art Opportunities Related to "${query}"`,
        url: 'https://example.com/art-opportunities',
        snippet: 'Discover various art opportunities including grants, residencies, and exhibitions.',
        displayUrl: 'example.com'
      },
      {
        title: `Grants and Funding for "${query}"`,
        url: 'https://example.com/grants',
        snippet: 'Find funding opportunities for artists and creative professionals.',
        displayUrl: 'example.com'
      },
      {
        title: `Artist Residencies - "${query}"`,
        url: 'https://example.com/residencies', 
        snippet: 'Explore artist residency programs worldwide.',
        displayUrl: 'example.com'
      }
    ];

    return {
      results: mockResults.slice(0, count),
      count: Math.min(mockResults.length, count),
      query,
      source: 'Mock',
      summary: `Generated ${Math.min(mockResults.length, count)} mock results`
    };
  }

  private deduplicateResults(results: any[]): any[] {
    const seen = new Set();
    return results.filter(result => {
      if (seen.has(result.url)) {
        return false;
      }
      seen.add(result.url);
      return true;
    });
  }

  private getDefaultArtSources(): string[] {
    return [
      'https://www.nyfa.org',
      'https://www.foundationcenter.org', 
      'https://www.artistcommunities.org',
      'https://www.callforentry.org',
      'https://www.artdeadlineslist.com'
    ];
  }

  private async checkSourceUpdates(source: string, hours: number): Promise<any> {
    // Mock implementation - in production, would scrape/check RSS feeds
    return {
      source,
      success: true,
      lastChecked: new Date(),
      opportunities: [
        {
          title: `New opportunity from ${source}`,
          url: `${source}/opportunity-1`,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          discovered: new Date()
        }
      ],
      summary: `Found 1 new opportunity at ${source}`
    };
  }

  private calculateRelevance(result: any, category: string): number {
    let relevance = 50; // Base score

    if (result.title?.toLowerCase().includes(category.toLowerCase())) {
      relevance += 30;
    }

    if (result.snippet?.toLowerCase().includes(category.toLowerCase())) {
      relevance += 20;
    }

    // Boost for art-related domains
    const artDomains = ['.org', 'foundation', 'museum', 'gallery', 'arts'];
    if (artDomains.some(domain => result.url?.includes(domain))) {
      relevance += 15;
    }

    return Math.min(relevance, 100);
  }
}