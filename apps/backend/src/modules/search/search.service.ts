import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ProviderManager, UseCase, DiscoveryPattern } from '@oppo/provider-manager';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  domain?: string;
  date?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  query: string;
}

export interface SearchOptions {
  num?: number;
  location?: string;
  hl?: string;
  gl?: string;
  start?: number;
}

export class SearchQuotaExceededError extends Error {
  constructor(message: string = 'Google Search API quota exceeded. Please try again later.') {
    super(message);
    this.name = 'SearchQuotaExceededError';
  }
}

export class SearchCredentialsError extends Error {
  constructor(message: string = 'Search API credentials are not configured.') {
    super(message);
    this.name = 'SearchCredentialsError';
  }
}

export class SerperSearchError extends Error {
  constructor(message: string = 'Serper.dev API error occurred.') {
    super(message);
    this.name = 'SerperSearchError';
  }
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private providerManager: ProviderManager;

  constructor(private readonly configService: ConfigService) {
    // Initialize ProviderManager with config from environment
    this.providerManager = new ProviderManager({
      openai: {
        apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        defaultModel: this.configService.get<string>('AI_MODEL_PRIMARY') || 'gpt-4',
      },
      anthropic: {
        apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
      },
      serper: {
        apiKey: this.configService.get<string>('SERPER_API_KEY'),
      },
      google: {
        apiKey: this.configService.get<string>('GOOGLE_SEARCH_API_KEY'),
        searchEngineId: this.configService.get<string>('GOOGLE_SEARCH_ENGINE_ID'),
      },
    });
  }

  async searchArtOpportunities(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();

    // Clean up query - remove extra quotes that might be sent from frontend
    const cleanQuery = query.replace(/^"(.*)"$/, '$1').replace(/^""(.*)""$/, '$1');
    this.logger.log(`🧹 Original query: "${query}" -> Cleaned query: "${cleanQuery}"`);

    try {
      // Use ProviderManager with discovery pattern to search multiple providers in parallel
      this.logger.log(`🚀 Searching with ProviderManager (Discovery Pattern: Serper + Google)`);

      const searchResponse = await this.providerManager.searchMultiple(
        cleanQuery,
        UseCase.WEB_SEARCH,
        {
          pattern: DiscoveryPattern.PARALLEL,
          targetProviders: ['serper', 'google'],
          minSuccessful: 1, // At least one provider should succeed
          maxResults: options.num || 100,
        }
      );

      const searchTime = Date.now() - startTime;

      // Transform ProviderManager results to SearchResponse format
      const results: SearchResult[] = searchResponse.results.map((item, index) => ({
        title: item.title || 'No title',
        link: item.url || '',
        snippet: item.description || 'No description available',
        position: index + 1,
        domain: this.extractDomain(item.url),
        date: item.publishedDate || new Date().toISOString().split('T')[0],
      }));

      this.logger.log(
        `✅ Search completed in ${searchTime}ms - found ${results.length} results from ${searchResponse.providersUsed.join(', ')}`
      );

      return {
        results,
        totalResults: results.length,
        searchTime,
        query: cleanQuery,
      };
    } catch (error) {
      this.logger.error(`❌ ProviderManager search failed: ${error.message}`);

      // If ProviderManager fails, throw appropriate error
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new SearchQuotaExceededError(error.message);
      }

      if (error.message.includes('credentials') || error.message.includes('unauthorized')) {
        throw new SearchCredentialsError(error.message);
      }

      throw new Error(`Search failed: ${error.message}`);
    }
  }

  private async searchWithSerper(query: string, options: SearchOptions, startTime: number): Promise<SearchResponse> {
    // Get Serper API key with multiple fallbacks
    const serperApiKey = this.configService.get<string>('SERPER_API_KEY') || 
                        this.configService.get<string>('SERPER_DEV_API_KEY') ||
                        process.env.SERPER_API_KEY || 
                        process.env.SERPER_DEV_API_KEY;
                        
    if (!serperApiKey) {
      throw new SerperSearchError('Serper.dev API key is not configured');
    }

    this.logger.log(`✅ Using Serper.dev API (No daily quota limits)`);
    
    const requestedResults = options.num || 100;
    
    this.logger.log(`🔍 Searching with Serper.dev API: "${query}" (${requestedResults} results)`);

    try {
      const response = await axios.post('https://google.serper.dev/search', {
        q: query,
        num: Math.min(requestedResults, 100), // Serper.dev max is 100 per request
        hl: options.hl || 'en',
        gl: options.gl || 'us',
        location: options.location || undefined
      }, {
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      this.logger.log(`🔍 Serper API Response Status: ${response.status}`);
      this.logger.log(`🔍 Response has organic results: ${!!response.data?.organic}, Count: ${response.data?.organic?.length || 0}`);
      
      if (response.data?.error) {
        const error = response.data.error;
        this.logger.error(`❌ Serper API Error: ${JSON.stringify(error)}`);
        throw new SerperSearchError(`Serper.dev API error: ${error}`);
      }
      
      const results = this.parseSerperSearchResults(response.data);
      const searchTime = Date.now() - startTime;
      
      if (results.length === 0) {
        this.logger.warn(`No search results found from Serper.dev for query: "${query}"`);
        return {
          results: [],
          totalResults: 0,
          searchTime,
          query
        };
      }
      
      this.logger.log(`Serper search completed for query: "${query}" in ${searchTime}ms - found ${results.length} results`);
      
      return {
        results,
        totalResults: response.data?.searchInformation?.totalResults ? parseInt(response.data.searchInformation.totalResults) : results.length,
        searchTime,
        query
      };
      
    } catch (error) {
      if (error.response?.status === 429) {
        throw new SearchQuotaExceededError('Serper.dev API rate limit exceeded. Please try again later.');
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new SearchCredentialsError('Serper.dev API key is invalid or unauthorized.');
      }
      
      this.logger.error(`Serper.dev API request failed:`, error.message);
      throw new SerperSearchError(`Serper.dev request failed: ${error.message}`);
    }
  }

  private async searchWithGoogle(query: string, options: SearchOptions, startTime: number): Promise<SearchResponse> {
    try {
      // Try multiple ways to get the credentials
      const googleApiKey = this.configService.get<string>('GOOGLE_SEARCH_API_KEY') || 
                           this.configService.get<string>('GOOGLE_CUSTOM_SEARCH_API_KEY') ||
                           process.env.GOOGLE_SEARCH_API_KEY || 
                           process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
                           
      const searchEngineId = this.configService.get<string>('GOOGLE_SEARCH_ENGINE_ID') ||
                            process.env.GOOGLE_SEARCH_ENGINE_ID;
      
      if (!googleApiKey || !searchEngineId) {
        this.logger.error(`❌ Google Custom Search API credentials missing! API Key: ${!!googleApiKey}, Engine ID: ${!!searchEngineId}`);
        throw new SearchCredentialsError('Google Search API is not properly configured. Please contact support.');
      }

      this.logger.log(`✅ Using Google Custom Search API (Daily quota: 100 queries)`);
      
      const requestedResults = options.num || 100;
      const results: SearchResult[] = [];
      const maxResultsPerRequest = 10; // Google Custom Search API limit
      const totalRequests = Math.min(Math.ceil(requestedResults / maxResultsPerRequest), 10); // Max 10 requests (100 results)
      
      this.logger.log(`🔍 Searching with Google Custom Search API: "${query}" (${requestedResults} results via ${totalRequests} requests)`);

      // Make multiple requests to get more results
      for (let page = 0; page < totalRequests; page++) {
        const start = (page * maxResultsPerRequest) + 1; // Google uses 1-based indexing
        const remainingResults = requestedResults - results.length;
        const currentPageSize = Math.min(maxResultsPerRequest, remainingResults);

        const searchParams = {
          key: googleApiKey,
          cx: searchEngineId,
          q: query,
          num: currentPageSize,
          hl: options.hl || 'en',
          gl: options.gl || 'us',
          start: start
        };

        try {
          const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: searchParams,
            timeout: 10000 // 10 second timeout
          });

          // Log API response details for debugging
          this.logger.log(`🔍 API Response Status: ${response.status}`);
          this.logger.log(`🔍 Response has items: ${!!response.data?.items}, Count: ${response.data?.items?.length || 0}`);
          this.logger.log(`🔍 Search params sent: ${JSON.stringify(searchParams)}`);
          
          // Handle API errors (Google returns 200 status with error in body)
          if (response.data?.error) {
            const error = response.data.error;
            this.logger.error(`❌ Google API Error: ${JSON.stringify(error)}`);
            
            // Handle quota exceeded specifically
            if (error.code === 429 || error.message?.includes('Quota exceeded')) {
              this.logger.error(`🚫 Google Custom Search API quota exceeded (${error.message})`);
              this.logger.error(`   Daily limit: 100 queries per day`);
              throw new SearchQuotaExceededError('Search quota exceeded. Please try again later or contact support to increase your quota.');
            }
            
            // Handle other API errors
            this.logger.error(`🚫 Google API error (${error.code}): ${error.message}`);
            break; // Exit pagination loop on any API error
          }
          
          if (response.data?.searchInformation?.totalResults === "0") {
            this.logger.warn(`⚠️  Google returned 0 total results for query: "${query}"`);
          }

          const pageResults = this.parseGoogleSearchResults(response.data);
          results.push(...pageResults);
          
          // Stop if we got fewer results than requested (no more results available)
          if (pageResults.length < currentPageSize) {
            break;
          }
          
          // Small delay between requests to be respectful to the API
          if (page < totalRequests - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          this.logger.error(`Failed to fetch page ${page + 1} of search results:`, error.message);
          // If it's a quota exceeded error, propagate it immediately
          if (error instanceof SearchQuotaExceededError) {
            throw error;
          }
          break; // Stop pagination on other errors
        }
      }

      const searchTime = Date.now() - startTime;
      
      // If no results, return empty response instead of mock results
      if (results.length === 0) {
        this.logger.warn(`No search results found for query: "${query}"`);
        const searchTime = Date.now() - startTime;
        return {
          results: [],
          totalResults: 0,
          searchTime,
          query
        };
      }
      
      this.logger.log(`Search completed for query: "${query}" in ${searchTime}ms - found ${results.length} results`);
      
      return {
        results,
        totalResults: results.length, // Use actual results count since we paginated
        searchTime,
        query
      };
    } catch (error) {
      this.logger.error(`Google Custom Search API failed for query: "${query}"`, error);
      
      // If it's a known error type, rethrow it
      if (error instanceof SearchQuotaExceededError || error instanceof SearchCredentialsError) {
        throw error;
      }
      
      // For other errors, throw a generic search error
      throw new Error(`Search failed: ${error.message || 'Unknown error occurred'}`);
    }
  }

  private parseSerperSearchResults(response: any): SearchResult[] {
    const results: SearchResult[] = [];
    
    if (response.organic && Array.isArray(response.organic)) {
      response.organic.forEach((item: any, index: number) => {
        results.push({
          title: item.title || 'No title',
          link: item.link || '',
          snippet: item.snippet || 'No description available',
          position: item.position || index + 1,
          domain: this.extractDomain(item.link),
          date: item.date || new Date().toISOString().split('T')[0]
        });
      });
    }

    return results;
  }


  private parseGoogleSearchResults(response: any): SearchResult[] {
    const results: SearchResult[] = [];
    
    if (response.items) {
      response.items.forEach((item: any, index: number) => {
        results.push({
          title: item.title || 'No title',
          link: item.link || '',
          snippet: item.snippet || 'No description available',
          position: index + 1,
          domain: this.extractDomain(item.link),
          date: item.pagemap?.metatags?.[0]?.['article:published_time'] || 
                item.pagemap?.metatags?.[0]?.['article:modified_time'] ||
                new Date().toISOString().split('T')[0]
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
