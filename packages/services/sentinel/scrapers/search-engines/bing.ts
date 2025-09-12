import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { DataExtractor, RawData } from '../../processors/DataExtractor';
import { DataCleaner } from '../../processors/DataCleaner';

/**
 * Bing Search API v7 configuration
 */
interface BingSearchConfig {
  subscriptionKey: string;
  endpoint: string;
  searchTerms: string[];
  maxResultsPerQuery: number;
  dailyQuotaLimit: number;
  costPer1000Queries: number; // In USD
  market: string; // e.g., 'en-US'
  safeSearch: 'Off' | 'Moderate' | 'Strict';
  freshness: 'Day' | 'Week' | 'Month';
  responseFilter: string[];
  excludeTerms: string[];
}

/**
 * Bing Search result structure
 */
interface BingSearchResult {
  id: string;
  name: string;
  url: string;
  displayUrl: string;
  snippet: string;
  deepLinks?: Array<{
    name: string;
    url: string;
    snippet?: string;
  }>;
  dateLastCrawled?: string;
  searchTags?: Array<{
    name: string;
    content: string;
  }>;
  about?: Array<{
    name: string;
  }>;
  isFamilyFriendly?: boolean;
  primaryImageOfPage?: {
    thumbnailUrl: string;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
  };
}

/**
 * Bing Search API response
 */
interface BingSearchAPIResponse {
  _type: string;
  queryContext: {
    originalQuery: string;
    alteredQuery?: string;
    alterationOverrideQuery?: string;
    adultIntent?: boolean;
    askUserForLocation?: boolean;
  };
  webPages?: {
    webSearchUrl: string;
    totalEstimatedMatches: number;
    value: BingSearchResult[];
  };
  relatedSearches?: {
    value: Array<{
      text: string;
      displayText: string;
      webSearchUrl: string;
    }>;
  };
  rankingResponse?: {
    mainline?: {
      items: Array<{
        answerType: string;
        resultIndex?: number;
        value?: {
          id: string;
        };
      }>;
    };
  };
}

/**
 * Bing Search discoverer for art opportunities
 * Uses Bing Search API v7 as cost-effective alternative to Google
 */
export class BingSearchDiscoverer extends BaseDiscoverer {
  private config: BingSearchConfig;
  private dataExtractor: DataExtractor;
  private dataCleaner: DataCleaner;
  private dailyQueryCount: number = 0;
  private dailyResetTime: number = 0;
  private totalCost: number = 0;

  constructor() {
    super('bing-search', 'search', '1.0.0');
    
    this.config = {
      subscriptionKey: process.env.BING_SEARCH_API_KEY || '',
      endpoint: 'https://api.bing.microsoft.com/v7.0/search',
      searchTerms: [
        'art grant opportunity 2025',
        'artist residency program open',
        'creative fellowship application',
        'visual arts funding opportunity',
        'art competition call for entries',
        'museum curatorial position',
        'gallery job opening',
        'nonprofit arts opportunity',
        'public art commission call',
        'art exhibition submission',
        'creative writing grant program',
        'performing arts opportunity',
        'digital arts scholarship',
        'arts education position',
        'cultural program opportunity'
      ],
      maxResultsPerQuery: 15,
      dailyQuotaLimit: 1000, // More generous than Google
      costPer1000Queries: 3.00, // Bing is generally cheaper
      market: 'en-US',
      safeSearch: 'Moderate',
      freshness: 'Month',
      responseFilter: ['Webpages'],
      excludeTerms: ['expired', 'closed', 'deadline passed', 'archive']
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
    console.log('Initializing Bing Search discoverer...');
    
    // Validate API credentials
    if (!this.config.subscriptionKey) {
      throw new Error('Bing Search API subscription key is required');
    }

    // Test API connectivity
    await this.testAPIConnectivity();
    
    console.log('Bing Search discoverer initialized successfully');
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      return await this.testAPIConnectivity();
    } catch (error) {
      console.error('Bing Search health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 150;
    const searchTerms = context?.searchTerms || this.config.searchTerms;

    console.log(`Starting Bing Search discovery for ${searchTerms.length} search terms`);

    try {
      // Check daily quota
      this.resetDailyCountIfNeeded();
      if (this.dailyQueryCount >= this.config.dailyQuotaLimit) {
        throw new Error(`Daily Bing Search quota limit reached (${this.config.dailyQuotaLimit} queries)`);
      }

      // Process each search term
      for (const searchTerm of searchTerms) {
        if (opportunities.length >= maxResults) break;
        if (this.dailyQueryCount >= this.config.dailyQuotaLimit) break;

        console.log(`Searching Bing for: "${searchTerm}"`);
        
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
        await this.delay(500); // Bing allows higher rate limits
      }

      console.log(`Bing Search discovery completed: ${opportunities.length} opportunities found`);
      console.log(`Queries used: ${this.dailyQueryCount}/${this.config.dailyQuotaLimit}, Cost: $${this.totalCost.toFixed(4)}`);
      
      return opportunities;

    } catch (error) {
      console.error('Bing Search discovery failed:', error);
      throw error;
    }
  }

  /**
   * Test API connectivity
   */
  private async testAPIConnectivity(): Promise<boolean> {
    try {
      const response = await this.makeAPIRequest('test', 1, 0);
      return response !== null;
    } catch (error) {
      console.error('Bing Search API connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Perform a single search query
   */
  private async performSearch(query: string): Promise<BingSearchResult[]> {
    const results: BingSearchResult[] = [];
    const maxResults = Math.min(this.config.maxResultsPerQuery, 50);
    let offset = 0;
    const countPerRequest = 10; // Bing allows up to 50 per request

    try {
      while (results.length < maxResults) {
        // Check quota before making request
        if (this.dailyQueryCount >= this.config.dailyQuotaLimit) {
          console.warn('Daily quota limit reached, stopping search');
          break;
        }

        const remainingResults = maxResults - results.length;
        const count = Math.min(countPerRequest, remainingResults);

        const response = await this.makeAPIRequest(query, count, offset);
        
        if (!response || !response.webPages || !response.webPages.value || response.webPages.value.length === 0) {
          console.log('No more results available');
          break;
        }

        // Update quota tracking
        this.dailyQueryCount++;
        this.totalCost += (this.config.costPer1000Queries / 1000);

        // Filter and add results
        const filteredResults = this.filterSearchResults(response.webPages.value, query);
        results.push(...filteredResults);
        
        offset += count;
        
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
   * Make API request to Bing Search
   */
  private async makeAPIRequest(query: string, count: number, offset: number): Promise<BingSearchAPIResponse | null> {
    try {
      const enhancedQuery = this.buildEnhancedQuery(query);
      
      const params = new URLSearchParams({
        q: enhancedQuery,
        count: count.toString(),
        offset: offset.toString(),
        mkt: this.config.market,
        safeSearch: this.config.safeSearch,
        responseFilter: this.config.responseFilter.join(','),
        textDecorations: 'true',
        textFormat: 'HTML'
      });

      if (this.config.freshness) {
        params.set('freshness', this.config.freshness);
      }

      const url = `${this.config.endpoint}?${params.toString()}`;
      
      console.log(`Making Bing Search API request: ${query} (count: ${count}, offset: ${offset})`);
      
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Accept': 'application/json',
          'User-Agent': 'Sentinel-Discovery-Bot/1.0'
        }
      });

      if (response.status === 429) {
        console.warn('Rate limit reached, waiting before retry');
        await this.delay(2000);
        throw new Error('Rate limit exceeded');
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Bing Search API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data: BingSearchAPIResponse = await response.json();
      
      if (data._type === 'ErrorResponse') {
        throw new Error(`Bing Search API returned error response`);
      }

      return data;

    } catch (error) {
      console.error('Bing Search API request failed:', error);
      return null;
    }
  }

  /**
   * Build enhanced search query with operators
   */
  private buildEnhancedQuery(baseQuery: string): string {
    // Add opportunity-specific terms
    const opportunityTerms = [
      'opportunity', 'grant', 'fellowship', 'residency', 'competition',
      'submission', 'application', 'call', 'funding', 'award', 'program'
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
      'site:culturework.com',
      'site:arts.gov',
      'site:nea.gov'
    ];

    return `(${enhancedQuery}) OR (${baseQuery} (${artSites.join(' OR ')}))`;
  }

  /**
   * Filter search results to remove irrelevant ones
   */
  private filterSearchResults(results: BingSearchResult[], query: string): BingSearchResult[] {
    return results.filter(result => {
      // Check for spam indicators
      const spamKeywords = [
        'buy now', 'sale', 'discount', 'cheap', 'free download', 
        'click here', 'limited time', 'special offer'
      ];
      const textToCheck = (result.name + ' ' + result.snippet).toLowerCase();
      
      const hasSpam = spamKeywords.some(keyword => textToCheck.includes(keyword));
      if (hasSpam) {
        console.log(`Filtered out spam result: ${result.name}`);
        return false;
      }

      // Check for expired/closed opportunities
      const expiredKeywords = [
        'expired', 'closed', 'deadline passed', 'no longer accepting',
        'applications closed', 'registration closed', 'ended'
      ];
      const hasExpired = expiredKeywords.some(keyword => textToCheck.includes(keyword));
      if (hasExpired) {
        console.log(`Filtered out expired result: ${result.name}`);
        return false;
      }

      // Must contain opportunity-related keywords
      const opportunityKeywords = [
        'opportunity', 'grant', 'fellowship', 'residency', 'competition',
        'submission', 'application', 'call', 'funding', 'award', 'program',
        'scholarship', 'prize', 'contest', 'opening', 'position', 'job'
      ];

      const hasOpportunityKeywords = opportunityKeywords.some(keyword => 
        textToCheck.includes(keyword)
      );

      if (!hasOpportunityKeywords) {
        console.log(`Filtered out non-opportunity result: ${result.name}`);
        return false;
      }

      // Check URL validity
      if (!result.url || !result.url.startsWith('http')) {
        console.log(`Filtered out result with invalid URL: ${result.name}`);
        return false;
      }

      return true;
    });
  }

  /**
   * Convert Bing search result to opportunity
   */
  private async convertSearchResultToOpportunity(
    result: BingSearchResult, 
    searchTerm: string
  ): Promise<OpportunityData | null> {
    try {
      // Extract organization from URL or search tags
      let organization = this.extractDomainName(result.displayUrl);
      
      if (result.about && result.about[0]) {
        organization = result.about[0].name || organization;
      }

      // Extract amount/funding info from snippet
      const amount = this.extractAmount(result.snippet);

      // Extract deadline information
      const deadline = this.extractDeadline(result.snippet);

      // Extract location information
      const location = this.extractLocation(result.snippet);

      // Extract tags from the search term and content
      const tags = this.extractTags(searchTerm, result.name, result.snippet);

      // Try to get more detailed information by fetching the page
      let enhancedDescription = result.snippet;
      try {
        const pageContent = await this.fetchPageContent(result.url);
        if (pageContent) {
          const extractedData = await this.dataExtractor.extract({
            content: pageContent,
            contentType: 'html',
            url: result.url,
            metadata: { source: 'bing_search' }
          }, 'search');

          if (extractedData.success && extractedData.data) {
            const cleaned = await this.dataCleaner.clean(extractedData.data);
            if (cleaned.success && cleaned.data) {
              enhancedDescription = cleaned.data.description || result.snippet;
              if (cleaned.data.organization) {
                organization = cleaned.data.organization;
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch enhanced content for ${result.url}:`, error);
      }

      const opportunity: OpportunityData = {
        title: result.name,
        description: enhancedDescription,
        url: result.url,
        organization: organization,
        deadline: deadline,
        location: location,
        amount: amount,
        tags: [...tags, 'bing-search', 'search-engine'],
        sourceType: 'search',
        status: 'new',
        processed: false,
        applied: false,
        starred: false,
        sourceMetadata: {
          searchEngine: 'bing',
          searchTerm: searchTerm,
          displayUrl: result.displayUrl,
          snippet: result.snippet,
          searchId: result.id,
          dateLastCrawled: result.dateLastCrawled,
          deepLinks: result.deepLinks,
          searchTags: result.searchTags,
          primaryImageUrl: result.primaryImageOfPage?.thumbnailUrl,
          isFamilyFriendly: result.isFamilyFriendly,
          discoveredAt: new Date().toISOString(),
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        signal: AbortSignal.timeout(12000)
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
      /\$[\d,]+(?:\.\d{2})?(?:\s*(?:k|thousand|million|M|K))?/gi,
      /€[\d,]+(?:\.\d{2})?(?:\s*(?:k|thousand|million|M|K))?/gi,
      /£[\d,]+(?:\.\d{2})?(?:\s*(?:k|thousand|million|M|K))?/gi,
      /(?:up to|maximum|max|prize|award|funding|stipend)[:\s]+\$?[\d,]+/gi,
      /[\d,]+\s*(?:dollars|USD|EUR|GBP|per month|per year)/gi
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
   * Extract deadline information
   */
  private extractDeadline(text: string): Date | undefined {
    const patterns = [
      /deadline[:\s]+([^.\n,]+)/gi,
      /due[:\s]+([^.\n,]+)/gi,
      /apply by[:\s]+([^.\n,]+)/gi,
      /closes?[:\s]+([^.\n,]+)/gi,
      /submit by[:\s]+([^.\n,]+)/gi,
      /applications? (?:close|due)[:\s]+([^.\n,]+)/gi
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date > new Date()) {
          return date;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract location information
   */
  private extractLocation(text: string): string {
    const patterns = [
      /location[:\s]+([^.\n,]+)/gi,
      /based in[:\s]+([^.\n,]+)/gi,
      /(?:at|in)\s+([\w\s,]+(?:university|college|museum|gallery|center|institute))/gi,
      /(?:remote|on-site|hybrid|worldwide|international|global|local)/gi
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
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
      'visual-arts': ['painting', 'sculpture', 'photography', 'visual', 'fine art'],
      'performing-arts': ['theater', 'theatre', 'dance', 'performance', 'music', 'opera'],
      'digital-arts': ['digital', 'media', 'video', 'interactive', 'animation', 'vr'],
      'writing': ['writing', 'literature', 'poetry', 'prose', 'author', 'writer'],
      'film': ['film', 'cinema', 'documentary', 'screenwriting', 'director'],
      'design': ['design', 'graphic', 'industrial', 'fashion', 'product'],
      'grant': ['grant', 'funding', 'fellowship', 'stipend'],
      'residency': ['residency', 'retreat', 'program', 'studio'],
      'competition': ['competition', 'contest', 'prize', 'award', 'winner'],
      'exhibition': ['exhibition', 'show', 'gallery', 'museum', 'display'],
      'job': ['job', 'position', 'career', 'employment', 'hiring'],
      'education': ['education', 'teaching', 'professor', 'instructor', 'academic'],
      'nonprofit': ['nonprofit', 'foundation', 'charity', 'organization']
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
   * Extract domain name from display URL
   */
  private extractDomainName(displayUrl: string): string {
    try {
      const domain = displayUrl.replace(/^www\./, '').split('/')[0];
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      return displayUrl;
    }
  }

  /**
   * Calculate relevance score for ranking
   */
  private calculateRelevanceScore(result: BingSearchResult, searchTerm: string): number {
    let score = 0;
    const textToCheck = (result.name + ' ' + result.snippet).toLowerCase();
    const searchWords = searchTerm.toLowerCase().split(' ');
    
    // Score based on search term matches in title (higher weight)
    searchWords.forEach(word => {
      if (result.name.toLowerCase().includes(word)) {
        score += 15;
      }
      if (result.snippet.toLowerCase().includes(word)) {
        score += 8;
      }
    });

    // Score based on opportunity keywords
    const opportunityKeywords = [
      'grant', 'fellowship', 'opportunity', 'competition', 'residency',
      'funding', 'award', 'submission', 'application', 'deadline', 'program'
    ];

    opportunityKeywords.forEach(keyword => {
      if (result.name.toLowerCase().includes(keyword)) {
        score += 12;
      }
      if (result.snippet.toLowerCase().includes(keyword)) {
        score += 6;
      }
    });

    // Score based on trusted domains
    const trustedDomains = [
      'artconnect.com', 'callforentry.org', 'submittable.com',
      'artrabbit.com', 'culturework.com', 'arts.gov', 'nea.gov',
      'humanities.org', 'foundation.org', 'university.edu', 'museum.org'
    ];

    trustedDomains.forEach(domain => {
      if (result.displayUrl.includes(domain)) {
        score += 20;
      }
    });

    // Score based on freshness
    if (result.dateLastCrawled) {
      const crawledDate = new Date(result.dateLastCrawled);
      const daysSinceCrawled = (Date.now() - crawledDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCrawled < 7) {
        score += 10;
      } else if (daysSinceCrawled < 30) {
        score += 5;
      }
    }

    // Score based on search tags relevance
    if (result.searchTags) {
      result.searchTags.forEach(tag => {
        if (tag.name.toLowerCase().includes('art') || 
            tag.name.toLowerCase().includes('opportunity') ||
            tag.name.toLowerCase().includes('grant')) {
          score += 8;
        }
      });
    }

    return score;
  }

  /**
   * Check if opportunity is valid
   */
  private isValidOpportunity(opportunity: OpportunityData): boolean {
    // Must have meaningful description
    if (!opportunity.description || opportunity.description.length < 30) {
      return false;
    }

    // Must have a valid URL
    if (!opportunity.url || !opportunity.url.startsWith('http')) {
      return false;
    }

    // Filter out obviously non-opportunity content
    const nonOpportunityKeywords = [
      'tutorial', 'how to', 'tips', 'guide', 'history of',
      'definition', 'meaning', 'what is', 'examples', 'news article',
      'blog post', 'review', 'opinion', 'wiki'
    ];

    const textToCheck = (opportunity.title + ' ' + opportunity.description).toLowerCase();
    const hasNonOpportunityKeywords = nonOpportunityKeywords.some(keyword => 
      textToCheck.includes(keyword)
    );

    if (hasNonOpportunityKeywords) {
      return false;
    }

    // Must contain opportunity-related keywords
    const opportunityKeywords = [
      'opportunity', 'grant', 'fellowship', 'competition', 'residency',
      'application', 'submit', 'apply', 'deadline', 'funding', 'award',
      'program', 'call', 'position', 'job', 'opening'
    ];

    const hasOpportunityKeywords = opportunityKeywords.some(keyword => 
      textToCheck.includes(keyword)
    );

    return hasOpportunityKeywords;
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
      console.log('Reset daily Bing Search quota');
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
      rateLimit: 60, // 60 requests per minute (Bing allows higher rates)
      timeout: 30000, // 30 seconds
      retryAttempts: 2
    };
  }
}