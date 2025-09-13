import FirecrawlApp from '@mendable/firecrawl-js';
import * as cheerio from 'cheerio';
import { chromium, Browser, Page } from 'playwright';
import {
  SCRAPING_METHODS,
  EXTRACTION_PATTERNS,
  CONTENT_FILTERS,
  ART_KEYWORDS,
  CONTENT_LIMITS,
  DEFAULT_USER_AGENT,
  DEFAULT_TIMEOUTS,
} from '../../../../../packages/shared/src/constants/scraper.constants';

export interface ScrapedOpportunity {
  title: string;
  description: string;
  url: string;
  organization?: string;
  deadline?: Date;
  amount?: string;
  location?: string;
  requirements?: string[];
  category?: string;
  tags?: string[];
  applicationUrl?: string;
  contactEmail?: string;
  rawContent: string;
  scrapingMethod: keyof typeof SCRAPING_METHODS;
  scrapedAt: Date;
  success: boolean;
  error?: string;
}

export interface ScrapeResult {
  success: boolean;
  opportunity?: ScrapedOpportunity;
  error?: string;
  method: string;
  processingTime: number;
}

export class WebScraperService {
  private firecrawl: FirecrawlApp | null = null;
  private browser: Browser | null = null;

  constructor() {
    // Initialize Firecrawl if API key is available
    if (process.env.FIRECRAWL_API_KEY && process.env.FIRECRAWL_API_KEY !== 'your_firecrawl_api_key') {
      try {
        this.firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
        console.log('🔥 Firecrawl initialized successfully');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Firecrawl:', error);
      }
    } else {
      console.warn('⚠️ No Firecrawl API key provided, using fallback methods');
    }
  }

  /**
   * Main scraping method - tries multiple approaches
   */
  async scrapeOpportunity(url: string): Promise<ScrapeResult> {
    const startTime = Date.now();
    
    console.log(`🕷️ Starting scrape for: ${url}`);

    // Try Firecrawl first (most reliable)
    if (this.firecrawl) {
      try {
        const result = await this.scrapeWithFirecrawl(url);
        const processingTime = Date.now() - startTime;
        if (result.success) {
          console.log(`✅ Firecrawl success for ${url} in ${processingTime}ms`);
          return { ...result, processingTime };
        }
      } catch (error) {
        console.warn(`⚠️ Firecrawl failed for ${url}:`, error);
      }
    }

    // Fallback to Playwright
    try {
      const result = await this.scrapeWithPlaywright(url);
      const processingTime = Date.now() - startTime;
      if (result.success) {
        console.log(`✅ Playwright success for ${url} in ${processingTime}ms`);
        return { ...result, processingTime };
      }
    } catch (error) {
      console.warn(`⚠️ Playwright failed for ${url}:`, error);
    }

    // Final fallback to simple HTTP + Cheerio
    try {
      const result = await this.scrapeWithCheerio(url);
      const processingTime = Date.now() - startTime;
      console.log(`✅ Cheerio completed for ${url} in ${processingTime}ms`);
      return { ...result, processingTime };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ All scraping methods failed for ${url}:`, error);
      return {
        success: false,
        error: `All scraping methods failed: ${error}`,
        method: 'failed',
        processingTime
      };
    }
  }

  /**
   * Scrape using Firecrawl (most reliable, handles JS, paywalls, etc.)
   */
  private async scrapeWithFirecrawl(url: string): Promise<ScrapeResult> {
    if (!this.firecrawl) {
      return { success: false, error: 'Firecrawl not initialized', method: 'firecrawl', processingTime: 0 };
    }

    const scrapeResult = await this.firecrawl.scrapeUrl(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      includeTags: CONTENT_FILTERS.INCLUDE_TAGS,
      excludeTags: CONTENT_FILTERS.EXCLUDE_TAGS
    });

    if (!scrapeResult.success) {
      return { success: false, error: scrapeResult.error || 'Firecrawl failed', method: 'firecrawl', processingTime: 0 };
    }

    const opportunity = this.extractOpportunityData(
      scrapeResult.markdown || '',
      scrapeResult.html || '',
      url,
      'firecrawl'
    );

    return {
      success: true,
      opportunity,
      method: 'firecrawl',
      processingTime: 0
    };
  }

  /**
   * Scrape using Playwright (handles JS-heavy sites)
   */
  private async scrapeWithPlaywright(url: string): Promise<ScrapeResult> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }

    const page = await this.browser.newPage();
    
    try {
      // Set a realistic user agent
      await page.setUserAgent(DEFAULT_USER_AGENT);
      
      // Navigate with timeout
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUTS.PAGE_LOAD });
      
      // Wait for content to load
      await page.waitForTimeout(DEFAULT_TIMEOUTS.ELEMENT_WAIT);
      
      // Extract content
      const content = await page.evaluate(() => {
        // Remove unwanted elements
        const unwantedSelectors = CONTENT_FILTERS.UNWANTED_SELECTORS;
        unwantedSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        return {
          title: document.title,
          html: document.documentElement.outerHTML,
          text: document.body?.innerText || ''
        };
      });

      const opportunity = this.extractOpportunityData(
        content.text,
        content.html,
        url,
        'playwright'
      );

      return {
        success: true,
        opportunity,
        method: 'playwright',
        processingTime: 0
      };
      
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape using simple HTTP + Cheerio (basic fallback)
   */
  private async scrapeWithCheerio(url: string): Promise<ScrapeResult> {
    const axios = require('axios');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT
      },
      timeout: DEFAULT_TIMEOUTS.HTTP_REQUEST
    });

    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $(CONTENT_FILTERS.UNWANTED_SELECTORS.join(', ')).remove();
    
    const content = {
      title: $('title').text() || $('h1').first().text(),
      html: $.html(),
      text: $('body').text()
    };

    const opportunity = this.extractOpportunityData(
      content.text,
      content.html,
      url,
      'cheerio'
    );

    return {
      success: true,
      opportunity,
      method: 'cheerio',
      processingTime: 0
    };
  }

  /**
   * Extract structured opportunity data from scraped content
   */
  private extractOpportunityData(
    textContent: string, 
    htmlContent: string, 
    url: string, 
    method: ScrapedOpportunity['scrapingMethod']
  ): ScrapedOpportunity {
    const $ = cheerio.load(htmlContent);
    
    // Extract title
    const title = $('h1').first().text().trim() || 
                  $('title').text().trim() || 
                  textContent.split('\n')[0]?.trim() || 
                  'Untitled Opportunity';

    // Extract organization
    const organization = this.extractOrganization(textContent, $);
    
    // Extract deadline
    const deadline = this.extractDeadline(textContent, $);
    
    // Extract amount/funding
    const amount = this.extractAmount(textContent, $);
    
    // Extract location
    const location = this.extractLocation(textContent, $);
    
    // Extract requirements
    const requirements = this.extractRequirements(textContent, $);
    
    // Extract category/tags
    const { category, tags } = this.extractCategoryAndTags(textContent, $);
    
    // Extract contact info
    const contactEmail = this.extractContactEmail(textContent, $);
    const applicationUrl = this.extractApplicationUrl(textContent, $, url);

    return {
      title: title.substring(0, CONTENT_LIMITS.TITLE_MAX_LENGTH),
      description: textContent.substring(0, CONTENT_LIMITS.DESCRIPTION_MAX_LENGTH),
      url,
      organization,
      deadline,
      amount,
      location,
      requirements,
      category,
      tags,
      applicationUrl,
      contactEmail,
      rawContent: textContent.substring(0, CONTENT_LIMITS.RAW_CONTENT_MAX_LENGTH),
      scrapingMethod: method,
      scrapedAt: new Date(),
      success: true
    };
  }

  private extractOrganization(text: string, $: cheerio.CheerioAPI): string | undefined {
    // Use shared organization patterns
    for (const pattern of EXTRACTION_PATTERNS.ORGANIZATION) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, CONTENT_LIMITS.ORGANIZATION_MAX_LENGTH);
      }
    }

    // Try to extract from meta tags or structured data
    const orgFromMeta = $('meta[property="og:site_name"]').attr('content') ||
                        $('meta[name="author"]').attr('content');
    
    return orgFromMeta?.substring(0, CONTENT_LIMITS.ORGANIZATION_MAX_LENGTH);
  }

  private extractDeadline(text: string, $: cheerio.CheerioAPI): Date | undefined {
    // Use shared deadline patterns
    for (const pattern of EXTRACTION_PATTERNS.DEADLINE) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  private extractAmount(text: string, $: cheerio.CheerioAPI): string | undefined {
    // Use shared amount patterns
    for (const pattern of EXTRACTION_PATTERNS.AMOUNT) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].trim();
      }
    }

    return undefined;
  }

  private extractLocation(text: string, $: cheerio.CheerioAPI): string | undefined {
    // Use shared location patterns
    for (const pattern of EXTRACTION_PATTERNS.LOCATION) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, CONTENT_LIMITS.LOCATION_MAX_LENGTH);
      }
    }

    return undefined;
  }

  private extractRequirements(text: string, $: cheerio.CheerioAPI): string[] {
    const requirements: string[] = [];
    
    // Look for requirements sections
    const reqSection = text.match(/(?:requirements?|eligibility|criteria)[:\s]*([^]*?)(?:\n\n|\n[A-Z])/i);
    if (reqSection) {
      const lines = reqSection[1].split('\n').filter(line => line.trim());
      requirements.push(...lines.slice(0, CONTENT_LIMITS.MAX_REQUIREMENTS).map(line => line.trim().substring(0, CONTENT_LIMITS.REQUIREMENT_MAX_LENGTH)));
    }

    return requirements;
  }

  private extractCategoryAndTags(text: string, $: cheerio.CheerioAPI): { category?: string; tags: string[] } {
    const tags: string[] = [];
    let category: string | undefined;

    const lowerText = text.toLowerCase();
    
    for (const [cat, keywords] of Object.entries(ART_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          tags.push(keyword);
          if (!category) category = cat;
        }
      }
    }

    return { category, tags: [...new Set(tags)].slice(0, CONTENT_LIMITS.MAX_TAGS) };
  }

  private extractContactEmail(text: string, $: cheerio.CheerioAPI): string | undefined {
    const emails = text.match(EXTRACTION_PATTERNS.EMAIL);
    return emails?.[0];
  }

  private extractApplicationUrl(text: string, $: cheerio.CheerioAPI, baseUrl: string): string | undefined {
    // Look for application links
    const appLinks = $('a[href*="apply"], a[href*="application"], a:contains("Apply"), a:contains("Submit")');
    
    if (appLinks.length > 0) {
      const href = appLinks.first().attr('href');
      if (href) {
        // Convert relative URLs to absolute
        if (href.startsWith('http')) return href;
        if (href.startsWith('/')) {
          const baseUrlObj = new URL(baseUrl);
          return `${baseUrlObj.protocol}//${baseUrlObj.host}${href}`;
        }
      }
    }

    return undefined;
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
export const webScraperService = new WebScraperService();

// Cleanup on process exit
process.on('SIGINT', async () => {
  await webScraperService.cleanup();
});

process.on('SIGTERM', async () => {
  await webScraperService.cleanup();
});