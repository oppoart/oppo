import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { DataExtractor, RawData } from '../../processors/DataExtractor';
import { DataCleaner } from '../../processors/DataCleaner';

/**
 * Google Custom Search API configuration
 */
interface GoogleSearchConfig {
  apiKey: string;
  cx: string; // Custom Search Engine ID
  searchTerms: string[];
  maxResultsPerQuery: number;
  dailyQuotaLimit: number;
  costPerQuery: number; // In USD
  language: string;
  country: string;
  dateRestrict: string; // e.g., 'd7' for last 7 days
  fileType?: string;
  excludeTerms: string[];
}

/**
 * Google Search result structure
 */
interface GoogleSearchResult {
  title: string;
  snippet: string;
  link: string;
  displayLink: string;
  formattedUrl: string;
  htmlTitle?: string;
  htmlSnippet?: string;
  cacheId?: string;
  pagemap?: {
    metatags?: Array<{
      [key: string]: string;
    }>;
    organization?: Array<{
      name?: string;
      url?: string;
    }>;
    event?: Array<{
      name?: string;
      startdate?: string;
      enddate?: string;
      location?: string;
    }>;
  };
}

/**
 * Google Custom Search API response
 */
interface GoogleSearchAPIResponse {
  kind: string;
  url: {
    type: string;
    template: string;
  };
  queries: {
    request: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
    }>;
    nextPage?: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
    }>;
  };
  context: {
    title: string;
  };
  searchInformation: {
    searchTime: number;
    formattedSearchTime: string;
    totalResults: string;
    formattedTotalResults: string;
  };
  items?: GoogleSearchResult[];
}

/**
 * Google Search discoverer for art opportunities
 * Uses Google Custom Search API for targeted opportunity discovery
 */
export class GoogleSearchDiscoverer extends BaseDiscoverer {
  private config: GoogleSearchConfig;
  private dataExtractor: DataExtractor;
  private dataCleaner: DataCleaner;
  private dailyQueryCount: number = 0;
  private dailyResetTime: number = 0;
  private totalCost: number = 0;

  constructor() {
    super('google-search', 'search', '1.0.0');
    
    this.config = {
      apiKey: process.env.GOOGLE_SEARCH_API_KEY || '',
      cx: process.env.GOOGLE_CX_ID || '',
      searchTerms: [
        'art grant opportunity 2025',
        'artist residency program',
        'art fellowship application',
        'creative funding opportunity',
        'art competition submission',
        'museum job opening',
        'gallery curator position',
        'arts administrator job',
        'nonprofit art opportunity',
        'public art commission',
        'art exhibition call',
        'creative writing grant',
        'visual arts scholarship',
        'performing arts opportunity',
        'digital arts grant'
      ],
      maxResultsPerQuery: 10,
      dailyQuotaLimit: 100, // Conservative limit
      costPerQuery: 0.005, // $5 per 1000 queries
      language: 'en',
      country: 'us',
      dateRestrict: 'd30', // Last 30 days
      excludeTerms: ['expired', 'closed', 'past', 'archive']
    };

    this.dataExtractor = new DataExtractor({
      enabled: true,
      timeout: 15000,
      extractImages: false,
      extractLinks: true
    });

    this.dataCleaner = new DataCleaner({
      enabled: true,
      maxTitleLength: 200,
      maxDescriptionLength: 3000
    });

    // Initialize daily reset
    this.resetDailyCountIfNeeded();
  }

  protected async onInitialize(): Promise<void> {
    console.log('Initializing Google Search discoverer...');
    
    // Validate API credentials
    if (!this.config.apiKey || !this.config.cx) {
      throw new Error('Google Search API key and Custom Search Engine ID are required');
    }

    // Test API connectivity
    await this.testAPIConnectivity();
    
    console.log('Google Search discoverer initialized successfully');
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      return await this.testAPIConnectivity();
    } catch (error) {
      console.error('Google Search health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 100;
    const searchTerms = context?.searchTerms || this.config.searchTerms;

    console.log(`Starting Google Search discovery for ${searchTerms.length} search terms`);

    try {
      // Check daily quota
      this.resetDailyCountIfNeeded();
      if (this.dailyQueryCount >= this.config.dailyQuotaLimit) {
        throw new Error(`Daily Google Search quota limit reached (${this.config.dailyQuotaLimit} queries)`);
      }

      // Process each search term
      for (const searchTerm of searchTerms) {
        if (opportunities.length >= maxResults) break;
        if (this.dailyQueryCount >= this.config.dailyQuotaLimit) break;

        console.log(`Searching Google for: "${searchTerm}"`);
        
        const searchResults = await this.performSearch(searchTerm);
        
        // Process search results
        for (const result of searchResults) {
          if (opportunities.length >= maxResults) break;
          
          const opportunity = await this.convertSearchResultToOpportunity(result, searchTerm);
          if (opportunity && this.isValidOpportunity(opportunity)) {
            opportunities.push(opportunity);
          }
        }

        // Rate limiting between searches
        await this.delay(1000);
      }

      console.log(`Google Search discovery completed: ${opportunities.length} opportunities found`);
      console.log(`Queries used: ${this.dailyQueryCount}/${this.config.dailyQuotaLimit}, Cost: $${this.totalCost.toFixed(4)}`);
      
      return opportunities;

    } catch (error) {
      console.error('Google Search discovery failed:', error);
      throw error;
    }
  }

  /**
   * Test API connectivity
   */
  private async testAPIConnectivity(): Promise<boolean> {
    try {
      const testQuery = 'test';
      const url = this.buildSearchURL(testQuery, 1, 1);
      
      const response = await fetch(url);
      
      if (response.status === 403) {
        throw new Error('Google Search API quota exceeded or invalid credentials');
      }
      
      if (!response.ok) {
        throw new Error(`Google Search API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Google Search API error: ${data.error.message}`);
      }

      return true;

    } catch (error) {
      console.error('Google Search API connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Perform a single search query
   */
  private async performSearch(query: string): Promise<GoogleSearchResult[]> {
    const results: GoogleSearchResult[] = [];
    let startIndex = 1;
    const maxResults = Math.min(this.config.maxResultsPerQuery, 50); // API limit is 100 per day by default

    try {
      while (results.length < maxResults && startIndex <= 50) { // Google API limits to 10 results per request, max 100 total
        // Check quota before making request
        if (this.dailyQueryCount >= this.config.dailyQuotaLimit) {
          console.warn('Daily quota limit reached, stopping search');
          break;
        }

        const url = this.buildSearchURL(query, startIndex, Math.min(10, maxResults - results.length));
        
        console.log(`Making Google Search API request: ${url.substring(0, 100)}...`);
        
        const response = await fetch(url);
        
        if (response.status === 429) {
          console.warn('Rate limit reached, waiting before retry');
          await this.delay(2000);
          continue;
        }

        if (!response.ok) {
          throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
        }

        const data: GoogleSearchAPIResponse = await response.json();
        
        // Update quota tracking
        this.dailyQueryCount++;
        this.totalCost += this.config.costPerQuery;

        if (!data.items || data.items.length === 0) {
          console.log('No more results available');
          break;
        }

        // Filter and add results
        const filteredResults = this.filterSearchResults(data.items, query);
        results.push(...filteredResults);
        
        startIndex += 10; // Google returns max 10 results per request
        
        // Rate limiting
        await this.delay(100);
      }

      console.log(`Found ${results.length} results for query: "${query}"`);
      return results;

    } catch (error) {
      console.error(`Search failed for query "${query}":`, error);
      return results;
    }
  }

  /**
   * Build Google Custom Search API URL
   */
  private buildSearchURL(query: string, start: number = 1, num: number = 10): string {
    const params = new URLSearchParams({
      key: this.config.apiKey,
      cx: this.config.cx,
      q: this.buildEnhancedQuery(query),
      start: start.toString(),
      num: Math.min(num, 10).toString(), // Max 10 per request
      lr: `lang_${this.config.language}`,
      gl: this.config.country,
      dateRestrict: this.config.dateRestrict,
      safe: 'active',
      filter: '1' // Enable duplicate filtering
    });

    if (this.config.fileType) {
      params.set('fileType', this.config.fileType);
    }

    return `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
  }

  /**
   * Build enhanced search query with operators
   */
  private buildEnhancedQuery(baseQuery: string): string {
    // Add opportunity-specific terms
    const opportunityTerms = [
      'opportunity', 'grant', 'fellowship', 'residency', 'competition',
      'submission', 'application', 'call', 'funding', 'award'
    ];

    // Exclude unwanted terms
    const excludeTerms = this.config.excludeTerms.map(term => `-${term}`).join(' ');
    
    // Build query with OR operators for opportunity terms
    const enhancedQuery = `${baseQuery} (${opportunityTerms.join(' OR ')}) ${excludeTerms}`;
    
    // Add site-specific searches for known art portals
    const artSites = [
      'site:artconnect.com',
      'site:callforentry.org',
      'site:submittable.com',
      'site:artrabbit.com',
      'site:artopportunities.arti.org',
      'site:culturework.com'
    ];

    return `(${enhancedQuery}) OR (${baseQuery} (${artSites.join(' OR ')}))`;
  }

  /**
   * Filter search results to remove irrelevant ones
   */
  private filterSearchResults(results: GoogleSearchResult[], query: string): GoogleSearchResult[] {
    return results.filter(result => {
      // Check for spam indicators
      const spamKeywords = ['buy', 'sale', 'discount', 'cheap', 'free download', 'click here'];
      const textToCheck = (result.title + ' ' + result.snippet).toLowerCase();
      
      const hasSpam = spamKeywords.some(keyword => textToCheck.includes(keyword));
      if (hasSpam) {
        console.log(`Filtered out spam result: ${result.title}`);
        return false;
      }

      // Check for expired/closed opportunities
      const expiredKeywords = ['expired', 'closed', 'deadline passed', 'no longer accepting'];
      const hasExpired = expiredKeywords.some(keyword => textToCheck.includes(keyword));
      if (hasExpired) {
        console.log(`Filtered out expired result: ${result.title}`);
        return false;
      }

      // Must contain opportunity-related keywords
      const opportunityKeywords = [
        'opportunity', 'grant', 'fellowship', 'residency', 'competition',
        'submission', 'application', 'call', 'funding', 'award', 'program',
        'scholarship', 'prize', 'contest'
      ];

      const hasOpportunityKeywords = opportunityKeywords.some(keyword => 
        textToCheck.includes(keyword)
      );

      if (!hasOpportunityKeywords) {
        console.log(`Filtered out non-opportunity result: ${result.title}`);
        return false;
      }

      return true;
    });
  }

  /**
   * Convert Google search result to opportunity
   */
  private async convertSearchResultToOpportunity(
    result: GoogleSearchResult, 
    searchTerm: string
  ): Promise<OpportunityData | null> {
    try {
      // Extract enhanced data from pagemap if available
      const pagemap = result.pagemap;
      let organization = '';
      let eventData = null;
      
      if (pagemap) {
        // Extract organization info
        if (pagemap.organization && pagemap.organization[0]) {
          organization = pagemap.organization[0].name || '';
        }
        
        // Extract event info
        if (pagemap.event && pagemap.event[0]) {
          eventData = pagemap.event[0];
        }
        
        // Extract from metatags
        if (pagemap.metatags && pagemap.metatags[0]) {
          const metatags = pagemap.metatags[0];
          if (!organization && metatags['og:site_name']) {
            organization = metatags['og:site_name'];
          }
        }
      }

      // Extract deadline from various sources
      let deadline: Date | undefined;
      if (eventData?.enddate) {
        deadline = new Date(eventData.enddate);
      }

      // Extract location
      let location = '';
      if (eventData?.location) {
        location = eventData.location;
      }

      // Extract amount/funding info from snippet
      const amount = this.extractAmount(result.snippet);

      // Extract tags from the search term and content
      const tags = this.extractTags(searchTerm, result.title, result.snippet);

      // Try to get more detailed information by fetching the page
      let enhancedDescription = result.snippet;
      try {
        const pageContent = await this.fetchPageContent(result.link);
        if (pageContent) {
          const extractedData = await this.dataExtractor.extract({
            content: pageContent,
            contentType: 'html',
            url: result.link,
            metadata: { source: 'google_search' }
          }, 'search');

          if (extractedData.success && extractedData.data) {
            const cleaned = await this.dataCleaner.clean(extractedData.data);
            if (cleaned.success && cleaned.data) {
              enhancedDescription = cleaned.data.description || result.snippet;
              if (!organization) {
                organization = cleaned.data.organization || '';
              }
              if (!deadline) {
                deadline = cleaned.data.deadline;
              }
              if (!location) {
                location = cleaned.data.location || '';
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch enhanced content for ${result.link}:`, error);
      }

      const opportunity: OpportunityData = {
        title: result.title,
        description: enhancedDescription,
        url: result.link,
        organization: organization || this.extractDomainName(result.displayLink),
        deadline: deadline,
        location: location,
        amount: amount,
        tags: [...tags, 'google-search', 'search-engine'],
        sourceType: 'search',
        status: 'new',
        processed: false,
        applied: false,
        starred: false,
        sourceMetadata: {
          searchEngine: 'google',
          searchTerm: searchTerm,
          displayLink: result.displayLink,
          formattedUrl: result.formattedUrl,
          snippet: result.snippet,
          cacheId: result.cacheId,
          pagemap: pagemap,
          discoveredAt: new Date().toISOString(),
          searchRank: 0, // Could be set based on result position
          searchScore: this.calculateRelevanceScore(result, searchTerm)
        }
      };

      return opportunity;

    } catch (error) {
      console.error('Failed to convert search result to opportunity:', error);
      return null;
    }
  }

  /**
   * Fetch page content for enhanced extraction
   */
  private async fetchPageContent(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return null;
      }

      return await response.text();

    } catch (error) {
      console.warn(`Failed to fetch page content: ${error}`);
      return null;
    }
  }

  /**
   * Extract amount/funding information
   */
  private extractAmount(text: string): string {
    const patterns = [
      /\$[\d,]+(?:\.\d{2})?(?:\s*(?:k|thousand|million))?/gi,
      /€[\d,]+(?:\.\d{2})?(?:\s*(?:k|thousand|million))?/gi,
      /£[\d,]+(?:\.\d{2})?(?:\s*(?:k|thousand|million))?/gi,
      /(?:up to|maximum|max|prize|award|funding)[:\s]+\$?[\d,]+/gi,
      /[\d,]+\s*(?:dollars|USD|EUR|GBP)/gi
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        return match[0].trim();
      }
    }

    return '';
  }

  /**
   * Extract relevant tags
   */
  private extractTags(searchTerm: string, title: string, snippet: string): string[] {
    const tags = new Set<string>();
    
    // Add search term as tag
    tags.add(searchTerm.toLowerCase().replace(/\s+/g, '-'));
    
    // Extract category tags
    const categoryKeywords = {
      'visual-arts': ['painting', 'sculpture', 'photography', 'visual'],
      'performing-arts': ['theater', 'dance', 'performance', 'music'],
      'digital-arts': ['digital', 'media', 'video', 'interactive'],
      'writing': ['writing', 'literature', 'poetry', 'prose'],
      'grant': ['grant', 'funding', 'fellowship'],
      'residency': ['residency', 'retreat', 'program'],
      'competition': ['competition', 'contest', 'prize', 'award'],
      'exhibition': ['exhibition', 'show', 'gallery', 'museum'],
      'job': ['job', 'position', 'career', 'employment']
    };

    const textToCheck = (title + ' ' + snippet).toLowerCase();
    
    for (const [tag, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => textToCheck.includes(keyword))) {
        tags.add(tag);
      }
    }

    return Array.from(tags);
  }

  /**
   * Extract domain name from display link
   */
  private extractDomainName(displayLink: string): string {
    try {
      const domain = displayLink.replace(/^www\./, '');
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      return displayLink;
    }
  }

  /**
   * Calculate relevance score for ranking
   */
  private calculateRelevanceScore(result: GoogleSearchResult, searchTerm: string): number {
    let score = 0;
    const textToCheck = (result.title + ' ' + result.snippet).toLowerCase();
    const searchWords = searchTerm.toLowerCase().split(' ');
    
    // Score based on search term matches
    searchWords.forEach(word => {
      if (textToCheck.includes(word)) {
        score += 10;
      }
    });

    // Score based on opportunity keywords
    const opportunityKeywords = [
      'grant', 'fellowship', 'opportunity', 'competition', 'residency',
      'funding', 'award', 'submission', 'application', 'deadline'
    ];

    opportunityKeywords.forEach(keyword => {
      if (textToCheck.includes(keyword)) {
        score += 5;
      }
    });

    // Score based on trusted domains
    const trustedDomains = [
      'artconnect.com', 'callforentry.org', 'submittable.com',
      'artrabbit.com', 'culturework.com', 'arts.gov'
    ];

    trustedDomains.forEach(domain => {
      if (result.displayLink.includes(domain)) {
        score += 15;
      }
    });

    return score;
  }

  /**
   * Check if opportunity is valid
   */
  private isValidOpportunity(opportunity: OpportunityData): boolean {
    // Must have meaningful description
    if (!opportunity.description || opportunity.description.length < 50) {
      return false;
    }

    // Must have a valid URL
    if (!opportunity.url || !opportunity.url.startsWith('http')) {
      return false;
    }

    // Filter out obviously non-opportunity content
    const nonOpportunityKeywords = [
      'tutorial', 'how to', 'tips', 'guide', 'history of',
      'definition', 'meaning', 'what is', 'examples'
    ];

    const textToCheck = (opportunity.title + ' ' + opportunity.description).toLowerCase();
    const hasNonOpportunityKeywords = nonOpportunityKeywords.some(keyword => 
      textToCheck.includes(keyword)
    );

    return !hasNonOpportunityKeywords;
  }

  /**
   * Reset daily query count if needed
   */
  private resetDailyCountIfNeeded(): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    if (now - this.dailyResetTime > oneDayMs) {
      this.dailyQueryCount = 0;
      this.totalCost = 0;
      this.dailyResetTime = now;
      console.log('Reset daily Google Search quota');
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      rateLimit: 30, // 30 requests per minute (conservative for API usage)
      timeout: 30000, // 30 seconds
      retryAttempts: 2
    };
  }
}