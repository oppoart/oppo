import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { webScraperService } from '../services/scraper/WebScraperService';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Heavy rate limiting for scraping operations
const scrapingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 scraping requests per windowMs
  message: {
    success: false,
    message: 'Too many scraping requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation schemas
const scrapeUrlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  metadata: z.object({
    query: z.string().optional(),
    searchEngine: z.string().optional(),
    position: z.number().optional()
  }).optional()
});

const scrapeMultipleSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(20, 'Maximum 20 URLs per request'),
  metadata: z.object({
    query: z.string().optional(),
    searchEngine: z.string().optional()
  }).optional()
});

/**
 * POST /api/scraper/scrape
 * Scrape a single URL for opportunity data
 */
router.post('/scrape', scrapingLimiter, async (req: Request, res: Response) => {
  try {
    const validation = scrapeUrlSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors
      });
    }

    const { url, metadata } = validation.data;
    const userId = req.user!.id;

    console.log(`🕷️ Scraping request from user ${userId} for URL: ${url}`);

    const result = await webScraperService.scrapeOpportunity(url);

    if (result.success && result.opportunity) {
      // Add metadata to the scraped opportunity
      const enrichedOpportunity = {
        ...result.opportunity,
        userId, // Associate with requesting user
        searchMetadata: metadata
      };

      res.json({
        success: true,
        data: enrichedOpportunity,
        meta: {
          processingTime: result.processingTime,
          method: result.method,
          scrapedAt: new Date()
        }
      });
    } else {
      res.status(422).json({
        success: false,
        message: 'Failed to scrape opportunity data',
        error: result.error,
        meta: {
          processingTime: result.processingTime,
          method: result.method,
          url
        }
      });
    }

  } catch (error: any) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal scraping error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/scraper/scrape-multiple
 * Scrape multiple URLs in parallel (with concurrency limits)
 */
router.post('/scrape-multiple', scrapingLimiter, async (req: Request, res: Response) => {
  try {
    const validation = scrapeMultipleSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors
      });
    }

    const { urls, metadata } = validation.data;
    const userId = req.user!.id;

    console.log(`🕷️ Multi-scraping request from user ${userId} for ${urls.length} URLs`);

    // Process URLs with concurrency limit of 3
    const CONCURRENCY_LIMIT = 3;
    const results = [];
    
    for (let i = 0; i < urls.length; i += CONCURRENCY_LIMIT) {
      const batch = urls.slice(i, i + CONCURRENCY_LIMIT);
      const batchPromises = batch.map(async (url, index) => {
        try {
          const result = await webScraperService.scrapeOpportunity(url);
          return {
            url,
            position: i + index,
            ...result,
            opportunity: result.opportunity ? {
              ...result.opportunity,
              userId,
              searchMetadata: metadata
            } : undefined
          };
        } catch (error: any) {
          return {
            url,
            position: i + index,
            success: false,
            error: error.message,
            method: 'failed',
            processingTime: 0
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be nice to servers
      if (i + CONCURRENCY_LIMIT < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: urls.length,
          successful: successful.length,
          failed: failed.length,
          successRate: (successful.length / urls.length) * 100
        }
      },
      meta: {
        totalProcessingTime: results.reduce((sum, r) => sum + (r.processingTime || 0), 0),
        processedAt: new Date()
      }
    });

  } catch (error: any) {
    console.error('Multi-scraping error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal multi-scraping error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/scraper/scrape-search-results
 * Scrape opportunities from search results
 */
router.post('/scrape-search-results', scrapingLimiter, async (req: Request, res: Response) => {
  try {
    const { searchResults, query } = req.body;
    
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search results array is required'
      });
    }

    const userId = req.user!.id;
    const urls = searchResults.map((result: any) => result.link).filter(Boolean);

    if (urls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid URLs found in search results'
      });
    }

    console.log(`🔍 Processing search results: scraping ${urls.length} URLs for query "${query}"`);

    // Scrape URLs with enhanced metadata
    const CONCURRENCY_LIMIT = 2; // Lower limit for search result scraping
    const results = [];
    
    for (let i = 0; i < urls.length; i += CONCURRENCY_LIMIT) {
      const batch = urls.slice(i, i + CONCURRENCY_LIMIT);
      const batchPromises = batch.map(async (url, batchIndex) => {
        try {
          const searchResult = searchResults.find((sr: any) => sr.link === url);
          const result = await webScraperService.scrapeOpportunity(url);
          
          return {
            url,
            searchResult: {
              title: searchResult?.title,
              snippet: searchResult?.snippet,
              position: searchResult?.position,
              domain: searchResult?.domain
            },
            ...result,
            opportunity: result.opportunity ? {
              ...result.opportunity,
              userId,
              searchMetadata: {
                query,
                searchEngine: 'google',
                originalTitle: searchResult?.title,
                originalSnippet: searchResult?.snippet,
                searchPosition: searchResult?.position
              }
            } : undefined
          };
        } catch (error: any) {
          return {
            url,
            success: false,
            error: error.message,
            method: 'failed',
            processingTime: 0
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Progress logging
      console.log(`📊 Scraped ${i + batchResults.length}/${urls.length} URLs`);

      // Delay between batches
      if (i + CONCURRENCY_LIMIT < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successful = results.filter(r => r.success && r.opportunity);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Search result scraping complete: ${successful.length}/${urls.length} successful`);

    res.json({
      success: true,
      data: {
        opportunities: successful.map(r => r.opportunity),
        results,
        summary: {
          query,
          totalUrls: urls.length,
          successful: successful.length,
          failed: failed.length,
          successRate: Math.round((successful.length / urls.length) * 100),
          avgProcessingTime: results.length > 0 ? 
            Math.round(results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / results.length) : 0
        }
      },
      meta: {
        processedAt: new Date(),
        totalProcessingTime: results.reduce((sum, r) => sum + (r.processingTime || 0), 0)
      }
    });

  } catch (error: any) {
    console.error('Search result scraping error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scrape search results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/scraper/health
 * Check scraper service health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const firecrawlAvailable = !!process.env.FIRECRAWL_API_KEY && 
                              process.env.FIRECRAWL_API_KEY !== 'your_firecrawl_api_key';
    
    res.json({
      success: true,
      data: {
        firecrawl: firecrawlAvailable,
        playwright: true, // Always available
        cheerio: true,    // Always available
        status: 'operational'
      },
      meta: {
        timestamp: new Date(),
        preferredMethod: firecrawlAvailable ? 'firecrawl' : 'playwright'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Scraper health check failed',
      error: error.message
    });
  }
});

export default router;