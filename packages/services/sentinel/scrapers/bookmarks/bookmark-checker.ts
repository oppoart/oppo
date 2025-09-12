import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { DataExtractor, RawData } from '../../processors/DataExtractor';
import { DataCleaner } from '../../processors/DataCleaner';
import * as crypto from 'crypto';

/**
 * Bookmark source configuration
 */
interface BookmarkSource {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'webpage' | 'sitemap';
  enabled: boolean;
  checkFrequency: 'hourly' | 'daily' | 'weekly';
  lastChecked?: Date;
  lastModified?: Date;
  selectors?: {
    container?: string;
    title?: string;
    description?: string;
    url?: string;
    deadline?: string;
    organization?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * RSS feed item
 */
interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate?: string;
  category?: string[];
  author?: string;
  guid?: string;
}

/**
 * Change detection result
 */
interface ChangeDetection {
  hasChanges: boolean;
  contentHash: string;
  lastHash?: string;
  changeType: 'new_content' | 'modified_content' | 'no_change';
  newItems?: number;
  modifiedItems?: number;
}

/**
 * Configuration for bookmark checker
 */
interface BookmarkCheckerConfig {
  sources: BookmarkSource[];
  maxSourcesPerRun: number;
  respectRobotsTxt: boolean;
  userAgent: string;
  timeout: number;
  retryDelay: number;
  changeDetectionEnabled: boolean;
  storeContentHashes: boolean;
}

/**
 * Bookmark checker for predefined sources management
 * Monitors RSS feeds, websites, and other user-defined sources regularly
 */
export class BookmarkCheckerDiscoverer extends BaseDiscoverer {
  private checkerConfig: BookmarkCheckerConfig;
  private dataExtractor: DataExtractor;
  private dataCleaner: DataCleaner;
  private contentHashes: Map<string, string> = new Map();

  constructor() {
    super('bookmark-checker', 'bookmark', '1.0.0');
    
    this.checkerConfig = {
      sources: this.getDefaultBookmarkSources(),
      maxSourcesPerRun: 10,
      respectRobotsTxt: true,
      userAgent: 'OpportunityDiscoverer/1.0 (+https://example.com/bot)',
      timeout: 20000,
      retryDelay: 5000,
      changeDetectionEnabled: true,
      storeContentHashes: true
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
    console.log('Initializing Bookmark Checker discoverer...');
    console.log(`Configured ${this.checkerConfig.sources.length} bookmark sources`);
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      // Check if we have any enabled sources
      const enabledSources = this.checkerConfig.sources.filter(s => s.enabled);
      
      if (enabledSources.length === 0) {
        console.warn('No enabled bookmark sources configured');
        return false;
      }

      // Test connectivity to a few sources
      const testSources = enabledSources.slice(0, 3);
      let healthyCount = 0;

      for (const source of testSources) {
        try {
          const response = await fetch(source.url, {
            method: 'HEAD',
            headers: {
              'User-Agent': this.checkerConfig.userAgent
            },
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            healthyCount++;
          }
        } catch (error) {
          console.warn(`Health check failed for source ${source.name}:`, error);
        }
      }

      return healthyCount > 0;

    } catch (error) {
      console.error('Bookmark checker health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 100;

    console.log(`Starting bookmark checker discovery (max results: ${maxResults})`);

    try {
      // Get sources that need checking
      const sourcesToCheck = this.getSourcesToCheck();
      console.log(`Checking ${sourcesToCheck.length} bookmark sources`);

      // Check each source
      for (const source of sourcesToCheck) {
        try {
          console.log(`Checking source: ${source.name} (${source.url})`);
          
          const sourceOpportunities = await this.checkBookmarkSource(source, context);
          opportunities.push(...sourceOpportunities);
          
          // Update last checked timestamp
          source.lastChecked = new Date();
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Stop if we have enough results
          if (opportunities.length >= maxResults) {
            break;
          }
          
        } catch (error) {
          console.error(`Failed to check source ${source.name}:`, error);
        }
      }

      console.log(`Bookmark checker discovery completed: ${opportunities.length} opportunities found`);
      return opportunities.slice(0, maxResults);

    } catch (error) {
      console.error('Bookmark checker discovery failed:', error);
      throw error;
    }
  }

  /**
   * Get sources that need checking based on frequency and last check time
   */
  private getSourcesToCheck(): BookmarkSource[] {
    const now = new Date();
    
    return this.checkerConfig.sources
      .filter(source => source.enabled)
      .filter(source => {
        if (!source.lastChecked) {
          return true; // Never checked before
        }

        const timeSinceLastCheck = now.getTime() - source.lastChecked.getTime();
        
        switch (source.checkFrequency) {
          case 'hourly':
            return timeSinceLastCheck > 60 * 60 * 1000; // 1 hour
          case 'daily':
            return timeSinceLastCheck > 24 * 60 * 60 * 1000; // 24 hours
          case 'weekly':
            return timeSinceLastCheck > 7 * 24 * 60 * 60 * 1000; // 7 days
          default:
            return true;
        }
      })
      .slice(0, this.checkerConfig.maxSourcesPerRun);
  }

  /**
   * Check a single bookmark source for opportunities
   */
  private async checkBookmarkSource(
    source: BookmarkSource,
    context?: DiscoveryContext
  ): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];

    try {
      // Detect changes if enabled
      if (this.checkerConfig.changeDetectionEnabled) {
        const changeResult = await this.detectChanges(source);
        
        if (!changeResult.hasChanges) {
          console.log(`No changes detected for ${source.name}, skipping`);
          return opportunities;
        }
        
        console.log(`Changes detected for ${source.name}: ${changeResult.changeType}`);
      }

      // Check source based on type
      switch (source.type) {
        case 'rss':
          const rssOpportunities = await this.checkRSSFeed(source, context);
          opportunities.push(...rssOpportunities);
          break;
          
        case 'webpage':
          const webpageOpportunities = await this.checkWebpage(source, context);
          opportunities.push(...webpageOpportunities);
          break;
          
        case 'sitemap':
          const sitemapOpportunities = await this.checkSitemap(source, context);
          opportunities.push(...sitemapOpportunities);
          break;
          
        default:
          console.warn(`Unknown source type: ${source.type}`);
      }

      return opportunities;

    } catch (error) {
      console.error(`Error checking bookmark source ${source.name}:`, error);
      return opportunities;
    }
  }

  /**
   * Detect changes in source content
   */
  private async detectChanges(source: BookmarkSource): Promise<ChangeDetection> {
    try {
      // Fetch current content
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': this.checkerConfig.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml,application/rss+xml,*/*'
        },
        signal: AbortSignal.timeout(this.checkerConfig.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      
      // Generate content hash
      const contentHash = crypto.createHash('md5').update(content).digest('hex');
      
      // Get previous hash
      const lastHash = this.contentHashes.get(source.id);
      
      // Store new hash
      if (this.checkerConfig.storeContentHashes) {
        this.contentHashes.set(source.id, contentHash);
      }

      // Determine change type
      let changeType: 'new_content' | 'modified_content' | 'no_change' = 'no_change';
      let hasChanges = false;

      if (!lastHash) {
        changeType = 'new_content';
        hasChanges = true;
      } else if (lastHash !== contentHash) {
        changeType = 'modified_content';
        hasChanges = true;
      }

      return {
        hasChanges,
        contentHash,
        lastHash,
        changeType
      };

    } catch (error) {
      console.error(`Change detection failed for ${source.name}:`, error);
      
      // Return assuming changes to be safe
      return {
        hasChanges: true,
        contentHash: '',
        changeType: 'new_content'
      };
    }
  }

  /**
   * Check RSS feed for opportunities
   */
  private async checkRSSFeed(
    source: BookmarkSource,
    context?: DiscoveryContext
  ): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];

    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': this.checkerConfig.userAgent,
          'Accept': 'application/rss+xml,application/xml,text/xml'
        },
        signal: AbortSignal.timeout(this.checkerConfig.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlContent = await response.text();
      const rssItems = await this.parseRSSFeed(xmlContent);
      
      console.log(`Found ${rssItems.length} RSS items in ${source.name}`);

      // Convert RSS items to opportunities
      for (const item of rssItems) {
        try {
          const opportunity = await this.convertRSSItemToOpportunity(item, source);
          if (opportunity) {
            opportunities.push(opportunity);
          }
        } catch (error) {
          console.warn(`Failed to convert RSS item: ${item.title}`, error);
        }
      }

      return opportunities;

    } catch (error) {
      console.error(`Error checking RSS feed ${source.name}:`, error);
      return opportunities;
    }
  }

  /**
   * Parse RSS feed XML
   */
  private async parseRSSFeed(xmlContent: string): Promise<RSSItem[]> {
    // Simple XML parsing for RSS feeds
    // In a production environment, you'd use a proper XML parser
    const items: RSSItem[] = [];
    
    try {
      // Extract items using regex (basic approach)
      const itemRegex = /<item[\s\S]*?<\/item>/gi;
      const itemMatches = xmlContent.match(itemRegex) || [];

      for (const itemXml of itemMatches) {
        const item: RSSItem = {
          title: this.extractXMLTag(itemXml, 'title') || '',
          description: this.extractXMLTag(itemXml, 'description') || '',
          link: this.extractXMLTag(itemXml, 'link') || '',
          pubDate: this.extractXMLTag(itemXml, 'pubDate'),
          author: this.extractXMLTag(itemXml, 'author'),
          guid: this.extractXMLTag(itemXml, 'guid')
        };

        // Extract categories
        const categoryMatches = itemXml.match(/<category[^>]*>([^<]*)<\/category>/gi);
        if (categoryMatches) {
          item.category = categoryMatches.map(match => 
            match.replace(/<[^>]*>/g, '').trim()
          );
        }

        if (item.title && item.link) {
          items.push(item);
        }
      }

      return items;

    } catch (error) {
      console.error('RSS parsing failed:', error);
      return items;
    }
  }

  /**
   * Extract XML tag content
   */
  private extractXMLTag(xml: string, tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    
    if (match && match[1]) {
      // Clean up CDATA and HTML
      return match[1]
        .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
        .replace(/<[^>]*>/g, '')
        .trim();
    }
    
    return undefined;
  }

  /**
   * Convert RSS item to opportunity
   */
  private async convertRSSItemToOpportunity(
    item: RSSItem,
    source: BookmarkSource
  ): Promise<OpportunityData | null> {
    try {
      // Check if this looks like an artist opportunity
      const text = `${item.title} ${item.description}`.toLowerCase();
      const artKeywords = [
        'artist', 'art', 'creative', 'grant', 'fellowship', 'residency',
        'exhibition', 'gallery', 'museum', 'visual', 'opportunity'
      ];
      
      const hasArtKeywords = artKeywords.some(keyword => text.includes(keyword));
      
      if (!hasArtKeywords) {
        return null; // Skip non-art related items
      }

      // Create basic opportunity data
      const opportunity: OpportunityData = {
        title: item.title,
        description: item.description,
        url: item.link,
        organization: source.name,
        tags: item.category || [],
        sourceType: 'bookmark',
        sourceMetadata: {
          sourceName: source.name,
          sourceUrl: source.url,
          sourceType: 'rss',
          pubDate: item.pubDate,
          author: item.author,
          guid: item.guid,
          discoveredAt: new Date().toISOString()
        }
      };

      // Try to parse publication date as deadline (common for time-sensitive opportunities)
      if (item.pubDate) {
        try {
          const pubDate = new Date(item.pubDate);
          if (!isNaN(pubDate.getTime())) {
            // If published recently, might indicate a deadline is coming up
            const now = new Date();
            const daysSincePub = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSincePub < 30) { // Published within last 30 days
              // Try to extract deadline from content
              const deadlineMatch = item.description.match(/deadline[:\s]*([^.]+)/i);
              if (deadlineMatch) {
                const possibleDeadline = new Date(deadlineMatch[1]);
                if (!isNaN(possibleDeadline.getTime())) {
                  opportunity.deadline = possibleDeadline;
                }
              }
            }
          }
        } catch (error) {
          // Ignore date parsing errors
        }
      }

      // Clean the opportunity data
      const cleaningResult = await this.dataCleaner.clean(opportunity);
      
      if (!cleaningResult.success || !cleaningResult.data) {
        return null;
      }

      return cleaningResult.data;

    } catch (error) {
      console.error('Error converting RSS item to opportunity:', error);
      return null;
    }
  }

  /**
   * Check webpage for opportunities using selectors
   */
  private async checkWebpage(
    source: BookmarkSource,
    context?: DiscoveryContext
  ): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];

    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': this.checkerConfig.userAgent,
          'Accept': 'text/html,application/xhtml+xml'
        },
        signal: AbortSignal.timeout(this.checkerConfig.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Use DataExtractor to process the webpage
      const rawData: RawData = {
        content: html,
        contentType: 'html' as const,
        url: source.url,
        metadata: {
          sourceName: source.name,
          sourceType: 'bookmark_webpage'
        }
      };

      const extractionResult = await this.dataExtractor.extract(rawData, 'bookmark');
      
      if (extractionResult.success && extractionResult.data) {
        // Clean the extracted data
        const cleaningResult = await this.dataCleaner.clean(extractionResult.data);
        
        if (cleaningResult.success && cleaningResult.data) {
          // Add source metadata
          cleaningResult.data.sourceMetadata = {
            ...cleaningResult.data.sourceMetadata,
            sourceName: source.name,
            sourceUrl: source.url,
            bookmarkSource: true,
            discoveredAt: new Date().toISOString()
          };
          
          opportunities.push(cleaningResult.data);
        }
      }

      return opportunities;

    } catch (error) {
      console.error(`Error checking webpage ${source.name}:`, error);
      return opportunities;
    }
  }

  /**
   * Check sitemap for opportunities
   */
  private async checkSitemap(
    source: BookmarkSource,
    context?: DiscoveryContext
  ): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];

    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': this.checkerConfig.userAgent,
          'Accept': 'application/xml,text/xml'
        },
        signal: AbortSignal.timeout(this.checkerConfig.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlContent = await response.text();
      const urls = this.parseSitemap(xmlContent);
      
      console.log(`Found ${urls.length} URLs in sitemap ${source.name}`);

      // Check each URL (limit to avoid overwhelming)
      const urlsToCheck = urls.slice(0, 20); // Limit to 20 URLs per sitemap
      
      for (const url of urlsToCheck) {
        try {
          // Only check URLs that might contain opportunities
          if (this.isLikelyOpportunityUrl(url)) {
            const pageOpportunities = await this.checkWebpage({
              ...source,
              url: url
            }, context);
            
            opportunities.push(...pageOpportunities);
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.warn(`Failed to check sitemap URL ${url}:`, error);
        }
      }

      return opportunities;

    } catch (error) {
      console.error(`Error checking sitemap ${source.name}:`, error);
      return opportunities;
    }
  }

  /**
   * Parse sitemap XML
   */
  private parseSitemap(xmlContent: string): string[] {
    const urls: string[] = [];
    
    try {
      const urlRegex = /<url[\s\S]*?<\/url>/gi;
      const urlMatches = xmlContent.match(urlRegex) || [];

      for (const urlXml of urlMatches) {
        const loc = this.extractXMLTag(urlXml, 'loc');
        if (loc) {
          urls.push(loc);
        }
      }

      return urls;

    } catch (error) {
      console.error('Sitemap parsing failed:', error);
      return urls;
    }
  }

  /**
   * Check if URL is likely to contain opportunities
   */
  private isLikelyOpportunityUrl(url: string): boolean {
    const opportunityKeywords = [
      'opportunity', 'grant', 'fellowship', 'residency', 'competition',
      'call', 'application', 'funding', 'award', 'job', 'career'
    ];

    const urlLower = url.toLowerCase();
    return opportunityKeywords.some(keyword => urlLower.includes(keyword));
  }

  /**
   * Get default bookmark sources
   */
  private getDefaultBookmarkSources(): BookmarkSource[] {
    return [
      {
        id: 'nea-opportunities',
        name: 'National Endowment for the Arts',
        url: 'https://www.arts.gov/grants/grants-organizations/art-works',
        type: 'webpage',
        enabled: true,
        checkFrequency: 'weekly'
      },
      {
        id: 'artfund-opportunities',
        name: 'ArtFund Opportunities',
        url: 'https://www.artfund.org/opportunities',
        type: 'webpage',
        enabled: true,
        checkFrequency: 'daily'
      },
      {
        id: 'hyperallergic-opportunities',
        name: 'Hyperallergic Opportunities',
        url: 'https://hyperallergic.com/category/opportunities/',
        type: 'rss',
        enabled: true,
        checkFrequency: 'daily'
      },
      {
        id: 'artconnect-rss',
        name: 'ArtConnect RSS',
        url: 'https://www.artconnect.com/opportunities.rss',
        type: 'rss',
        enabled: true,
        checkFrequency: 'daily'
      },
      {
        id: 'caa-opportunities',
        name: 'College Art Association',
        url: 'https://collegeart.org/opportunities',
        type: 'webpage',
        enabled: true,
        checkFrequency: 'weekly'
      }
    ];
  }

  /**
   * Add a new bookmark source
   */
  addBookmarkSource(source: Omit<BookmarkSource, 'id'>): string {
    const id = crypto.randomUUID();
    const newSource: BookmarkSource = {
      ...source,
      id
    };
    
    this.checkerConfig.sources.push(newSource);
    return id;
  }

  /**
   * Remove a bookmark source
   */
  removeBookmarkSource(id: string): boolean {
    const index = this.checkerConfig.sources.findIndex(s => s.id === id);
    if (index >= 0) {
      this.checkerConfig.sources.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Update bookmark source
   */
  updateBookmarkSource(id: string, updates: Partial<BookmarkSource>): boolean {
    const source = this.checkerConfig.sources.find(s => s.id === id);
    if (source) {
      Object.assign(source, updates);
      return true;
    }
    return false;
  }

  /**
   * Get all bookmark sources
   */
  getBookmarkSources(): BookmarkSource[] {
    return [...this.checkerConfig.sources];
  }

  protected getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      rateLimit: 20, // 20 requests per minute
      timeout: 25000, // 25 seconds
      retryAttempts: 3
    };
  }
}