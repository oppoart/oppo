import { PrismaClient } from '@prisma/client';
import { ScrapingFramework } from '../scraper/ScrapingFramework';
import { DataValidationService } from '../validation/DataValidationService';
import { v4 as uuidv4 } from 'uuid';

interface BookmarkPortal {
  id: string;
  name: string;
  baseUrl: string;
  type: 'curated-list' | 'resource-hub' | 'opportunity-aggregator' | 'newsletter-archive';
  listingPages: string[];
  selectors: {
    listContainer?: string;
    itemContainer: string;
    title: string;
    link?: string;
    description?: string;
    category?: string;
    tags?: string;
    date?: string;
    source?: string;
    author?: string;
  };
  pagination?: {
    type: 'numbered' | 'load-more' | 'infinite-scroll';
    nextPageSelector?: string;
    maxPages?: number;
  };
  extractionRules?: {
    dateFormat?: string;
    linkPrefix?: string;
    categoryMapping?: Record<string, string>;
  };
}

export interface BookmarkItem {
  id: string;
  portalId: string;
  portalName: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
  tags: string[];
  sourceDate?: Date;
  author?: string;
  metadata: Record<string, any>;
  qualityScore: number;
  scrapedAt: Date;
}

export interface BookmarkScrapingResult {
  portalId: string;
  portalName: string;
  itemsFound: number;
  itemsSaved: number;
  duplicatesSkipped: number;
  errors: string[];
  duration: number;
}

export class BookmarkScraperService {
  private scraper: ScrapingFramework;
  private validator: DataValidationService;
  private sessionId: string;

  // Predefined list of bookmark portals to scrape
  private portals: BookmarkPortal[] = [
    {
      id: 'hyperallergic-opportunities',
      name: 'Hyperallergic Opportunities',
      baseUrl: 'https://hyperallergic.com',
      type: 'curated-list',
      listingPages: [
        '/opportunities/',
        '/tag/open-calls/',
        '/tag/artist-opportunities/'
      ],
      selectors: {
        listContainer: 'main.content',
        itemContainer: 'article.post',
        title: 'h2.entry-title a',
        link: 'h2.entry-title a',
        description: '.entry-summary',
        category: '.category-label',
        tags: '.tags a',
        date: 'time.entry-date',
        author: '.author-name'
      },
      pagination: {
        type: 'numbered',
        nextPageSelector: '.pagination a.next',
        maxPages: 5
      }
    },
    {
      id: 'artrabbit-opportunities',
      name: 'ArtRabbit Opportunities',
      baseUrl: 'https://www.artrabbit.com',
      type: 'opportunity-aggregator',
      listingPages: [
        '/opportunities',
        '/calls',
        '/residencies'
      ],
      selectors: {
        itemContainer: '.opportunity-item',
        title: '.opportunity-title',
        link: '.opportunity-link',
        description: '.opportunity-description',
        category: '.opportunity-type',
        tags: '.opportunity-tags span',
        date: '.deadline-date',
        source: '.opportunity-org'
      },
      extractionRules: {
        linkPrefix: 'https://www.artrabbit.com'
      }
    },
    {
      id: 'wooloo-opportunities',
      name: 'Wooloo.org',
      baseUrl: 'https://wooloo.org',
      type: 'curated-list',
      listingPages: [
        '/calls/',
        '/residencies/',
        '/grants/',
        '/jobs/'
      ],
      selectors: {
        itemContainer: '.post-item',
        title: '.post-title a',
        link: '.post-title a',
        description: '.post-excerpt',
        category: '.post-category',
        date: '.post-date',
        tags: '.post-tags a'
      },
      pagination: {
        type: 'load-more',
        nextPageSelector: '.load-more-button',
        maxPages: 3
      }
    },
    {
      id: 'artconnect-opportunities',
      name: 'ArtConnect Opportunities',
      baseUrl: 'https://www.artconnect.com',
      type: 'opportunity-aggregator',
      listingPages: [
        '/opportunities',
        '/opencalls',
        '/competitions'
      ],
      selectors: {
        itemContainer: '.opportunity-card',
        title: '.card-title',
        link: 'a.card-link',
        description: '.card-description',
        category: '.opportunity-category',
        date: '.deadline',
        source: '.organization-name',
        tags: '.tag-list .tag'
      },
      extractionRules: {
        dateFormat: 'MM/DD/YYYY',
        categoryMapping: {
          'Open Call': 'exhibition',
          'Competition': 'competition',
          'Residency': 'residency'
        }
      }
    },
    {
      id: 'curatorspace',
      name: 'CuratorSpace',
      baseUrl: 'https://www.curatorspace.com',
      type: 'opportunity-aggregator',
      listingPages: [
        '/opportunities/all',
        '/opportunities/exhibitions',
        '/opportunities/residencies',
        '/opportunities/prizes'
      ],
      selectors: {
        listContainer: '.opportunities-list',
        itemContainer: '.opportunity',
        title: '.opportunity-title a',
        link: '.opportunity-title a',
        description: '.opportunity-description',
        category: '.opportunity-type-label',
        date: '.deadline-info',
        source: '.venue-name',
        tags: '.opportunity-tags .tag'
      },
      pagination: {
        type: 'numbered',
        nextPageSelector: '.pagination .next-page',
        maxPages: 10
      }
    },
    {
      id: 'artdeadline',
      name: 'Art Deadline',
      baseUrl: 'https://artdeadline.com',
      type: 'newsletter-archive',
      listingPages: [
        '/opportunities',
        '/calendar'
      ],
      selectors: {
        itemContainer: '.opp-item',
        title: '.opp-title',
        link: '.opp-link',
        description: '.opp-desc',
        category: '.opp-category',
        date: '.opp-deadline',
        source: '.opp-source'
      },
      pagination: {
        type: 'infinite-scroll',
        maxPages: 5
      }
    },
    {
      id: 'artquest-opportunities',
      name: 'Artquest Opportunities',
      baseUrl: 'https://www.artquest.org.uk',
      type: 'resource-hub',
      listingPages: [
        '/opportunities',
        '/opportunities/funding',
        '/opportunities/residencies',
        '/opportunities/competitions'
      ],
      selectors: {
        itemContainer: '.opportunity-listing',
        title: 'h3.opportunity-title a',
        link: 'h3.opportunity-title a',
        description: '.opportunity-summary',
        category: '.opportunity-type',
        date: '.deadline-date',
        tags: '.opportunity-keywords span'
      },
      extractionRules: {
        linkPrefix: 'https://www.artquest.org.uk'
      }
    },
    {
      id: 'creative-opportunities',
      name: 'Creative Opportunities',
      baseUrl: 'https://www.creative-opportunities.com',
      type: 'opportunity-aggregator',
      listingPages: [
        '/opportunities',
        '/latest',
        '/closing-soon'
      ],
      selectors: {
        itemContainer: '.co-opportunity',
        title: '.co-title',
        link: '.co-link',
        description: '.co-description',
        category: '.co-type',
        date: '.co-deadline',
        source: '.co-organization',
        tags: '.co-tags .tag'
      },
      pagination: {
        type: 'numbered',
        nextPageSelector: 'a.pagination-next',
        maxPages: 8
      }
    }
  ];

  constructor(
    private prisma: PrismaClient,
    private options: {
      enableCaching?: boolean;
      cacheExpiry?: number;
      maxConcurrent?: number;
      enableMetrics?: boolean;
    } = {}
  ) {
    this.scraper = new ScrapingFramework(prisma);
    this.validator = new DataValidationService(prisma);
    this.sessionId = uuidv4();
  }

  /**
   * Scrape all configured bookmark portals
   */
  async scrapeAllPortals(): Promise<BookmarkScrapingResult[]> {
    const results: BookmarkScrapingResult[] = [];
    
    for (const portal of this.portals) {
      try {
        const result = await this.scrapePortal(portal);
        results.push(result);
        
        // Delay between portals to avoid rate limiting
        await this.delay(5000);
      } catch (error) {
        console.error(`Failed to scrape portal ${portal.name}:`, error);
        results.push({
          portalId: portal.id,
          portalName: portal.name,
          itemsFound: 0,
          itemsSaved: 0,
          duplicatesSkipped: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          duration: 0
        });
      }
    }
    
    return results;
  }

  /**
   * Scrape a specific portal by ID
   */
  async scrapePortalById(portalId: string): Promise<BookmarkScrapingResult> {
    const portal = this.portals.find(p => p.id === portalId);
    if (!portal) {
      throw new Error(`Portal with ID ${portalId} not found`);
    }
    
    return this.scrapePortal(portal);
  }

  /**
   * Scrape a single bookmark portal
   */
  private async scrapePortal(portal: BookmarkPortal): Promise<BookmarkScrapingResult> {
    const startTime = Date.now();
    const items: BookmarkItem[] = [];
    const errors: string[] = [];
    
    console.log(`Starting to scrape ${portal.name}...`);
    
    for (const listingPage of portal.listingPages) {
      try {
        const pageItems = await this.scrapeListingPage(portal, listingPage);
        items.push(...pageItems);
        
        // Delay between pages
        await this.delay(2000);
      } catch (error) {
        const errorMsg = `Failed to scrape ${listingPage}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Save items to database
    const saveResult = await this.saveBookmarkItems(items);
    
    const duration = Date.now() - startTime;
    
    return {
      portalId: portal.id,
      portalName: portal.name,
      itemsFound: items.length,
      itemsSaved: saveResult.saved,
      duplicatesSkipped: saveResult.duplicates,
      errors,
      duration
    };
  }

  /**
   * Scrape a single listing page from a portal
   */
  private async scrapeListingPage(
    portal: BookmarkPortal,
    listingPath: string
  ): Promise<BookmarkItem[]> {
    const items: BookmarkItem[] = [];
    const url = `${portal.baseUrl}${listingPath}`;
    
    let currentPage = 1;
    let hasNextPage = true;
    
    while (hasNextPage && currentPage <= (portal.pagination?.maxPages || 1)) {
      const pageUrl = currentPage === 1 ? url : `${url}?page=${currentPage}`;
      
      try {
        // Scrape the page
        const result = await this.scraper.scrapeUrl(this.sessionId, pageUrl, {
          waitForSelector: portal.selectors.itemContainer,
          timeout: 30000
        });
        
        if (!result.success || !result.data?.html) {
          console.warn(`Failed to scrape ${pageUrl}`);
          break;
        }
        
        // Parse the content
        const pageItems = await this.parseBookmarkItems(result.data.html, portal);
        items.push(...pageItems);
        
        // Check for next page
        if (portal.pagination?.type === 'numbered' && portal.pagination.nextPageSelector) {
          hasNextPage = result.data.html.includes(portal.pagination.nextPageSelector);
        } else {
          hasNextPage = false;
        }
        
        currentPage++;
        
        // Delay between pages
        await this.delay(1000);
      } catch (error) {
        console.error(`Error scraping page ${currentPage} of ${pageUrl}:`, error);
        break;
      }
    }
    
    return items;
  }

  /**
   * Parse bookmark items from HTML content
   */
  private async parseBookmarkItems(
    html: string,
    portal: BookmarkPortal
  ): Promise<BookmarkItem[]> {
    const items: BookmarkItem[] = [];
    const { load } = await import('cheerio');
    const $ = load(html);
    
    const container = portal.selectors.listContainer 
      ? $(portal.selectors.listContainer) 
      : $('body');
    
    container.find(portal.selectors.itemContainer).each((_, element) => {
      try {
        const $item = $(element);
        
        // Extract basic fields
        const title = $item.find(portal.selectors.title).text().trim();
        if (!title) return;
        
        let url = portal.selectors.link 
          ? $item.find(portal.selectors.link).attr('href') || ''
          : '';
        
        // Apply link prefix if needed
        if (url && portal.extractionRules?.linkPrefix && !url.startsWith('http')) {
          url = portal.extractionRules.linkPrefix + url;
        }
        
        const description = portal.selectors.description 
          ? $item.find(portal.selectors.description).text().trim()
          : undefined;
        
        const category = portal.selectors.category
          ? $item.find(portal.selectors.category).text().trim()
          : undefined;
        
        // Extract tags
        const tags: string[] = [];
        if (portal.selectors.tags) {
          $item.find(portal.selectors.tags).each((_, tagEl) => {
            const tag = $(tagEl).text().trim();
            if (tag) tags.push(tag);
          });
        }
        
        // Extract date
        let sourceDate: Date | undefined;
        if (portal.selectors.date) {
          const dateText = $item.find(portal.selectors.date).text().trim();
          if (dateText) {
            sourceDate = this.parseDate(dateText, portal.extractionRules?.dateFormat);
          }
        }
        
        // Extract source/author
        const source = portal.selectors.source
          ? $item.find(portal.selectors.source).text().trim()
          : undefined;
        
        const author = portal.selectors.author
          ? $item.find(portal.selectors.author).text().trim()
          : undefined;
        
        // Apply category mapping if defined
        let mappedCategory = category;
        if (category && portal.extractionRules?.categoryMapping) {
          mappedCategory = portal.extractionRules.categoryMapping[category] || category;
        }
        
        // Calculate quality score based on completeness
        const qualityScore = this.calculateBookmarkQuality({
          title,
          url,
          description,
          category: mappedCategory,
          tags,
          sourceDate,
          author
        });
        
        // Create bookmark item
        const item: BookmarkItem = {
          id: uuidv4(),
          portalId: portal.id,
          portalName: portal.name,
          title,
          url,
          description,
          category: mappedCategory,
          tags,
          sourceDate,
          author,
          metadata: {
            source,
            portalType: portal.type,
            extractedAt: new Date().toISOString()
          },
          qualityScore,
          scrapedAt: new Date()
        };
        
        items.push(item);
      } catch (error) {
        console.error(`Error parsing item from ${portal.name}:`, error);
      }
    });
    
    return items;
  }

  /**
   * Parse date from text using specified format
   */
  private parseDate(dateText: string, format?: string): Date | undefined {
    try {
      // Try common date parsing
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Try format-specific parsing if provided
      if (format) {
        // Simple format parser (would need a proper date parsing library in production)
        // This is a simplified version
        return new Date(dateText);
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Calculate quality score for a bookmark item
   */
  private calculateBookmarkQuality(item: Partial<BookmarkItem>): number {
    let score = 0;
    let maxScore = 0;
    
    // Title (required, 30 points)
    if (item.title && item.title.length > 10) {
      score += 30;
    }
    maxScore += 30;
    
    // URL (required, 20 points)
    if (item.url && item.url.startsWith('http')) {
      score += 20;
    }
    maxScore += 20;
    
    // Description (15 points)
    if (item.description && item.description.length > 50) {
      score += 15;
    }
    maxScore += 15;
    
    // Category (10 points)
    if (item.category) {
      score += 10;
    }
    maxScore += 10;
    
    // Tags (10 points)
    if (item.tags && item.tags.length > 0) {
      score += Math.min(10, item.tags.length * 2);
    }
    maxScore += 10;
    
    // Date (10 points)
    if (item.sourceDate) {
      score += 10;
    }
    maxScore += 10;
    
    // Author/Source (5 points)
    if (item.author) {
      score += 5;
    }
    maxScore += 5;
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Save bookmark items to database
   */
  private async saveBookmarkItems(
    items: BookmarkItem[]
  ): Promise<{ saved: number; duplicates: number }> {
    let saved = 0;
    let duplicates = 0;
    
    for (const item of items) {
      try {
        // Check for duplicates based on URL
        const existing = await this.prisma.bookmark.findFirst({
          where: {
            url: item.url
          }
        });
        
        if (existing) {
          duplicates++;
          
          // Update if quality score is better
          if (item.qualityScore > (existing.metadata as any)?.qualityScore) {
            await this.prisma.bookmark.update({
              where: { id: existing.id },
              data: {
                title: item.title,
                description: item.description,
                tags: item.tags,
                metadata: item.metadata as any,
                updatedAt: new Date()
              }
            });
          }
          
          continue;
        }
        
        // Save new bookmark
        await this.prisma.bookmark.create({
          data: {
            title: item.title,
            url: item.url,
            description: item.description,
            category: item.category,
            tags: item.tags,
            source: item.portalName,
            metadata: item.metadata as any,
            isPublic: true, // Make scraped bookmarks public by default
            createdAt: item.scrapedAt
          }
        });
        
        saved++;
      } catch (error) {
        console.error(`Failed to save bookmark item:`, error);
      }
    }
    
    return { saved, duplicates };
  }

  /**
   * Get list of configured portals
   */
  getConfiguredPortals(): Array<{
    id: string;
    name: string;
    type: string;
    baseUrl: string;
    listingPagesCount: number;
  }> {
    return this.portals.map(portal => ({
      id: portal.id,
      name: portal.name,
      type: portal.type,
      baseUrl: portal.baseUrl,
      listingPagesCount: portal.listingPages.length
    }));
  }

  /**
   * Add a new portal configuration
   */
  addPortal(portal: BookmarkPortal): void {
    const existingIndex = this.portals.findIndex(p => p.id === portal.id);
    if (existingIndex >= 0) {
      this.portals[existingIndex] = portal;
    } else {
      this.portals.push(portal);
    }
  }

  /**
   * Remove a portal configuration
   */
  removePortal(portalId: string): boolean {
    const initialLength = this.portals.length;
    this.portals = this.portals.filter(p => p.id !== portalId);
    return this.portals.length < initialLength;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.scraper.cleanup();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}