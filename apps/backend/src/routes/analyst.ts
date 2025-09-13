import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { queryGenerationService, analysisService } from '../services/ai-services';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const router: Router = Router();
const prisma = new PrismaClient();

// Validation schemas
const runAnalysisSchema = z.object({
  artistProfileId: z.string(),
  sources: z.array(z.enum(['websearch', 'social', 'bookmark', 'newsletter'])).optional(),
  maxQueries: z.number().min(1).max(50).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional()
});

const generateQueriesSchema = z.object({
  artistProfileId: z.string(),
  maxQueries: z.number().min(1).max(20).optional(),
  sourceTypes: z.array(z.string()).optional()
});

const scoreOpportunitiesSchema = z.object({
  artistProfileId: z.string(),
  opportunityIds: z.array(z.string())
});

// Routes

/**
 * POST /api/analyst/analyze
 * Run complete analysis for an artist profile
 */
router.post('/analyze', 
  requireAuth, 
  validate({ body: runAnalysisSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { artistProfileId, sources, maxQueries, priority } = req.body;
      
      // Verify user owns the profile and fetch full profile data
      const profile = await prisma.artistProfile.findUnique({
        where: { id: artistProfileId },
        include: {
          user: {
            select: { id: true }
          }
        }
      });

      if (!profile || profile.user.id !== req.user?.id) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this profile'
        });
        return;
      }

      // Convert Prisma profile to our service interface
      const artistProfile = {
        id: profile.id,
        name: profile.name,
        mediums: profile.mediums,
        skills: profile.skills,
        interests: profile.interests,
        experience: profile.experience || 'intermediate',
        location: profile.location || undefined,
        bio: profile.bio || undefined
      };

      // Generate queries for this profile
      const queryResult = await queryGenerationService.generateQueries(artistProfile, {
        maxQueries,
        opportunityType: 'all'
      });

      // For now, return the query generation results
      // In a full implementation, this would also include opportunity discovery and analysis
      const result = {
        queries: queryResult.queries,
        queryGenerationTime: queryResult.processingTimeMs,
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Analysis failed'
      });
    }
  }
);

/**
 * POST /api/analyst/generate-queries
 * Generate search queries for an artist profile
 */
router.post('/generate-queries',
  requireAuth,
  validate({ body: generateQueriesSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { artistProfileId, maxQueries, sourceTypes } = req.body;
      
      // Verify user owns the profile and fetch full profile data
      const profile = await prisma.artistProfile.findUnique({
        where: { id: artistProfileId },
        include: {
          user: {
            select: { id: true }
          }
        }
      });

      if (!profile || profile.user.id !== req.user?.id) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this profile'
        });
        return;
      }

      // Convert Prisma profile to our service interface
      const artistProfile = {
        id: profile.id,
        name: profile.name,
        mediums: profile.mediums,
        skills: profile.skills,
        interests: profile.interests,
        experience: profile.experience || 'intermediate',
        location: profile.location || undefined,
        bio: profile.bio || undefined
      };

      const result = await queryGenerationService.generateQueries(artistProfile, {
        maxQueries,
        opportunityType: 'all'
      });

      res.json({
        success: true,
        data: { 
          queries: result.queries,
          metadata: {
            processingTimeMs: result.processingTimeMs,
            opportunityType: result.opportunityType,
            generatedAt: result.generatedAt
          }
        }
      });
    } catch (error) {
      console.error('Query generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Query generation failed'
      });
    }
  }
);

/**
 * POST /api/analyst/score-opportunities
 * Score opportunities for relevance to an artist profile
 */
router.post('/score-opportunities',
  requireAuth,
  validate({ body: scoreOpportunitiesSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { artistProfileId, opportunityIds } = req.body;
      
      // Verify user owns the profile and fetch full profile data
      const profile = await prisma.artistProfile.findUnique({
        where: { id: artistProfileId },
        include: {
          user: {
            select: { id: true }
          }
        }
      });

      if (!profile || profile.user.id !== req.user?.id) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this profile'
        });
        return;
      }

      // Convert Prisma profile to our service interface
      const artistProfile = {
        id: profile.id,
        name: profile.name,
        mediums: profile.mediums,
        skills: profile.skills,
        interests: profile.interests,
        experience: profile.experience || 'intermediate',
        location: profile.location || undefined,
        bio: profile.bio || undefined
      };

      // Fetch the opportunities from database using the actual Opportunity model
      const opportunities = await prisma.opportunity.findMany({
        where: { 
          id: { in: opportunityIds } 
        },
        include: {
          matches: true,
          sourceLinks: {
            include: {
              source: true
            }
          }
        }
      });

      if (opportunities.length === 0) {
        res.json({
          success: true,
          data: { scores: [] }
        });
        return;
      }

      // Transform opportunities to match expected interface
      const transformedOpportunities = opportunities.map(opp => ({
        ...opp,
        deadline: opp.deadline ? opp.deadline.toISOString() : undefined,
        location: opp.location || undefined,
        organization: opp.organization || undefined,
        amount: opp.amount || undefined
      }));
      
      const scores = await analysisService.scoreOpportunities(transformedOpportunities, artistProfile);

      res.json({
        success: true,
        data: { scores }
      });
    } catch (error) {
      console.error('Scoring error:', error);
      res.status(500).json({
        success: false,
        error: 'Opportunity scoring failed'
      });
    }
  }
);

/**
 * GET /api/analyst/stats/:profileId
 * Get analysis statistics for an artist profile
 */
router.get('/stats/:profileId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { profileId } = req.params;
    
    // Verify user owns the profile
    const profile = await prisma.artistProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: { id: true }
        }
      }
    });

    if (!profile || profile.user.id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this profile'
      });
    }

    const queryStats = queryGenerationService.getCacheStats();
    const analysisStats = analysisService.getCacheStats();

    const stats = {
      profileId,
      queryGeneration: queryStats,
      analysis: analysisStats,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analysis statistics'
    });
  }
});

/**
 * GET /api/analyst/health
 * Health check for analyst service
 */
router.get('/health', async (req, res) => {
  try {
    const [queryHealth, analysisHealth] = await Promise.all([
      queryGenerationService.healthCheck(),
      analysisService.healthCheck()
    ]);
    
    const health = {
      queryGeneration: queryHealth,
      analysis: analysisHealth,
      overall: queryHealth && analysisHealth,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Service health check failed'
    });
  }
});

export default router;