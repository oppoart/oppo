import { ProviderQuota } from './common';

/**
 * Search Provider Interface
 *
 * For web search and social media search functionality.
 *
 * @example
 * const provider = new SerperAdapter(apiKey);
 * const response = await provider.search('artist grant opportunities 2024', {
 *   maxResults: 100,
 *   dateRestrict: 'past_month',
 * });
 */

export interface SearchOptions {
  maxResults?: number;
  location?: string;
  language?: string;
  dateRestrict?: 'past_day' | 'past_week' | 'past_month' | 'past_year';
  domainFilter?: string[];
  excludeDomains?: string[];
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedDate?: Date;
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  query: string;
  provider: string;
  cost?: number;
  latency: number;
  metadata?: Record<string, any>;
}

export interface ISearchProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * Daily/monthly quota limit (if applicable)
   */
  readonly quotaLimit?: number;

  /**
   * Cost per query in USD (if applicable)
   */
  readonly costPerQuery?: number;

  /**
   * Search for content
   *
   * @param query - The search query
   * @param options - Search options (results limit, location, etc.)
   * @returns Search results with metadata
   */
  search(query: string, options?: SearchOptions): Promise<SearchResponse>;

  /**
   * Check if provider is properly configured with API keys
   */
  isConfigured(): boolean;

  /**
   * Get current quota/rate limit information
   */
  getQuota(): Promise<ProviderQuota>;
}
