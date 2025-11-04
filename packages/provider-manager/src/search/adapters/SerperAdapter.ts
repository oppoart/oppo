/**
 * Serper.dev Search Adapter
 *
 * Implements web search using Serper.dev Google Search API
 * Advantages: No daily quota limits, reliable, fast
 */

import axios, { AxiosInstance } from 'axios';
import {
  ISearchProvider,
  SearchOptions,
  SearchResponse,
  SearchResult,
  ProviderQuota,
} from '../../core/ports';
import { PROVIDER_PRICING } from '../../config';

export interface SerperConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

export class SerperAdapter implements ISearchProvider {
  readonly name = 'serper';
  readonly quotaLimit = undefined; // No daily limit
  readonly costPerQuery = PROVIDER_PRICING.serper.search;

  private client: AxiosInstance;
  private config: SerperConfig;
  private requestCount: number = 0;

  constructor(config: SerperConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL || 'https://google.serper.dev',
      timeout: config.timeout || 15000,
      headers: {
        'X-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();

    // Clean query
    const cleanQuery = query.replace(/^"(.*)"$/, '$1').replace(/^""(.*)""$/, '$1');

    const maxResults = Math.min(options?.maxResults || 10, 100); // Serper max is 100

    try {
      const response = await this.client.post('/search', {
        q: cleanQuery,
        num: maxResults,
        hl: options?.language || 'en',
        gl: options?.location || 'us',
        location: options?.location,
      });

      this.requestCount++;

      const results = this.parseResults(response.data);
      const latency = Date.now() - startTime;

      return {
        results,
        totalResults: response.data.searchInformation?.totalResults
          ? parseInt(response.data.searchInformation.totalResults)
          : results.length,
        query: cleanQuery,
        provider: this.name,
        cost: this.costPerQuery,
        latency,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('Serper.dev API rate limit exceeded');
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Serper.dev API key is invalid or unauthorized');
        }
      }

      throw new Error(`Serper search failed: ${(error as Error).message}`);
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey !== '';
  }

  async getQuota(): Promise<ProviderQuota> {
    // Serper doesn't have quota limits, but we track requests
    return {
      remaining: -1, // Unlimited
      limit: -1,
      resetsAt: null,
    };
  }

  /**
   * Get number of requests made
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Reset request counter
   */
  resetRequestCount(): void {
    this.requestCount = 0;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private parseResults(data: any): SearchResult[] {
    const results: SearchResult[] = [];

    if (data.organic && Array.isArray(data.organic)) {
      data.organic.forEach((item: any, index: number) => {
        results.push({
          title: item.title || 'No title',
          url: item.link || '',
          snippet: item.snippet || 'No description available',
          domain: this.extractDomain(item.link),
          publishedDate: item.date ? new Date(item.date) : undefined,
          relevanceScore: item.position ? 1 - (item.position / 100) : undefined,
        });
      });
    }

    return results;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }
}
