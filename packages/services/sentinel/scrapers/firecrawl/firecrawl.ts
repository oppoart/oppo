import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';

/**
 * Firecrawl API integration for structured web scraping
 * Uses Firecrawl's API to scrape and extract opportunities from websites
 */
export class FirecrawlDiscoverer extends BaseDiscoverer {
  private apiKey: string = '';
  private baseUrl: string = 'https://api.firecrawl.dev';
  
  constructor() {
    super('firecrawl', 'websearch', '1.0.0');
  }
  
  protected async onInitialize(): Promise<void> {
    this.apiKey = this.config.metadata?.apiKey || process.env.FIRECRAWL_API_KEY || '';
    this.baseUrl = this.config.metadata?.baseUrl || 'https://api.firecrawl.dev';
    
    if (!this.apiKey) {
      throw new Error('Firecrawl API key is required');
    }
  }
  
  protected async checkHealth(): Promise<boolean> {
    try {
      // Test API connectivity with a simple request
      const response = await fetch(`${this.baseUrl}/v0/crawl`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          limit: 1,
          scrapeOptions: {
            formats: ['markdown']
          }
        })
      });
      
      return response.status === 200 || response.status === 202;
    } catch (error) {
      console.error('Firecrawl health check failed:', error);
      return false;
    }
  }
  
  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const searchTerms = context?.searchTerms || this.getDefaultSearchTerms();
    const maxResults = context?.maxResults || 50;
    
    console.log(`Firecrawl discovery with terms: ${searchTerms.join(', ')}`);
    
    // Search for opportunities using multiple sources
    const targetSites = this.getTargetSites();
    
    for (const site of targetSites.slice(0, 3)) { // Limit to 3 sites for now
      try {
        const siteOpportunities = await this.scrapeOpportunitiesFromSite(site, searchTerms, maxResults / 3);
        opportunities.push(...siteOpportunities);
      } catch (error) {
        console.error(`Error scraping ${site.url}:`, error);
      }
    }
    
    console.log(`Firecrawl found ${opportunities.length} opportunities`);
    return opportunities;
  }
  
  /**
   * Scrape opportunities from a specific site using Firecrawl
   */
  private async scrapeOpportunitiesFromSite(
    site: TargetSite,
    searchTerms: string[],
    maxResults: number
  ): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    
    try {
      // Step 1: Crawl the site to find relevant pages
      const crawlResponse = await this.crawlSite(site.url, site.patterns, Math.min(maxResults, 20));
      
      if (!crawlResponse.success) {
        throw new Error(`Crawl failed: ${crawlResponse.error}`);
      }
      
      // Step 2: Extract opportunities from crawled pages
      for (const page of crawlResponse.data) {
        const pageOpportunities = await this.extractOpportunitiesFromPage(page, site);
        opportunities.push(...pageOpportunities);
        
        if (opportunities.length >= maxResults) {
          break;
        }
      }
      
    } catch (error) {
      console.error(`Error scraping ${site.name}:`, error);
    }
    
    return opportunities.slice(0, maxResults);
  }
  
  /**
   * Crawl a website using Firecrawl API
   */
  private async crawlSite(url: string, patterns: string[], limit: number): Promise<any> {
    const response = await fetch(`${this.baseUrl}/v0/crawl`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        limit,
        crawlerOptions: {
          includes: patterns,
          excludes: ['*/admin/*', '*/login/*', '*/contact/*'],
          maxDepth: 2
        },
        scrapeOptions: {
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          includeTags: ['title', 'meta', 'h1', 'h2', 'h3', 'p', 'a', 'time'],
          removeTags: ['script', 'style', 'nav', 'footer', 'aside']
        }
      })
    });
    
    const crawlJob = await response.json();
    
    if (!response.ok) {
      return { success: false, error: crawlJob.error || 'Crawl request failed' };
    }
    
    // Poll for completion
    const jobId = crawlJob.jobId;
    return await this.pollCrawlJob(jobId);
  }
  
  /**
   * Poll crawl job until completion
   */
  private async pollCrawlJob(jobId: string): Promise<any> {
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/v0/crawl/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      const status = await response.json();
      
      if (status.status === 'completed') {
        return { success: true, data: status.data || [] };
      }
      
      if (status.status === 'failed') {
        return { success: false, error: status.error || 'Crawl job failed' };
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    return { success: false, error: 'Crawl job timeout' };
  }
  
  /**
   * Extract opportunities from a crawled page
   */
  private async extractOpportunitiesFromPage(page: any, site: TargetSite): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    
    try {
      const content = page.markdown || page.html || '';
      const url = page.metadata?.sourceURL || page.url;
      
      if (!content || !url) {
        return opportunities;
      }
      
      // Use AI to extract structured opportunity data
      const extractedData = await this.extractStructuredData(content, url, site);
      
      if (extractedData) {
        opportunities.push(extractedData);
      }
      
    } catch (error) {
      console.error(`Error extracting from page ${page.url}:`, error);
    }
    
    return opportunities;
  }
  
  /**
   * Extract structured opportunity data using AI
   */
  private async extractStructuredData(
    content: string, 
    url: string, 
    site: TargetSite
  ): Promise<OpportunityData | null> {
    try {
      // For now, use pattern matching and basic extraction
      // In production, this could use AI services for better extraction
      
      const title = this.extractTitle(content);
      const description = this.extractDescription(content);
      const deadline = this.extractDeadline(content);
      const amount = this.extractAmount(content);
      const organization = site.name;
      
      if (!title || title.length < 10 || !description || description.length < 50) {
        return null; // Skip incomplete opportunities
      }
      
      const opportunity: OpportunityData = {
        title: title.trim(),
        description: description.trim(),
        url,
        organization,
        deadline,
        amount,
        location: this.extractLocation(content),
        tags: this.extractTags(content, site),
        sourceType: 'websearch',
        sourceUrl: site.url,
        sourceMetadata: {
          site: site.name,
          extractedAt: new Date().toISOString(),
          contentLength: content.length
        },
        processed: false,
        status: 'new',
        applied: false,
        starred: false
      };
      
      return opportunity;
      
    } catch (error) {
      console.error('Error extracting structured data:', error);
      return null;
    }
  }
  
  /**
   * Extract title from content
   */
  private extractTitle(content: string): string {
    // Look for title in various formats
    const titlePatterns = [
      /# (.+)/,
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<title[^>]*>([^<]+)<\/title>/i,
      /title:\s*(.+)/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/\s+/g, ' ').trim();
      }
    }
    
    // Fallback: use first significant line
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 10);
    return lines[0] || '';
  }
  
  /**
   * Extract description from content
   */
  private extractDescription(content: string): string {
    // Remove markdown headers and clean up
    const cleanContent = content
      .replace(/^#+\s+/gm, '') // Remove markdown headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Take first few sentences as description
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const description = sentences.slice(0, 5).join('. ').trim();
    
    return description.length > 0 ? description + '.' : cleanContent.substring(0, 500);
  }
  
  /**
   * Extract deadline from content
   */
  private extractDeadline(content: string): Date | undefined {
    const datePatterns = [
      /deadline[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,
      /due[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,
      /apply by[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/g
    ];
    
    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime()) && date > new Date()) {
          return date;
        }
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract funding amount from content
   */
  private extractAmount(content: string): string | undefined {
    const amountPatterns = [
      /\$[\d,]+(?:\.\d{2})?/g,
      /(\d{1,3}(?:,\d{3})*)\s*(?:dollars?|USD)/i,
      /award[:\s]+\$?([\d,]+)/i,
      /grant[:\s]+\$?([\d,]+)/i
    ];
    
    for (const pattern of amountPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract location from content
   */
  private extractLocation(content: string): string | undefined {
    const locationPatterns = [
      /location[:\s]+([^.\n]+)/i,
      /based in[:\s]+([^.\n]+)/i,
      /([A-Z][a-z]+,\s*[A-Z]{2})/g, // City, State
      /([A-Z][a-z\s]+,\s*[A-Z][a-z\s]+)/g // City, Country
    ];
    
    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract tags from content and site context
   */
  private extractTags(content: string, site: TargetSite): string[] {
    const tags: string[] = [...site.tags];
    
    // Add tags based on content analysis
    const contentLower = content.toLowerCase();
    
    const tagKeywords = {
      'grant': ['grant', 'funding', 'financial support'],
      'residency': ['residency', 'artist residency', 'studio space'],
      'competition': ['competition', 'contest', 'prize'],
      'fellowship': ['fellowship', 'scholar'],
      'exhibition': ['exhibition', 'show', 'gallery'],
      'workshop': ['workshop', 'class', 'training'],
      'emerging-artist': ['emerging', 'early career', 'young artist'],
      'international': ['international', 'global', 'worldwide']
    };
    
    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      }
    }
    
    return tags;
  }
  
  /**
   * Get default search terms for opportunity discovery
   */
  private getDefaultSearchTerms(): string[] {
    return [
      'artist grants',
      'art residencies',
      'creative fellowships',
      'artist opportunities',
      'art competitions',
      'cultural grants',
      'artist funding'
    ];
  }
  
  /**
   * Get target sites for scraping
   */
  private getTargetSites(): TargetSite[] {
    return [
      {
        name: 'Artist Communities',
        url: 'https://www.artistcommunities.org',
        patterns: ['*/residency/*', '*/opportunity/*', '*/fellowship/*'],
        tags: ['residency', 'fellowship']
      },
      {
        name: 'Foundation Center',
        url: 'https://foundationcenter.org',
        patterns: ['*/opportunities/*', '*/grants/*'],
        tags: ['grant', 'funding']
      },
      {
        name: 'Art Opportunities Monthly',
        url: 'https://www.artopportunitiesmonthly.com',
        patterns: ['*/opportunities/*', '*/grants/*', '*/calls/*'],
        tags: ['grant', 'competition', 'exhibition']
      },
      {
        name: 'Call for Artists',
        url: 'https://www.callforentry.org',
        patterns: ['*/list.php*', '*/detail.php*'],
        tags: ['competition', 'exhibition', 'call-for-artists']
      }
    ];
  }
}

/**
 * Target site configuration
 */
interface TargetSite {
  name: string;
  url: string;
  patterns: string[];
  tags: string[];
}