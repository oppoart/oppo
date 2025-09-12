import express, { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { googleSearchService } from '../services/search/GoogleSearchService';
import { z } from 'zod';
import { validate } from '../middleware/validation';

const router: Router = express.Router();

const searchQuerySchema = z.object({
  query: z.string().min(1, 'Query is required'),
  num: z.number().min(1).max(100).optional(),
  location: z.string().optional(),
  hl: z.string().optional(),
  gl: z.string().optional(),
  start: z.number().min(0).optional()
});

const multipleSearchSchema = z.object({
  queries: z.array(z.string().min(1)).min(1).max(20, 'Maximum 20 queries allowed'),
  num: z.number().min(1).max(100).optional(),
  location: z.string().optional(),
  hl: z.string().optional(),
  gl: z.string().optional(),
  artFocus: z.boolean().optional().default(false)
});

/**
 * POST /api/search/google - Perform Google search
 */
router.post(
  '/google',
  requireAuth,
  validate(searchQuerySchema, 'body'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const searchOptions = req.body;

    const result = await googleSearchService.search(searchOptions);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * POST /api/search/google/multiple - Search multiple queries
 */
router.post(
  '/google/multiple',
  requireAuth,
  validate(multipleSearchSchema, 'body'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { queries, artFocus, ...options } = req.body;

    let searchResults;
    
    if (artFocus) {
      // Use art-specific search for each query
      searchResults = await Promise.allSettled(
        queries.map((query: string) => 
          googleSearchService.searchArtOpportunities(query, options)
        )
      );
    } else {
      // Use regular multi-query search
      searchResults = await Promise.allSettled(
        queries.map((query: string) => 
          googleSearchService.search({ ...options, query })
        )
      );
    }

    const results = searchResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        let searchResult = result.value;
        
        // Apply art filtering if requested
        if (artFocus) {
          searchResult = {
            ...searchResult,
            results: googleSearchService.filterArtResults(searchResult.results)
          };
        }
        
        return searchResult;
      } else {
        console.error(`Search failed for query "${queries[index]}":`, result.reason);
        return {
          results: [],
          totalResults: 0,
          searchTime: 0,
          query: queries[index],
          error: result.reason?.message || 'Search failed'
        };
      }
    });

    res.json({
      success: true,
      data: {
        results,
        totalQueries: queries.length,
        successfulQueries: results.filter(r => !('error' in r)).length
      }
    });
  })
);

/**
 * POST /api/search/art-opportunities - Search specifically for art opportunities
 */
router.post(
  '/art-opportunities',
  requireAuth,
  validate(z.object({
    query: z.string().min(1, 'Query is required'),
    num: z.number().min(1).max(100).optional()
  }), 'body'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { query, num } = req.body;

    const result = await googleSearchService.searchArtOpportunities(query, { num });
    
    // Filter results for art-related content
    const filteredResult = {
      ...result,
      results: googleSearchService.filterArtResults(result.results)
    };

    res.json({
      success: true,
      data: filteredResult
    });
  })
);

/**
 * GET /api/search/health - Check search service health
 */
router.get(
  '/health',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const isHealthy = await googleSearchService.healthCheck();

    res.json({
      success: true,
      data: {
        googleSearch: isHealthy,
        timestamp: new Date().toISOString()
      }
    });
  })
);

export default router;