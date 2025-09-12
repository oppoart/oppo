import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { DataExtractor, RawData } from '../../processors/DataExtractor';
import { DataCleaner } from '../../processors/DataCleaner';
import * as cheerio from 'cheerio';

/**
 * ArtConnect.com scraper configuration
 */
interface ArtConnectConfig {
  baseUrl: string;
  maxPages: number;
  pageDelay: number;
  userAgent: string;
  timeout: number;
  useFirecrawl: boolean;
  firecrawlApiKey?: string;
}

/**
 * ArtConnect.com scraper for artist opportunities
 * Targets: https://www.artconnect.com/opportunities
 */
export class ArtConnectDiscoverer extends BaseDiscoverer {
  private extractorConfig: ArtConnectConfig;
  private dataExtractor: DataExtractor;
  private dataCleaner: DataCleaner;

  constructor() {
    super('artconnect', 'websearch', '1.0.0');
    
    this.extractorConfig = {
      baseUrl: 'https://www.artconnect.com',
      maxPages: 5,
      pageDelay: 2000,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      timeout: 30000,
      useFirecrawl: process.env.FIRECRAWL_API_KEY ? true : false,
      firecrawlApiKey: process.env.FIRECRAWL_API_KEY
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
    console.log('Initializing ArtConnect discoverer...');
    
    // Check if we have necessary dependencies
    if (this.extractorConfig.useFirecrawl && !this.extractorConfig.firecrawlApiKey) {
      console.warn('Firecrawl API key not found, falling back to direct scraping');
      this.extractorConfig.useFirecrawl = false;
    }
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      // Simple connectivity check
      const response = await fetch(this.extractorConfig.baseUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.extractorConfig.userAgent
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('ArtConnect health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 50;
    let currentPage = 1;

    console.log(`Starting ArtConnect discovery (max results: ${maxResults})`);

    try {
      while (opportunities.length < maxResults && currentPage <= this.extractorConfig.maxPages) {
        console.log(`Scraping ArtConnect page ${currentPage}...`);

        const pageOpportunities = await this.scrapePage(currentPage, context);
        opportunities.push(...pageOpportunities);

        // Stop if we got fewer opportunities than expected (likely end of results)
        if (pageOpportunities.length < 10) {
          console.log('Few results found, likely reached end of opportunities');
          break;
        }

        currentPage++;
        
        // Rate limiting delay
        if (currentPage <= this.extractorConfig.maxPages) {
          await new Promise(resolve => setTimeout(resolve, this.extractorConfig.pageDelay));
        }
      }

      console.log(`ArtConnect discovery completed: ${opportunities.length} opportunities found`);
      return opportunities.slice(0, maxResults);

    } catch (error) {
      console.error('ArtConnect discovery failed:', error);
      throw error;
    }
  }

  /**
   * Scrape a single page of opportunities
   */
  private async scrapePage(page: number, context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    
    try {
      // Build URL for opportunities page
      const url = this.buildOpportunitiesUrl(page, context);
      console.log(`Fetching: ${url}`);

      // Get page content
      const html = await this.fetchPageContent(url);
      
      // Parse HTML
      const $ = cheerio.load(html);
      
      // Extract opportunity links/cards
      const opportunityElements = await this.findOpportunityElements($);
      
      console.log(`Found ${opportunityElements.length} opportunity elements on page ${page}`);

      // Process each opportunity
      for (let i = 0; i < opportunityElements.length; i++) {
        try {
          const opportunityData = await this.extractOpportunityData($, opportunityElements[i]);
          if (opportunityData) {
            opportunities.push(opportunityData);
          }
        } catch (error) {
          console.warn(`Failed to extract opportunity ${i + 1} on page ${page}:`, error);
        }
      }

      return opportunities;

    } catch (error) {
      console.error(`Failed to scrape page ${page}:`, error);
      return opportunities;
    }
  }

  /**
   * Build URL for opportunities listing
   */
  private buildOpportunitiesUrl(page: number, context?: DiscoveryContext): string {
    let url = `${this.extractorConfig.baseUrl}/opportunities`;
    const params = new URLSearchParams();

    // Add pagination
    if (page > 1) {
      params.set('page', page.toString());
    }

    // Add search terms if provided
    if (context?.searchTerms && context.searchTerms.length > 0) {
      params.set('search', context.searchTerms.join(' '));
    }

    // Add location filter if provided
    if (context?.location) {
      params.set('location', context.location);
    }

    // Add date range if provided
    if (context?.dateRange) {
      if (context.dateRange.start) {
        params.set('start_date', context.dateRange.start.toISOString().split('T')[0]);
      }
      if (context.dateRange.end) {
        params.set('end_date', context.dateRange.end.toISOString().split('T')[0]);
      }
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Fetch page content using appropriate method
   */
  private async fetchPageContent(url: string): Promise<string> {
    if (this.extractorConfig.useFirecrawl) {
      return this.fetchWithFirecrawl(url);
    } else {
      return this.fetchWithFetch(url);
    }
  }

  /**
   * Fetch using Firecrawl for better JavaScript support
   */
  private async fetchWithFirecrawl(url: string): Promise<string> {
    try {
      // Note: This would use the actual Firecrawl SDK
      // For now, implementing a placeholder
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.extractorConfig.firecrawlApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          formats: ['html']
        })
      });

      if (!response.ok) {
        throw new Error(`Firecrawl request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.html || '';

    } catch (error) {
      console.warn('Firecrawl failed, falling back to fetch:', error);
      return this.fetchWithFetch(url);
    }
  }

  /**
   * Fetch using standard fetch
   */
  private async fetchWithFetch(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.extractorConfig.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      signal: AbortSignal.timeout(this.extractorConfig.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Find opportunity elements on the page
   */
  private async findOpportunityElements($: cheerio.CheerioAPI): Promise<cheerio.Element[]> {
    // Common selectors for ArtConnect opportunities
    const selectors = [
      '.opportunity-card',
      '.job-card',
      '.listing-item',
      '.opportunity-item',
      '.card',
      'article',
      '.post',
      '.entry',
      '[data-opportunity]',
      '.opportunity'
    ];

    let elements: cheerio.Element[] = [];

    // Try each selector until we find opportunities
    for (const selector of selectors) {
      const found = $(selector).toArray();
      if (found.length > 0) {
        console.log(`Found opportunities using selector: ${selector}`);
        elements = found;
        break;
      }
    }

    // If no specific opportunity elements found, try to find links to opportunity pages
    if (elements.length === 0) {
      const links = $('a').toArray().filter(el => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().toLowerCase();
        
        return href.includes('/opportunity') || 
               href.includes('/job') || 
               href.includes('/grant') ||
               text.includes('opportunity') ||
               text.includes('grant') ||
               text.includes('fellowship');
      });

      elements = links.slice(0, 20); // Limit to prevent too many requests
    }

    return elements;
  }

  /**
   * Extract opportunity data from an element
   */
  private async extractOpportunityData($: cheerio.CheerioAPI, element: cheerio.Element): Promise<OpportunityData | null> {
    try {
      const $elem = $(element);
      
      // Get the opportunity URL
      let url = $elem.find('a').first().attr('href') || $elem.attr('href') || '';
      
      if (!url) {
        console.warn('No URL found for opportunity element');
        return null;
      }

      // Make URL absolute
      if (url.startsWith('/')) {
        url = this.extractorConfig.baseUrl + url;
      } else if (!url.startsWith('http')) {
        url = this.extractorConfig.baseUrl + '/' + url;
      }

      // Extract basic info from the listing
      const title = this.extractTitle($, $elem);
      const organization = this.extractOrganization($, $elem);
      const description = this.extractDescription($, $elem);
      const deadline = this.extractDeadline($, $elem);
      const location = this.extractLocation($, $elem);
      const amount = this.extractAmount($, $elem);
      const tags = this.extractTags($, $elem);

      // If we have minimal info, try to get full details from the opportunity page
      if (!title || !description || description.length < 100) {
        const fullDetails = await this.fetchOpportunityDetails(url);
        if (fullDetails) {
          return {
            ...fullDetails,
            url,
            sourceType: 'websearch',
            sourceMetadata: {
              scrapedFrom: 'listing_and_detail',
              listingUrl: url,
              scrapedAt: new Date().toISOString()
            }
          };
        }
      }

      // Create opportunity data from listing info
      const rawData: RawData = {
        content: $elem.html() || '',
        contentType: 'html' as const,
        url: url,
        metadata: {
          source: 'artconnect_listing'
        }
      };

      // Extract using DataExtractor
      const extractionResult = await this.dataExtractor.extract(rawData, 'websearch');
      
      if (!extractionResult.success || !extractionResult.data) {
        console.warn('Data extraction failed for opportunity');
        return null;
      }

      // Clean the extracted data
      const cleaningResult = await this.dataCleaner.clean(extractionResult.data);
      
      if (!cleaningResult.success || !cleaningResult.data) {
        console.warn('Data cleaning failed for opportunity');
        return null;
      }

      // Merge manual extraction with processed data
      const opportunity: OpportunityData = {
        ...cleaningResult.data,
        title: title || cleaningResult.data.title,
        organization: organization || cleaningResult.data.organization,
        description: description || cleaningResult.data.description,
        deadline: deadline || cleaningResult.data.deadline,
        location: location || cleaningResult.data.location,
        amount: amount || cleaningResult.data.amount,
        tags: [...(tags || []), ...(cleaningResult.data.tags || [])],
        url: url,
        sourceType: 'websearch',
        sourceMetadata: {
          ...cleaningResult.data.sourceMetadata,
          extractedFrom: 'artconnect_listing',
          scrapedAt: new Date().toISOString()
        }
      };

      return opportunity;

    } catch (error) {
      console.error('Error extracting opportunity data:', error);
      return null;
    }
  }

  /**
   * Extract title from element
   */
  private extractTitle($: cheerio.CheerioAPI, $elem: cheerio.Cheerio<cheerio.Element>): string {
    const titleSelectors = [
      'h1', 'h2', 'h3', '.title', '.opportunity-title', '.job-title', 
      '.heading', '.name', 'a'
    ];

    for (const selector of titleSelectors) {
      const text = $elem.find(selector).first().text().trim();
      if (text && text.length > 5) {
        return text;
      }
    }

    return '';
  }

  /**
   * Extract organization from element
   */
  private extractOrganization($: cheerio.CheerioAPI, $elem: cheerio.Cheerio<cheerio.Element>): string {
    const orgSelectors = [
      '.organization', '.company', '.org', '.employer', '.institution'
    ];

    for (const selector of orgSelectors) {
      const text = $elem.find(selector).first().text().trim();
      if (text) {
        return text;
      }
    }

    return '';
  }

  /**
   * Extract description from element
   */
  private extractDescription($: cheerio.CheerioAPI, $elem: cheerio.Cheerio<cheerio.Element>): string {
    const descSelectors = [
      '.description', '.summary', '.excerpt', '.content', 'p'
    ];

    for (const selector of descSelectors) {
      const text = $elem.find(selector).first().text().trim();
      if (text && text.length > 20) {
        return text;
      }
    }

    return '';
  }

  /**
   * Extract deadline from element
   */
  private extractDeadline($: cheerio.CheerioAPI, $elem: cheerio.Cheerio<cheerio.Element>): Date | undefined {
    const deadlineSelectors = [
      '.deadline', '.due-date', '.expires', '.date'
    ];

    for (const selector of deadlineSelectors) {
      const text = $elem.find(selector).first().text().trim();
      if (text) {
        const date = new Date(text);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract location from element
   */
  private extractLocation($: cheerio.CheerioAPI, $elem: cheerio.Cheerio<cheerio.Element>): string {
    const locationSelectors = [
      '.location', '.place', '.address', '.city'
    ];

    for (const selector of locationSelectors) {
      const text = $elem.find(selector).first().text().trim();
      if (text) {
        return text;
      }
    }

    return '';
  }

  /**
   * Extract amount from element
   */
  private extractAmount($: cheerio.CheerioAPI, $elem: cheerio.Cheerio<cheerio.Element>): string {
    const amountSelectors = [
      '.amount', '.salary', '.funding', '.prize', '.compensation'
    ];

    for (const selector of amountSelectors) {
      const text = $elem.find(selector).first().text().trim();
      if (text && /[\$€£\d]/.test(text)) {
        return text;
      }
    }

    return '';
  }

  /**
   * Extract tags from element
   */
  private extractTags($: cheerio.CheerioAPI, $elem: cheerio.Cheerio<cheerio.Element>): string[] {
    const tags: string[] = [];
    
    const tagSelectors = [
      '.tag', '.tags', '.category', '.categories', '.keyword'
    ];

    for (const selector of tagSelectors) {
      $elem.find(selector).each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text && text.length > 1) {
          tags.push(text);
        }
      });
    }

    return tags;
  }

  /**
   * Fetch full opportunity details from individual opportunity page
   */
  private async fetchOpportunityDetails(url: string): Promise<OpportunityData | null> {
    try {
      console.log(`Fetching full details from: ${url}`);
      
      const html = await this.fetchPageContent(url);
      
      const rawData: RawData = {
        content: html,
        contentType: 'html' as const,
        url: url,
        metadata: {
          source: 'artconnect_detail'
        }
      };

      // Extract using DataExtractor
      const extractionResult = await this.dataExtractor.extract(rawData, 'websearch');
      
      if (!extractionResult.success || !extractionResult.data) {
        return null;
      }

      // Clean the extracted data
      const cleaningResult = await this.dataCleaner.clean(extractionResult.data);
      
      if (!cleaningResult.success || !cleaningResult.data) {
        return null;
      }

      return cleaningResult.data;

    } catch (error) {
      console.warn(`Failed to fetch opportunity details from ${url}:`, error);
      return null;
    }
  }

  protected getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      rateLimit: 30, // 30 requests per minute (conservative)
      timeout: 45000, // 45 seconds for page loads
      retryAttempts: 2
    };
  }
}