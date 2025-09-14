import { Controller, Get, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ScraperService } from './scraper.service';

@ApiTags('scraper')
@Controller('scraper')
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  constructor(private readonly scraperService: ScraperService) {}

  @Get('health')
  getHealth() {
    try {
      return { 
        success: true,
        data: {
          firecrawl: true,
          playwright: true,
          cheerio: true,
          status: 'healthy'
        },
        meta: {
          timestamp: new Date().toISOString(),
          preferredMethod: 'firecrawl'
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          firecrawl: false,
          playwright: false,
          cheerio: false,
          status: 'unhealthy'
        },
        meta: {
          timestamp: new Date().toISOString(),
          error: error.message
        }
      };
    }
  }

  @Post('scrape')
  @ApiOperation({ summary: 'Scrape a single URL' })
  @ApiResponse({ status: 200, description: 'URL scraped successfully' })
  async scrapeUrl(
    @Body() body: {
      url: string;
      metadata?: {
        query?: string;
        searchEngine?: string;
        position?: number;
      };
    }
  ) {
    try {
      this.logger.log(`Scraping URL: ${body.url}`);
      const startTime = Date.now();

      const scrapedData = await this.scraperService.scrapeUrl(body.url, body.metadata);
      
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: scrapedData,
        meta: {
          processingTime,
          method: 'firecrawl',
          scrapedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`Scraping failed for URL: ${body.url}`, error);
      return {
        success: false,
        error: error.message,
        meta: {
          processingTime: 0,
          method: 'failed',
          scrapedAt: new Date().toISOString()
        }
      };
    }
  }

  @Post('scrape-multiple')
  @ApiOperation({ summary: 'Scrape multiple URLs' })
  @ApiResponse({ status: 200, description: 'URLs scraped successfully' })
  async scrapeMultiple(
    @Body() body: {
      urls: string[];
      metadata?: {
        query?: string;
        searchEngine?: string;
      };
    }
  ) {
    try {
      this.logger.log(`Scraping ${body.urls.length} URLs`);
      const startTime = Date.now();

      const results = [];
      let successful = 0;
      let failed = 0;

      for (const url of body.urls) {
        try {
          const scrapedData = await this.scraperService.scrapeUrl(url, body.metadata);
          results.push({ url, success: true, data: scrapedData });
          successful++;
        } catch (error) {
          results.push({ url, success: false, error: error.message });
          failed++;
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      const successRate = (successful / body.urls.length) * 100;

      return {
        success: true,
        data: {
          results,
          summary: {
            total: body.urls.length,
            successful,
            failed,
            successRate
          }
        },
        meta: {
          totalProcessingTime,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Multiple URL scraping failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Multiple URL scraping failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('scrape-search-results')
  @ApiOperation({ summary: 'Scrape search results' })
  @ApiResponse({ status: 200, description: 'Search results scraped successfully' })
  async scrapeSearchResults(
    @Body() body: {
      searchResults: Array<{
        title: string;
        link: string;
        snippet: string;
        position: number;
        domain?: string;
        date?: string;
      }>;
      query: string;
    }
  ) {
    try {
      this.logger.log(`Scraping ${body.searchResults.length} search results for query: "${body.query}"`);
      const startTime = Date.now();

      const results = [];
      const opportunities = [];
      let successful = 0;
      let failed = 0;

      for (const result of body.searchResults) {
        try {
          const scrapedData = await this.scraperService.scrapeUrl(result.link, {
            query: body.query,
            position: result.position
          });
          
          const scraped = { 
            ...result, 
            success: true, 
            scrapedContent: scrapedData 
          };
          
          results.push(scraped);
          
          // Check if this looks like an opportunity
          if (this.isOpportunity(scrapedData)) {
            opportunities.push(scraped);
          }
          
          successful++;
        } catch (error) {
          results.push({ ...result, success: false, error: error.message });
          failed++;
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      const avgProcessingTime = totalProcessingTime / body.searchResults.length;
      const successRate = (successful / body.searchResults.length) * 100;

      return {
        success: true,
        data: {
          opportunities,
          results,
          summary: {
            query: body.query,
            totalUrls: body.searchResults.length,
            successful,
            failed,
            successRate,
            avgProcessingTime
          }
        },
        meta: {
          processedAt: new Date().toISOString(),
          totalProcessingTime
        }
      };
    } catch (error) {
      this.logger.error('Search results scraping failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Search results scraping failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private isOpportunity(scrapedData: any): boolean {
    if (!scrapedData?.content) return false;
    
    const content = scrapedData.content.toLowerCase();
    const opportunityKeywords = [
      'deadline', 'apply', 'application', 'grant', 'fellowship', 
      'residency', 'exhibition', 'call for', 'submission', 'prize'
    ];
    
    return opportunityKeywords.some(keyword => content.includes(keyword));
  }
}
