import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { relevanceAnalysisService } from '../services/analysis/RelevanceAnalysisService';
import { prisma } from '../lib/prisma';
import { rateLimit } from 'express-rate-limit';

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const router: Router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Rate limiting for AI analysis operations
const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each user to 30 analysis requests per windowMs
  message: {
    success: false,
    message: 'Too many analysis requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation schemas
const analyzeOpportunitySchema = z.object({
  opportunity: z.object({
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
    scrapingMethod: z.enum(['FIRECRAWL', 'PLAYWRIGHT', 'CHEERIO']),
    scrapedAt: z.string().datetime(),
    success: z.boolean(),
    userId: z.string().optional()
  }),
  profileId: z.string()
});

const analyzeBatchSchema = z.object({
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
    scrapingMethod: z.enum(['FIRECRAWL', 'PLAYWRIGHT', 'CHEERIO']),
    scrapedAt: z.string().datetime(),
    success: z.boolean(),
    userId: z.string().optional()
  })).min(1).max(20),
  profileId: z.string()
});

/**
 * POST /api/analysis/analyze-opportunity
 * Analyze single opportunity for relevance
 */
router.post('/analyze-opportunity', analysisLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const validation = analyzeOpportunitySchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors
      });
      return;
    }

    const { opportunity, profileId } = validation.data;
    const userId = req.user!.id;

    // Get artist profile
    const artistProfile = await prisma.artistProfile.findFirst({
      where: {
        id: profileId,
        userId: userId // Ensure user owns the profile
      }
    });

    if (!artistProfile) {
      res.status(404).json({
        success: false,
        message: 'Artist profile not found or access denied'
      });
      return;
    }

    console.log(`🔍 Starting relevance analysis for "${opportunity.title}" against profile "${artistProfile.name}"`);

    // Analyze relevance
    const result = await relevanceAnalysisService.analyzeRelevance(
      {
        ...opportunity,
        deadline: opportunity.deadline ? new Date(opportunity.deadline) : undefined,
        scrapedAt: new Date(opportunity.scrapedAt)
      },
      {
        id: artistProfile.id,
        name: artistProfile.name,
        mediums: artistProfile.mediums,
        bio: artistProfile.bio || undefined,
        artistStatement: artistProfile.artistStatement || undefined,
        skills: artistProfile.skills,
        interests: artistProfile.interests,
        experience: artistProfile.experience || undefined,
        location: artistProfile.location || undefined
      }
    );

    res.json({
      success: true,
      data: {
        analysis: result,
        opportunity: {
          title: opportunity.title,
          organization: opportunity.organization,
          url: opportunity.url
        },
        profile: {
          name: artistProfile.name,
          mediums: artistProfile.mediums
        }
      },
      meta: {
        processingTime: result.processingTime,
        aiService: result.aiService,
        analyzedAt: result.processedAt
      }
    });

  } catch (error: any) {
    console.error('Opportunity analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze opportunity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/analysis/analyze-batch
 * Analyze multiple opportunities for relevance
 */
router.post('/analyze-batch', analysisLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const validation = analyzeBatchSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors
      });
      return;
    }

    const { opportunities, profileId } = validation.data;
    const userId = req.user!.id;

    // Get artist profile
    const artistProfile = await prisma.artistProfile.findFirst({
      where: {
        id: profileId,
        userId: userId
      }
    });

    if (!artistProfile) {
      res.status(404).json({
        success: false,
        message: 'Artist profile not found or access denied'
      });
      return;
    }

    console.log(`🔍 Starting batch relevance analysis for ${opportunities.length} opportunities`);

    // Convert opportunities to proper format
    const processedOpportunities = opportunities.map(opp => ({
      ...opp,
      deadline: opp.deadline ? new Date(opp.deadline) : undefined,
      scrapedAt: new Date(opp.scrapedAt)
    }));

    // Analyze batch
    const results = await relevanceAnalysisService.analyzeBatch(
      processedOpportunities,
      {
        id: artistProfile.id,
        name: artistProfile.name,
        mediums: artistProfile.mediums,
        bio: artistProfile.bio || undefined,
        artistStatement: artistProfile.artistStatement || undefined,
        skills: artistProfile.skills,
        interests: artistProfile.interests,
        experience: artistProfile.experience || undefined,
        location: artistProfile.location || undefined
      }
    );

    // Calculate summary statistics
    const successful = results.filter(r => r.success);
    const highRelevance = successful.filter(r => r.relevanceScore.recommendation === 'high');
    const mediumRelevance = successful.filter(r => r.relevanceScore.recommendation === 'medium');
    const lowRelevance = successful.filter(r => r.relevanceScore.recommendation === 'low');
    const notRelevant = successful.filter(r => r.relevanceScore.recommendation === 'not-relevant');

    const avgScore = successful.length > 0 ? 
      Math.round(successful.reduce((sum, r) => sum + r.relevanceScore.overallScore, 0) / successful.length) : 0;
    
    const avgProcessingTime = results.length > 0 ? 
      Math.round(results.reduce((sum, r) => sum + r.processingTime, 0) / results.length) : 0;

    res.json({
      success: true,
      data: {
        analyses: results,
        summary: {
          total: opportunities.length,
          successful: successful.length,
          failed: results.length - successful.length,
          averageScore: avgScore,
          recommendations: {
            high: highRelevance.length,
            medium: mediumRelevance.length,
            low: lowRelevance.length,
            notRelevant: notRelevant.length
          }
        },
        profile: {
          name: artistProfile.name,
          mediums: artistProfile.mediums
        }
      },
      meta: {
        totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
        avgProcessingTime,
        analyzedAt: new Date(),
        aiService: results[0]?.aiService
      }
    });

  } catch (error: any) {
    console.error('Batch analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze opportunities batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/analysis/scrape-and-analyze
 * Combined endpoint: scrape search results and analyze for relevance
 */
router.post('/scrape-and-analyze', analysisLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('🚀 Scrape-and-analyze endpoint called');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { searchResults, query, profileId } = req.body;
    
    if (!Array.isArray(searchResults) || !query || !profileId) {
      res.status(400).json({
        success: false,
        message: 'searchResults array, query, and profileId are required'
      });
      return;
    }

    const userId = req.user!.id;

    // Get artist profile
    const artistProfile = await prisma.artistProfile.findFirst({
      where: {
        id: profileId,
        userId: userId
      }
    });

    if (!artistProfile) {
      res.status(404).json({
        success: false,
        message: 'Artist profile not found or access denied'
      });
      return;
    }

    console.log(`🚀 Starting combined scrape-and-analyze for ${searchResults.length} URLs`);

    // Import scraper service dynamically to avoid circular deps
    const { webScraperService } = await import('../services/scraper/WebScraperService');

    // Step 1: Scrape search results
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

      // Small delay between scraping batches
      if (i + SCRAPE_CONCURRENCY < searchResults.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Step 2: Analyze successfully scraped opportunities  
    const successfulScrapes = scrapeResults.filter(r => r.success && 'opportunity' in r && !!r.opportunity) as Array<{
      success: true;
      opportunity: NonNullable<any>;
      searchResult: any;
      method: string;
      processingTime: number;
    }>;
    console.log(`🔍 Analyzing ${successfulScrapes.length} successfully scraped opportunities`);

    const analysisResults = await relevanceAnalysisService.analyzeBatch(
      successfulScrapes.map(r => r.opportunity),
      {
        id: artistProfile.id,
        name: artistProfile.name,
        mediums: artistProfile.mediums,
        bio: artistProfile.bio || undefined,
        artistStatement: artistProfile.artistStatement || undefined,
        skills: artistProfile.skills,
        interests: artistProfile.interests,
        experience: artistProfile.experience || undefined,
        location: artistProfile.location || undefined
      }
    );

    // Map analysis results back to original opportunities
    const analysisWithOpportunities = analysisResults.map((analysis, index) => ({
      ...analysis,
      originalOpportunity: successfulScrapes[index]?.opportunity
    }));

    // Step 3: Filter relevant opportunities with their original data
    const relevantAnalyses = analysisWithOpportunities.filter(r => 
      r.success && r.relevanceScore.recommendation !== 'not-relevant'
    );

    const highValueAnalyses = analysisWithOpportunities.filter(r => 
      r.success && ['high', 'medium'].includes(r.relevanceScore.recommendation)
    );

    // Step 4: 💾 SAVE RELEVANT OPPORTUNITIES TO DATABASE
    console.log(`💾 Saving ${relevantAnalyses.length} relevant opportunities to database...`);
    
    const savedOpportunities = [];
    let duplicatesSkipped = 0;
    
    for (const analysis of relevantAnalyses) {
      if (analysis.success && analysis.originalOpportunity) {
        try {
          // Convert scraped opportunity to database format
          const opp = analysis.originalOpportunity;
          const opportunityData = {
            title: opp.title,
            description: opp.description,
            url: opp.url,
            organization: opp.organization || 'Unknown',
            deadline: opp.deadline,
            amount: opp.amount,
            location: opp.location,
            tags: opp.tags || [],
            sourceType: 'websearch',
            sourceUrl: opp.url,
            sourceMetadata: {
              searchQuery: query,
              scrapingMethod: opp.scrapingMethod,
              scrapedAt: opp.scrapedAt,
              analysisScore: analysis.relevanceScore.overallScore,
              recommendation: analysis.relevanceScore.recommendation
            },
            relevanceScore: analysis.relevanceScore.overallScore / 100, // Convert to 0-1 scale
            semanticScore: analysis.relevanceScore.breakdown.mediumMatch / 100,
            keywordScore: analysis.relevanceScore.breakdown.skillMatch / 100,
            categoryScore: analysis.relevanceScore.breakdown.artRelevance / 100,
            aiServiceUsed: 'openai',
            processed: true,
            status: 'new',
            applied: false,
            discoveredAt: new Date(),
            lastUpdated: new Date()
          };

          // Save directly to database using Prisma
          const savedOpportunity = await prisma.opportunity.create({
            data: opportunityData
          });
          
          savedOpportunities.push(savedOpportunity);
          console.log(`✅ Saved to database: ${opp.title}`);
          
        } catch (error: any) {
          // Check if it's a duplicate error
          if (error.code === 'P2002') {
            duplicatesSkipped++;
            console.log(`⚠️ Skipped duplicate: ${analysis.originalOpportunity?.title}`);
          } else {
            console.error(`❌ Failed to save opportunity "${analysis.originalOpportunity?.title}":`, error.message);
          }
        }
      }
    }

    console.log(`💾 Database save complete: ${savedOpportunities.length} saved, ${duplicatesSkipped} duplicates skipped`);

    res.json({
      success: true,
      data: {
        query,
        scrapeResults: {
          total: searchResults.length,
          successful: successfulScrapes.length,
          failed: scrapeResults.length - successfulScrapes.length
        },
        analysisResults: analysisWithOpportunities,
        relevantOpportunities: relevantAnalyses,
        highValueOpportunities: highValueAnalyses,
        // 💾 DATABASE SAVE RESULTS
        databaseResults: {
          saved: savedOpportunities.length,
          duplicatesSkipped,
          totalRelevant: relevantAnalyses.length
        },
        savedOpportunities, // Include saved opportunities for frontend
        summary: {
          searchResultsProcessed: searchResults.length,
          successfullyScrapped: successfulScrapes.length,
          analyzed: analysisWithOpportunities.length,
          relevant: relevantAnalyses.length,
          highValue: highValueAnalyses.length,
          savedToDatabase: savedOpportunities.length,
          conversionRate: Math.round((relevantAnalyses.length / searchResults.length) * 100)
        }
      },
      meta: {
        processedAt: new Date(),
        totalProcessingTime: scrapeResults.reduce((sum, r) => sum + (r.processingTime || 0), 0) + 
                           analysisResults.reduce((sum, r) => sum + r.processingTime, 0)
      }
    });

  } catch (error: any) {
    console.error('❌ Scrape-and-analyze error:', error);
    console.error('Error stack:', error.stack);
    
    // Ensure we always return JSON, never HTML
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to scrape and analyze opportunities',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name
        } : undefined
      });
    }
  }
});

/**
 * GET /api/analysis/health
 * Check analysis service health
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const openaiAvailable = !!process.env.OPENAI_API_KEY && 
                           process.env.OPENAI_API_KEY.startsWith('sk-');
    
    res.json({
      success: true,
      data: {
        openai: openaiAvailable,
        ruleBasedFallback: true,
        status: 'operational'
      },
      meta: {
        timestamp: new Date(),
        preferredMethod: openaiAvailable ? 'openai' : 'rule-based'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Analysis health check failed',
      error: error.message
    });
  }
});

export default router;