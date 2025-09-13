import { Router, type Router as ExpressRouter } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import AnalystServiceSingleton from '../services/AnalystServiceSingleton';
import { ResearchService } from '../services/research';
import {
  RESEARCH_SERVICES,
  RESEARCH_SESSION_STATUSES,
  RESEARCH_PRIORITIES,
  SOURCE_TYPES,
  DEFAULT_RESEARCH_OPTIONS,
  PROCESSING_DELAYS,
  PROGRESS_MILESTONES,
  RESULT_PAGINATION,
} from '../../../../packages/shared/src/constants/research.constants';
import {
  startServiceSchema,
  stopServiceSchema,
  exportSchema,
  fetchOpportunitiesSchema,
} from '../../../../packages/shared/src/validation/research.schemas';

const router: ExpressRouter = Router();

// Use singleton for agentic (autonomous) research workflows
const analystService = AnalystServiceSingleton.getInstance();
const prisma = AnalystServiceSingleton.getPrisma();

// Initialize the singleton (safe to call multiple times)
AnalystServiceSingleton.initialize().catch(console.error);

// Initialize ResearchService for session-based agentic workflows
const researchService = new ResearchService(prisma, analystService, {
  enableMetrics: true,
  enableLogging: true
});

// Error handling middleware for research routes
const handleResearchError = (error: any, context: string) => {
  console.error(`Research API Error (${context}):`, error);
  
  if (error.message?.includes('not found')) return { status: 404, message: error.message };
  if (error.message?.includes('Access denied')) return { status: 403, message: error.message };
  if (error.message?.includes('not authenticated')) return { status: 401, message: error.message };
  if (error.message?.includes('No artist profiles found')) return { status: 400, message: error.message };
  
  return { status: 500, message: error instanceof Error ? error.message : `Failed to ${context}` };
};

// Legacy service implementation moved to ResearchService and dedicated executor classes

// Routes

/**
 * GET /api/research/health
 * Get service health status
 */
router.get('/health', async (req, res) => {
  try {
    const serviceHealth = researchService.getServiceHealth();
    const metrics = researchService.getMetrics();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        services: serviceHealth,
        metrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const { status, message } = handleResearchError(error, 'get health status');
    res.status(status).json({
      success: false,
      error: message
    });
  }
});

/**
 * POST /api/research/start
 * Start a research service
 */
router.post('/start',
  requireAuth,
  validate({ body: startServiceSchema }),
  async (req, res) => {
    try {
      const { serviceId, profileId, options } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const result = await researchService.startService(serviceId, profileId, userId, options);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      const { status, message } = handleResearchError(error, 'start service');
      res.status(status).json({
        success: false,
        error: message
      });
    }
  }
);

/**
 * POST /api/research/stop
 * Stop a research service
 */
router.post('/stop',
  requireAuth,
  validate({ body: stopServiceSchema }),
  async (req, res) => {
    try {
      const { sessionId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const result = await researchService.stopService(sessionId, userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Service stop error:', error);
      const statusCode = error.message?.includes('not found') ? 404 : 
                        error.message?.includes('Access denied') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop service'
      });
    }
  }
);

/**
 * GET /api/research/status/:serviceId/:sessionId
 * Get service status
 */
router.get('/status/:serviceId/:sessionId', requireAuth, async (req, res) => {
  try {
    const { serviceId, sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const result = await researchService.getServiceStatus(serviceId, sessionId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Status check error:', error);
    const statusCode = error.message?.includes('not found') ? 404 : 
                      error.message?.includes('Access denied') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get service status'
    });
  }
});

/**
 * GET /api/research/results/:serviceId/:sessionId
 * Get service results
 */
router.get('/results/:serviceId/:sessionId', requireAuth, async (req, res) => {
  try {
    const { serviceId, sessionId } = req.params;
    const { limit = String(RESULT_PAGINATION.DEFAULT_LIMIT), offset = String(RESULT_PAGINATION.DEFAULT_OFFSET) } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    const result = await researchService.getServiceResults(
      serviceId, 
      sessionId, 
      userId, 
      limitNum, 
      offsetNum
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Results fetch error:', error);
    const statusCode = error.message?.includes('not found') ? 404 : 
                      error.message?.includes('Access denied') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get service results'
    });
  }
});

/**
 * GET /api/research/sessions/:profileId
 * Get all active sessions for a profile
 */
router.get('/sessions/:profileId', requireAuth, async (req, res) => {
  try {
    const { profileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const result = await researchService.getProfileSessions(profileId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    const statusCode = error.message?.includes('Access denied') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get active sessions'
    });
  }
});

/**
 * POST /api/research/fetch-opportunities
 * Fetch new opportunities using research module
 */
router.post('/fetch-opportunities',
  requireAuth,
  validate({ body: fetchOpportunitiesSchema }),
  async (req, res) => {
    try {
      const { searchTerms, types, minRelevanceScore } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const result = await researchService.fetchOpportunities(
        userId,
        searchTerms,
        types,
        minRelevanceScore
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Fetch opportunities error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch new opportunities'
      });
    }
  }
);

/**
 * POST /api/research/export
 * Export research results
 */
router.post('/export',
  requireAuth,
  validate({ body: exportSchema }),
  async (req, res) => {
    try {
      const { profileId, serviceIds, format } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const exportOptions = {
        format,
        serviceIds,
        includeResults: true
      };

      const result = await researchService.exportResults(profileId, userId, exportOptions);

      if (format === 'csv' && typeof result === 'string') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="research-export-${profileId}-${Date.now()}.csv"`);
        res.send(result);
      } else {
        res.json({
          success: true,
          data: result
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      const statusCode = error.message?.includes('Access denied') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export results'
      });
    }
  }
);

// Background service processing is now handled by the ResearchService

/**
 * POST /api/research/scrape-organizations
 * Trigger organization-specific scraping
 */
router.post('/scrape-organizations', requireAuth, async (req, res) => {
  try {
    const { organizations = [], priority = 'normal' } = req.body;
    
    // Add background job for organization scraping
    const { jobProcessor } = await import('../services/jobs/JobProcessor');
    
    const jobId = await jobProcessor.addJob({
      type: 'organization-scraping',
      payload: { organizations },
      userId: req.user?.id,
      priority: priority as 'low' | 'normal' | 'high'
    });

    res.json({
      success: true,
      data: {
        jobId,
        message: organizations.length > 0 
          ? `Started scraping ${organizations.length} organizations`
          : 'Started scraping all organizations'
      }
    });
  } catch (error) {
    console.error('Organization scraping job failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start organization scraping'
    });
  }
});

/**
 * POST /api/research/process-search-results
 * Process and analyze search results
 */
router.post('/process-search-results', requireAuth, async (req, res) => {
  try {
    const { searchResults, options = {} } = req.body;
    
    if (!searchResults || !Array.isArray(searchResults)) {
      return res.status(400).json({
        success: false,
        error: 'Search results array is required'
      });
    }

    const { jobProcessor } = await import('../services/jobs/JobProcessor');
    
    const jobId = await jobProcessor.addJob({
      type: 'result-processing',
      payload: { searchResults, options },
      userId: req.user?.id,
      priority: options.priority || 'normal'
    });

    res.json({
      success: true,
      data: {
        jobId,
        message: `Started processing ${searchResults.length} search results`
      }
    });
  } catch (error) {
    console.error('Result processing job failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start result processing'
    });
  }
});

/**
 * GET /api/research/job-status/:jobId
 * Get background job status
 */
router.get('/job-status/:jobId', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { queueName = 'search-execution' } = req.query;
    
    const { jobProcessor } = await import('../services/jobs/JobProcessor');
    
    const status = await jobProcessor.getJobStatus(jobId, queueName as string);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Job status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status'
    });
  }
});

/**
 * GET /api/research/pipeline-stats
 * Get external data pipeline statistics
 */
router.get('/pipeline-stats', requireAuth, async (req, res) => {
  try {
    const { jobProcessor } = await import('../services/jobs/JobProcessor');
    const queueStats = await jobProcessor.getQueueStats();
    
    // Get recent opportunities from database
    const recentOpportunities = await prisma.opportunity.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    const processedOpportunities = await prisma.opportunity.count({
      where: {
        processed: true,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    res.json({
      success: true,
      data: {
        queueStats,
        pipeline: {
          recentOpportunities,
          processedOpportunities,
          processingRate: processedOpportunities / recentOpportunities * 100 || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Pipeline stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pipeline statistics'
    });
  }
});

/**
 * POST /api/research/scrape-bookmarks
 * Trigger bookmark portal scraping
 */
router.post('/scrape-bookmarks', requireAuth, async (req, res) => {
  try {
    const { portalIds = [], priority = 'normal' } = req.body;
    
    // Add background job for bookmark scraping
    const { jobProcessor } = await import('../services/jobs/JobProcessor');
    
    const jobId = await jobProcessor.addJob({
      type: 'bookmark-scraping',
      payload: { portalIds },
      userId: req.user?.id,
      priority: priority as 'low' | 'normal' | 'high'
    });

    res.json({
      success: true,
      data: {
        jobId,
        message: portalIds.length > 0 
          ? `Started scraping ${portalIds.length} bookmark portals`
          : 'Started scraping all bookmark portals'
      }
    });
  } catch (error) {
    console.error('Bookmark scraping job failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start bookmark scraping'
    });
  }
});

/**
 * GET /api/research/bookmark-portals
 * Get available bookmark portals
 */
router.get('/bookmark-portals', requireAuth, async (req, res) => {
  try {
    const { BookmarkScraperService } = await import('../services/scrapers/BookmarkScraperService');
    const bookmarkScraper = new BookmarkScraperService(prisma);
    
    const portals = bookmarkScraper.getConfiguredPortals();
    
    res.json({
      success: true,
      data: {
        portals,
        total: portals.length
      }
    });
  } catch (error) {
    console.error('Failed to get bookmark portals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bookmark portals'
    });
  }
});

export default router;