import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { deduplicationService } from '../services/deduplication/DeduplicationService';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Rate limiting for deduplication operations
const deduplicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each user to 20 deduplication requests per windowMs
  message: {
    success: false,
    message: 'Too many deduplication requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation schemas
const detectDuplicatesSchema = z.object({
  opportunities: z.array(z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().url(),
    organization: z.string().optional(),
    deadline: z.string().datetime().optional(),
    amount: z.string().optional(),
    location: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    applicationUrl: z.string().optional(),
    contactEmail: z.string().email().optional(),
    rawContent: z.string(),
    scrapingMethod: z.enum(['firecrawl', 'playwright', 'cheerio']),
    scrapedAt: z.string().datetime(),
    success: z.boolean(),
    userId: z.string().optional()
  })).min(2).max(100),
  analysisResults: z.array(z.object({
    opportunity: z.object({
      url: z.string().url()
    }),
    relevanceScore: z.object({
      overallScore: z.number().min(0).max(100)
    })
  })).optional(),
  options: z.object({
    titleSimilarityThreshold: z.number().min(0).max(1).optional(),
    descriptionSimilarityThreshold: z.number().min(0).max(1).optional(),
    organizationMatchRequired: z.boolean().optional(),
    deadlineToleranceDays: z.number().min(0).max(30).optional(),
    urlDomainMatching: z.boolean().optional()
  }).optional()
});

/**
 * POST /api/deduplication/detect-duplicates
 * Detect and group duplicate opportunities
 */
router.post('/detect-duplicates', deduplicationLimiter, async (req: Request, res: Response) => {
  try {
    const validation = detectDuplicatesSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors
      });
    }

    const { opportunities, analysisResults, options } = validation.data;
    const userId = req.user!.id;

    console.log(`🔍 Starting duplicate detection for ${opportunities.length} opportunities from user ${userId}`);

    // Add userId to opportunities if not present
    const processedOpportunities = opportunities.map(opp => ({
      ...opp,
      userId: opp.userId || userId,
      deadline: opp.deadline ? new Date(opp.deadline) : undefined,
      scrapedAt: new Date(opp.scrapedAt)
    }));

    // Run duplicate detection
    const result = await deduplicationService.detectDuplicates(
      processedOpportunities,
      analysisResults as any,
      options || {}
    );

    // Calculate additional statistics
    const duplicatesByConfidence = result.duplicateGroups.reduce((acc, group) => {
      if (group.confidence >= 0.9) acc.high++;
      else if (group.confidence >= 0.7) acc.medium++;
      else acc.low++;
      return acc;
    }, { high: 0, medium: 0, low: 0 });

    res.json({
      success: true,
      data: {
        deduplication: result,
        statistics: {
          originalCount: result.originalCount,
          uniqueCount: result.uniqueCount,
          duplicatesRemoved: result.removedDuplicates.length,
          duplicateGroups: result.duplicateGroups.length,
          duplicateRate: result.duplicateDetectionRate,
          confidenceLevels: duplicatesByConfidence,
          averageGroupSize: result.duplicateGroups.length > 0 ? 
            result.duplicateGroups.reduce((sum, g) => sum + g.opportunities.length, 0) / result.duplicateGroups.length : 0
        }
      },
      meta: {
        processingTime: result.processingTime,
        processedAt: new Date(),
        userId,
        deduplicationMethod: 'jaro-winkler-similarity'
      }
    });

  } catch (error: any) {
    console.error('Duplicate detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect duplicates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/deduplication/process-pipeline
 * Combined endpoint: scrape, analyze, and deduplicate opportunities
 */
router.post('/process-pipeline', deduplicationLimiter, async (req: Request, res: Response) => {
  try {
    const { searchResults, query, profileId, options } = req.body;
    
    if (!Array.isArray(searchResults) || !query || !profileId) {
      return res.status(400).json({
        success: false,
        message: 'searchResults array, query, and profileId are required'
      });
    }

    const userId = req.user!.id;

    console.log(`🚀 Starting full pipeline processing for ${searchResults.length} URLs`);

    // Import services dynamically
    const { webScraperService } = await import('../services/scraper/WebScraperService');
    const { relevanceAnalysisService } = await import('../services/analysis/RelevanceAnalysisService');
    const { prisma } = await import('../lib/prisma');

    // Get artist profile
    const artistProfile = await prisma.artistProfile.findFirst({
      where: {
        id: profileId,
        userId: userId
      }
    });

    if (!artistProfile) {
      return res.status(404).json({
        success: false,
        message: 'Artist profile not found or access denied'
      });
    }

    // Step 1: Scrape search results
    console.log(`📡 Step 1: Scraping ${searchResults.length} URLs`);
    const scrapeResults = [];
    const SCRAPE_CONCURRENCY = 2;
    
    for (let i = 0; i < searchResults.length; i += SCRAPE_CONCURRENCY) {
      const batch = searchResults.slice(i, i + SCRAPE_CONCURRENCY);
      const batchPromises = batch.map(async (searchResult: any) => {
        try {
          const result = await webScraperService.scrapeOpportunity(searchResult.link);
          return { ...result, searchResult };
        } catch (error: any) {
          return { 
            success: false, 
            error: error.message, 
            searchResult, 
            method: 'failed',
            processingTime: 0
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      scrapeResults.push(...batchResults);

      console.log(`📊 Scraped ${i + batchResults.length}/${searchResults.length} URLs`);

      if (i + SCRAPE_CONCURRENCY < searchResults.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Step 2: Analyze successfully scraped opportunities
    const successfulScrapes = scrapeResults.filter(r => r.success && r.opportunity);
    console.log(`🔍 Step 2: Analyzing ${successfulScrapes.length} scraped opportunities`);

    const analysisResults = await relevanceAnalysisService.analyzeBatch(
      successfulScrapes.map(r => ({ ...r.opportunity!, userId })),
      {
        id: artistProfile.id,
        name: artistProfile.name,
        mediums: artistProfile.mediums,
        bio: artistProfile.bio,
        artistStatement: artistProfile.artistStatement,
        skills: artistProfile.skills,
        interests: artistProfile.interests,
        experience: artistProfile.experience,
        location: artistProfile.location
      }
    );

    // Step 3: Deduplicate opportunities
    console.log(`🎯 Step 3: Deduplicating ${successfulScrapes.length} opportunities`);
    
    const deduplicationResult = await deduplicationService.detectDuplicates(
      successfulScrapes.map(r => r.opportunity!),
      analysisResults,
      options?.deduplication || {}
    );

    // Step 4: Filter for relevant opportunities
    const relevantOpportunities = deduplicationResult.uniqueOpportunities.filter(opp => {
      const analysis = analysisResults.find(r => r.opportunity.url === opp.url);
      return analysis && analysis.success && analysis.relevanceScore.recommendation !== 'not-relevant';
    });

    const highValueOpportunities = deduplicationResult.uniqueOpportunities.filter(opp => {
      const analysis = analysisResults.find(r => r.opportunity.url === opp.url);
      return analysis && analysis.success && ['high', 'medium'].includes(analysis.relevanceScore.recommendation);
    });

    // Calculate final statistics
    const finalStats = {
      searchResultsProcessed: searchResults.length,
      successfullyScrapped: successfulScrapes.length,
      analyzed: analysisResults.length,
      originalOpportunities: successfulScrapes.length,
      duplicatesRemoved: deduplicationResult.removedDuplicates.length,
      uniqueOpportunities: deduplicationResult.uniqueCount,
      relevantOpportunities: relevantOpportunities.length,
      highValueOpportunities: highValueOpportunities.length,
      finalConversionRate: Math.round((highValueOpportunities.length / searchResults.length) * 100)
    };

    console.log(`✅ Pipeline complete: ${searchResults.length} → ${highValueOpportunities.length} high-value opportunities (${finalStats.finalConversionRate}% conversion)`);

    res.json({
      success: true,
      data: {
        query,
        scrapeResults: {
          total: searchResults.length,
          successful: successfulScrapes.length,
          failed: scrapeResults.length - successfulScrapes.length
        },
        analysisResults,
        deduplicationResult,
        relevantOpportunities,
        highValueOpportunities,
        finalStats
      },
      meta: {
        processedAt: new Date(),
        totalProcessingTime: 
          scrapeResults.reduce((sum, r) => sum + (r.processingTime || 0), 0) + 
          analysisResults.reduce((sum, r) => sum + r.processingTime, 0) +
          deduplicationResult.processingTime,
        pipelineSteps: ['scraping', 'analysis', 'deduplication', 'filtering']
      }
    });

  } catch (error: any) {
    console.error('Pipeline processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process pipeline',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/deduplication/health
 * Check deduplication service health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        deduplicationAlgorithm: 'jaro-winkler-similarity',
        supportedMethods: ['title-matching', 'description-similarity', 'organization-matching', 'deadline-proximity'],
        status: 'operational'
      },
      meta: {
        timestamp: new Date(),
        version: '1.0.0'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Deduplication health check failed',
      error: error.message
    });
  }
});

export default router;