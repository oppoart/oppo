import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedContent {
  title: string;
  content: string;
  description?: string;
  deadline?: string;
  amount?: string;
  eligibility?: string;
  location?: string;
  error?: string;
  success: boolean;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  async scrapeUrl(url: string, metadata?: any): Promise<ScrapedContent> {
    try {
      this.logger.log(`Scraping URL: ${url}`);
      
      // Set up axios with proper headers to avoid being blocked
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract content using various selectors
      const title = this.extractTitle($);
      const content = this.extractMainContent($);
      const description = this.extractDescription($);
      const deadline = this.extractDeadline($);
      const amount = this.extractAmount($);
      const eligibility = this.extractEligibility($);
      const location = this.extractLocation($);

      this.logger.log(`Successfully scraped: ${title.substring(0, 50)}...`);

      return {
        title,
        content,
        description,
        deadline,
        amount,
        eligibility,
        location,
        success: true
      };

    } catch (error) {
      this.logger.error(`Failed to scrape URL ${url}:`, error.message);
      
      return {
        title: metadata?.title || 'Unable to scrape title',
        content: 'Failed to scrape content. The website may be blocking automated requests or may be temporarily unavailable.',
        error: error.message,
        success: false
      };
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // Try multiple selectors for title
    const selectors = [
      'h1',
      'title',
      '.page-title',
      '.entry-title',
      '.post-title',
      '.article-title',
      '[data-title]'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    return 'No title found';
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Remove unwanted elements
    $('script, style, nav, header, footer, .nav, .navigation, .menu, .sidebar').remove();
    
    // Try multiple selectors for main content
    const selectors = [
      '.content',
      '.main-content',
      '.entry-content',
      '.post-content',
      '.article-content',
      '.page-content',
      'main',
      '.main',
      '[role="main"]'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        let text = element.text().trim();
        if (text.length > 100) {
          return text.substring(0, 2000); // Limit content length
        }
      }
    }

    // Fallback to body content
    let bodyText = $('body').text().trim();
    return bodyText.substring(0, 2000);
  }

  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      '.description',
      '.summary'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const content = element.attr('content') || element.text().trim();
        if (content) {
          return content.substring(0, 500);
        }
      }
    }

    return undefined;
  }

  private extractDeadline($: cheerio.CheerioAPI): string | undefined {
    const text = $('body').text().toLowerCase();
    
    // Look for deadline patterns
    const deadlinePatterns = [
      /deadline[:\s]*([a-zA-Z]+ \d{1,2},?\s*\d{4})/i,
      /due[:\s]*([a-zA-Z]+ \d{1,2},?\s*\d{4})/i,
      /apply by[:\s]*([a-zA-Z]+ \d{1,2},?\s*\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/
    ];

    for (const pattern of deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractAmount($: cheerio.CheerioAPI): string | undefined {
    const text = $('body').text();
    
    // Look for amount patterns
    const amountPatterns = [
      /\$[\d,]+(,\d{3})*(\.\d{2})?/,
      /award[:\s]*\$?[\d,]+/i,
      /grant[:\s]*\$?[\d,]+/i,
      /funding[:\s]*\$?[\d,]+/i,
      /up to[:\s]*\$?[\d,]+/i
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  private extractEligibility($: cheerio.CheerioAPI): string | undefined {
    const text = $('body').text().toLowerCase();
    
    // Look for eligibility keywords
    const eligibilityPatterns = [
      /eligible[^.]*artist[^.]*/i,
      /requirements[^.]*artist[^.]*/i,
      /must be[^.]*/i,
      /applicants must[^.]*/i
    ];

    for (const pattern of eligibilityPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].substring(0, 200);
      }
    }

    return undefined;
  }

  private extractLocation($: cheerio.CheerioAPI): string | undefined {
    const text = $('body').text();
    
    // Look for location patterns
    const locationPatterns = [
      /location[:\s]*([^,\n.]{3,50})/i,
      /based in[:\s]*([^,\n.]{3,50})/i,
      /residents of[:\s]*([^,\n.]{3,50})/i,
      /([A-Z][a-z]+,\s*[A-Z]{2})/,
      /([A-Z][a-z]+\s*[A-Z][a-z]+)/
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return undefined;
  }

  async scrapeMultipleUrls(urls: string[]): Promise<ScrapedContent[]> {
    this.logger.log(`Scraping ${urls.length} URLs`);
    
    const results = await Promise.allSettled(
      urls.map(url => this.scrapeUrl(url))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.logger.error(`Failed to scrape URL ${urls[index]}:`, result.reason);
        return {
          title: 'Scraping failed',
          content: 'Failed to scrape this URL',
          error: result.reason.message,
          success: false
        };
      }
    });
  }
}