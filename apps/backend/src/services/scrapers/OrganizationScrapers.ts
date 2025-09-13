import { ScrapingFramework, ScrapingResult, ScrapingOptions } from '../scraper/ScrapingFramework';
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

export interface OpportunityData {
  title: string;
  description: string;
  url: string;
  organization: string;
  deadline?: Date;
  amount?: string;
  location?: string;
  requirements?: string[];
  category: 'grant' | 'residency' | 'exhibition' | 'fellowship' | 'competition' | 'award' | 'other';
  tags: string[];
  applicationUrl?: string;
  contactEmail?: string;
  sourceSpecificData?: any;
}

export interface ScrapingStrategy {
  name: string;
  baseUrl: string;
  listingPages: string[];
  selectors: {
    opportunityLinks?: string;
    title?: string;
    description?: string;
    deadline?: string;
    amount?: string;
    location?: string;
    requirements?: string;
    category?: string;
    applicationUrl?: string;
    contactEmail?: string;
  };
  pagination?: {
    nextPageSelector?: string;
    maxPages?: number;
    urlPattern?: string;
  };
  specialHandling?: 'javascript' | 'ajax' | 'form-submission' | 'infinite-scroll';
  rateLimitMs?: number;
}

/**
 * Organization-Specific Scrapers for Major Opportunity Sources
 */
export class OrganizationScrapers {
  private scrapingFramework: ScrapingFramework;
  private prisma: PrismaClient;
  
  // Major art opportunity sources with scraping strategies
  private strategies: ScrapingStrategy[] = [
    {
      name: 'Grants.gov Arts Grants',
      baseUrl: 'https://www.grants.gov',
      listingPages: [
        '/search-grants?cfda=45.024', // NEA grants
        '/search-grants?keywords=art%20artist%20creative'
      ],
      selectors: {
        opportunityLinks: '.grant-search-result h3 a',
        title: 'h1.grant-title, .grant-detail-title',
        description: '.grant-description, .opportunity-description',
        deadline: '.deadline-date, .close-date',
        amount: '.award-ceiling, .funding-amount',
        requirements: '.eligibility-requirements'
      },
      specialHandling: 'javascript',
      rateLimitMs: 3000
    },
    {
      name: 'Foundation Directory Online',
      baseUrl: 'https://fdo.foundationcenter.org',
      listingPages: ['/search'],
      selectors: {
        opportunityLinks: '.grant-listing a',
        title: '.grant-title',
        description: '.grant-description',
        amount: '.grant-amount',
        deadline: '.application-deadline'
      },
      specialHandling: 'javascript',
      rateLimitMs: 5000 // Respect their systems
    },
    {
      name: 'ResArtis Residencies',
      baseUrl: 'https://resartis.org',
      listingPages: ['/residencies/', '/opportunities/'],
      selectors: {
        opportunityLinks: '.residency-listing h3 a, .opportunity-link',
        title: 'h1.residency-title, .opportunity-title',
        description: '.residency-description, .opportunity-description',
        location: '.residency-location',
        deadline: '.application-deadline',
        requirements: '.eligibility, .application-requirements'
      },
      category: 'residency',
      rateLimitMs: 2000
    },
    {
      name: 'Alliance of Artist Communities',
      baseUrl: 'https://artistcommunities.org',
      listingPages: ['/residencies', '/opportunities'],
      selectors: {
        opportunityLinks: '.residency-card a, .opportunity-card a',
        title: 'h1, .page-title',
        description: '.description, .content',
        location: '.location',
        deadline: '.deadline',
        applicationUrl: 'a[href*="apply"], a[href*="application"]'
      },
      category: 'residency',
      rateLimitMs: 2000
    },
    {
      name: 'Call For Entry',
      baseUrl: 'https://www.callforentry.org',
      listingPages: ['/exhibitions.php', '/competitions.php'],
      selectors: {
        opportunityLinks: '.listing-title a',
        title: 'h1.exhibition-title',
        description: '.exhibition-description',
        deadline: '.entry-deadline',
        amount: '.entry-fee, .prize-amount',
        requirements: '.entry-requirements'
      },
      category: 'exhibition',
      rateLimitMs: 1500
    },
    {
      name: 'ArtSlant Competitions',
      baseUrl: 'https://www.artslant.com',
      listingPages: ['/comp/list'],
      selectors: {
        opportunityLinks: '.comp-item h3 a',
        title: 'h1.comp-title',
        description: '.comp-description',
        deadline: '.deadline-date',
        amount: '.prize-info',
        requirements: '.entry-requirements'
      },
      category: 'competition',
      rateLimitMs: 2000
    },
    {
      name: 'Artist Communities Alliance',
      baseUrl: 'https://www.artistcommunitiesalliance.org',
      listingPages: ['/residencies/'],
      selectors: {
        opportunityLinks: '.residency-listing a',
        title: 'h1',
        description: '.residency-info',
        location: '.location-info',
        deadline: '.deadline-info'
      },
      category: 'residency',
      rateLimitMs: 2000
    },
    {
      name: 'Art Opportunities Monthly',
      baseUrl: 'https://www.artopportunitiesmonthly.com',
      listingPages: ['/competitions', '/exhibitions', '/residencies'],
      selectors: {
        opportunityLinks: '.opportunity-link',
        title: '.opportunity-title',
        description: '.opportunity-description',
        deadline: '.deadline',
        amount: '.fee-prize'
      },
      rateLimitMs: 1000
    }
  ];

  constructor(scrapingFramework: ScrapingFramework, prisma: PrismaClient) {
    this.scrapingFramework = scrapingFramework;
    this.prisma = prisma;
  }

  /**
   * Scrape all configured organizations
   */
  async scrapeAllOrganizations(): Promise<{ organization: string; opportunities: OpportunityData[] }[]> {
    const results = [];
    
    for (const strategy of this.strategies) {
      try {
        console.log(`🎯 Starting scrape for ${strategy.name}`);
        const opportunities = await this.scrapeOrganization(strategy);
        results.push({
          organization: strategy.name,
          opportunities
        });
        
        // Rate limiting between organizations
        await new Promise(resolve => setTimeout(resolve, strategy.rateLimitMs || 2000));
        
      } catch (error) {
        console.error(`❌ Failed to scrape ${strategy.name}:`, error);
        results.push({
          organization: strategy.name,
          opportunities: []
        });
      }
    }
    
    return results;
  }

  /**
   * Scrape specific organization
   */
  async scrapeOrganization(strategy: ScrapingStrategy): Promise<OpportunityData[]> {
    const sessionId = await this.scrapingFramework.createSession({
      enableJavaScript: strategy.specialHandling === 'javascript',
      timeout: 15000,
      delay: { min: 1000, max: 3000 }
    });

    try {
      const opportunities: OpportunityData[] = [];
      
      // Scrape each listing page
      for (const listingPage of strategy.listingPages) {
        const fullUrl = listingPage.startsWith('http') 
          ? listingPage 
          : `${strategy.baseUrl}${listingPage}`;
        
        console.log(`📄 Scraping listing page: ${fullUrl}`);
        
        const listingResult = await this.scrapingFramework.scrapeUrl(sessionId, fullUrl, {
          enableJavaScript: strategy.specialHandling === 'javascript',
          waitForSelector: strategy.selectors.opportunityLinks,
          scrollToBottom: strategy.specialHandling === 'infinite-scroll'
        });

        if (listingResult.success) {
          const opportunityUrls = this.extractOpportunityUrls(listingResult, strategy);
          console.log(`🔗 Found ${opportunityUrls.length} opportunity URLs`);
          
          // Scrape individual opportunities
          for (const oppUrl of opportunityUrls.slice(0, 20)) { // Limit to first 20
            try {
              const oppResult = await this.scrapingFramework.scrapeUrl(sessionId, oppUrl, {
                enableJavaScript: strategy.specialHandling === 'javascript',
                timeout: 10000
              });
              
              if (oppResult.success) {
                const opportunity = this.extractOpportunityData(oppResult, strategy);
                if (opportunity && this.validateOpportunity(opportunity)) {
                  opportunities.push(opportunity);
                }
              }
              
              // Rate limiting between opportunities
              await new Promise(resolve => setTimeout(resolve, strategy.rateLimitMs || 1000));
              
            } catch (error) {
              console.warn(`⚠️ Failed to scrape opportunity ${oppUrl}:`, error);
            }
          }
        }
      }
      
      console.log(`✅ Scraped ${opportunities.length} opportunities from ${strategy.name}`);
      return opportunities;
      
    } finally {
      await this.scrapingFramework.closeSession(sessionId);
    }
  }

  /**
   * Extract opportunity URLs from listing page
   */
  private extractOpportunityUrls(result: ScrapingResult, strategy: ScrapingStrategy): string[] {
    if (!result.data?.html || !strategy.selectors.opportunityLinks) {
      return [];
    }

    const $ = cheerio.load(result.data.html);
    const urls: string[] = [];
    
    $(strategy.selectors.opportunityLinks).each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const fullUrl = href.startsWith('http') 
          ? href 
          : href.startsWith('/') 
            ? `${strategy.baseUrl}${href}` 
            : `${strategy.baseUrl}/${href}`;
        urls.push(fullUrl);
      }
    });

    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Extract structured opportunity data
   */
  private extractOpportunityData(result: ScrapingResult, strategy: ScrapingStrategy): OpportunityData | null {
    if (!result.data?.html) return null;

    const $ = cheerio.load(result.data.html);
    
    try {
      const title = this.extractTextBySelector($, strategy.selectors.title) || 
                    result.data.title || 
                    'Untitled Opportunity';
      
      if (!title || title.length < 10) return null;

      const description = this.extractTextBySelector($, strategy.selectors.description) || 
                         result.data.text?.substring(0, 1000) || 
                         'No description available';

      const opportunity: OpportunityData = {
        title: title.substring(0, 255),
        description: description.substring(0, 2000),
        url: result.url,
        organization: strategy.name,
        deadline: this.extractDate($, strategy.selectors.deadline),
        amount: this.extractTextBySelector($, strategy.selectors.amount),
        location: this.extractTextBySelector($, strategy.selectors.location),
        requirements: this.extractRequirements($, strategy.selectors.requirements),
        category: (strategy as any).category || this.inferCategory(title, description),
        tags: this.generateTags(title, description, strategy.name),
        applicationUrl: this.extractApplicationUrl($, strategy.selectors.applicationUrl, result.url),
        contactEmail: this.extractEmail($, strategy.selectors.contactEmail),
        sourceSpecificData: {
          scrapedAt: new Date(),
          strategy: strategy.name,
          selectors: strategy.selectors
        }
      };

      return opportunity;
      
    } catch (error) {
      console.error(`Failed to extract opportunity data from ${result.url}:`, error);
      return null;
    }
  }

  /**
   * Extract text content using CSS selector
   */
  private extractTextBySelector($: cheerio.CheerioAPI, selector?: string): string | undefined {
    if (!selector) return undefined;
    
    const element = $(selector).first();
    if (element.length === 0) return undefined;
    
    return element.text().trim() || undefined;
  }

  /**
   * Extract and parse date
   */
  private extractDate($: cheerio.CheerioAPI, selector?: string): Date | undefined {
    const dateText = this.extractTextBySelector($, selector);
    if (!dateText) return undefined;
    
    // Common date patterns
    const patterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
      /(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i
    ];
    
    for (const pattern of patterns) {
      const match = dateText.match(pattern);
      if (match) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime()) && parsed > new Date()) {
          return parsed;
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extract requirements list
   */
  private extractRequirements($: cheerio.CheerioAPI, selector?: string): string[] {
    if (!selector) return [];
    
    const requirements: string[] = [];
    
    $(selector).each((_, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 10) {
        // Split by common delimiters
        const split = text.split(/[•\n\r]/).filter(req => req.trim().length > 10);
        requirements.push(...split.map(req => req.trim().substring(0, 200)));
      }
    });
    
    return requirements.slice(0, 5);
  }

  /**
   * Extract application URL
   */
  private extractApplicationUrl($: cheerio.CheerioAPI, selector?: string, baseUrl?: string): string | undefined {
    if (!selector) return undefined;
    
    const link = $(selector).first();
    const href = link.attr('href');
    
    if (href) {
      if (href.startsWith('http')) return href;
      if (href.startsWith('/') && baseUrl) {
        const base = new URL(baseUrl);
        return `${base.protocol}//${base.host}${href}`;
      }
    }
    
    return undefined;
  }

  /**
   * Extract email address
   */
  private extractEmail($: cheerio.CheerioAPI, selector?: string): string | undefined {
    const text = selector ? this.extractTextBySelector($, selector) : $.text();
    if (!text) return undefined;
    
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailPattern);
    return match?.[0];
  }

  /**
   * Infer category from content
   */
  private inferCategory(title: string, description: string): OpportunityData['category'] {
    const content = `${title} ${description}`.toLowerCase();
    
    if (content.includes('grant') || content.includes('funding')) return 'grant';
    if (content.includes('residency') || content.includes('residence')) return 'residency';
    if (content.includes('exhibition') || content.includes('show')) return 'exhibition';
    if (content.includes('fellowship')) return 'fellowship';
    if (content.includes('competition') || content.includes('contest')) return 'competition';
    if (content.includes('award') || content.includes('prize')) return 'award';
    
    return 'other';
  }

  /**
   * Generate relevant tags
   */
  private generateTags(title: string, description: string, organization: string): string[] {
    const content = `${title} ${description}`.toLowerCase();
    const tags: string[] = [];
    
    // Add organization tag
    tags.push(organization.toLowerCase().replace(/\s+/g, '-'));
    
    // Content-based tags
    const tagKeywords = [
      'emerging', 'established', 'international', 'national', 'local',
      'contemporary', 'traditional', 'experimental', 'conceptual',
      'digital', 'new media', 'painting', 'sculpture', 'photography',
      'performance', 'installation', 'video', 'multimedia',
      'solo', 'group', 'juried', 'invitational'
    ];
    
    for (const keyword of tagKeywords) {
      if (content.includes(keyword)) {
        tags.push(keyword);
      }
    }
    
    return tags.slice(0, 8);
  }

  /**
   * Validate opportunity data quality
   */
  private validateOpportunity(opportunity: OpportunityData): boolean {
    // Basic validation rules
    if (!opportunity.title || opportunity.title.length < 10) return false;
    if (!opportunity.description || opportunity.description.length < 50) return false;
    if (!opportunity.url || !opportunity.url.startsWith('http')) return false;
    
    // Content quality checks
    const title = opportunity.title.toLowerCase();
    const description = opportunity.description.toLowerCase();
    
    // Must contain art-relevant keywords
    const artKeywords = ['art', 'artist', 'exhibition', 'gallery', 'creative', 'visual', 'contemporary', 'fine art'];
    const hasArtKeyword = artKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
    
    if (!hasArtKeyword) return false;
    
    // Must contain opportunity keywords
    const oppKeywords = ['apply', 'submit', 'call', 'opportunity', 'grant', 'residency', 'exhibition', 'competition'];
    const hasOppKeyword = oppKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
    
    return hasOppKeyword;
  }

  /**
   * Store scraped opportunities in database
   */
  async storeOpportunities(organizationResults: { organization: string; opportunities: OpportunityData[] }[]): Promise<number> {
    let totalStored = 0;
    
    for (const result of organizationResults) {
      for (const opportunity of result.opportunities) {
        try {
          // Check if already exists
          const existing = await this.prisma.opportunity.findFirst({
            where: { url: opportunity.url }
          });
          
          if (!existing) {
            await this.prisma.opportunity.create({
              data: {
                title: opportunity.title,
                description: opportunity.description,
                url: opportunity.url,
                organization: opportunity.organization,
                deadline: opportunity.deadline,
                amount: opportunity.amount,
                location: opportunity.location,
                tags: opportunity.tags,
                sourceType: 'webscraping',
                sourceUrl: opportunity.url,
                processed: true,
                sourceMetadata: {
                  category: opportunity.category,
                  requirements: opportunity.requirements,
                  applicationUrl: opportunity.applicationUrl,
                  contactEmail: opportunity.contactEmail,
                  sourceSpecificData: opportunity.sourceSpecificData,
                  scrapedAt: new Date()
                }
              }
            });
            totalStored++;
          }
        } catch (error) {
          console.error(`Failed to store opportunity "${opportunity.title}":`, error);
        }
      }
    }
    
    console.log(`💾 Stored ${totalStored} new opportunities from organization scrapers`);
    return totalStored;
  }

  /**
   * Get scraping statistics
   */
  getScrapingStats(): { totalStrategies: number; activeStrategies: number } {
    return {
      totalStrategies: this.strategies.length,
      activeStrategies: this.strategies.filter(s => s.listingPages.length > 0).length
    };
  }

  /**
   * Update scraping strategy
   */
  updateStrategy(name: string, updates: Partial<ScrapingStrategy>): boolean {
    const index = this.strategies.findIndex(s => s.name === name);
    if (index !== -1) {
      this.strategies[index] = { ...this.strategies[index], ...updates };
      return true;
    }
    return false;
  }

  /**
   * Add new scraping strategy
   */
  addStrategy(strategy: ScrapingStrategy): void {
    this.strategies.push(strategy);
  }
}

export const organizationScrapers = new OrganizationScrapers(
  new ScrapingFramework(new PrismaClient()),
  new PrismaClient()
);