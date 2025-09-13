import express, { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { GoogleCustomSearchService } from '../services/search/GoogleCustomSearchService';
import { z } from 'zod';
import { validate } from '../middleware/validation';

const router: Router = express.Router();

// Initialize Google Custom Search Service
const googleSearchService = new GoogleCustomSearchService();

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
    
    // Use Google Custom Search for all queries (artFocus handled by search engine configuration)
    searchResults = await Promise.allSettled(
      queries.map((query: string) => 
        googleSearchService.search({ ...options, query })
      )
    );

    const results = searchResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
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

    const result = await googleSearchService.search({ query, num });
    
    // Results are already filtered by Google Custom Search Engine configuration
    res.json({
      success: true,
      data: result
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