import { Router } from 'express';
import { LiaisonService } from '../../../../packages/services/liaison';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { getWebSocketServer } from '../lib/websocket';

const router = Router();

// Initialize liaison service without WebSocket (we'll use our own WebSocket server)
const liaisonService = new LiaisonService(
  prisma,
  {
    ui: {
      theme: 'light',
      kanbanColumns: ['new', 'reviewing', 'applying', 'submitted', 'rejected'],
      defaultView: 'kanban',
      itemsPerPage: 20
    },
    export: {
      formats: ['csv', 'json'],
      maxItems: 1000
    },
    realtime: {
      enabled: false, // We'll handle WebSocket separately
      reconnectDelay: 5000,
      maxReconnectAttempts: 10
    }
  }
);

// Initialize liaison service on first use
let isInitialized = false;
const initializeLiaison = async () => {
  if (!isInitialized) {
    await liaisonService.initialize();
    isInitialized = true;
  }
};

// Validation schemas
const opportunityFiltersSchema = z.object({
  status: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
  organization: z.string().optional(),
  relevanceMinScore: z.number().min(0).max(1).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

const feedbackSchema = z.object({
  opportunityId: z.string().uuid(),
  action: z.enum(['accepted', 'rejected', 'saved', 'applied']),
  reason: z.string().optional(),
});

const exportFiltersSchema = z.object({
  status: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
  organization: z.array(z.string()).optional(),
  relevanceMinScore: z.number().min(0).max(1).optional(),
  deadlineAfter: z.string().datetime().optional(),
  deadlineBefore: z.string().datetime().optional(),
});

const exportOptionsSchema = z.object({
  format: z.enum(['csv', 'json']),
  filename: z.string().optional(),
  includeMetadata: z.boolean().optional().default(true),
});

// Middleware to ensure liaison service is initialized
const ensureInitialized = async (req: any, res: any, next: any) => {
  try {
    await initializeLiaison();
    next();
  } catch (error) {
    console.error('Failed to initialize liaison service:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Service initialization failed' 
    });
  }
};

// GET /api/liaison/opportunities - Get opportunities with filters
router.get('/opportunities', ensureInitialized, async (req, res) => {
  try {
    const filters = opportunityFiltersSchema.parse({
      status: req.query.status ? Array.isArray(req.query.status) 
        ? req.query.status 
        : [req.query.status] : undefined,
      type: req.query.type ? Array.isArray(req.query.type) 
        ? req.query.type 
        : [req.query.type] : undefined,
      organization: req.query.organization as string,
      relevanceMinScore: req.query.relevanceMinScore 
        ? parseFloat(req.query.relevanceMinScore as string) 
        : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });

    const result = await liaisonService.getOpportunities(filters);

    res.json({
      success: true,
      data: result.opportunities,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.opportunities.length === result.limit
      }
    });
  } catch (error: any) {
    console.error('Error fetching opportunities:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to fetch opportunities'
    });
  }
});

// POST /api/liaison/opportunities/:id/status - Update opportunity status
router.post('/opportunities/:id/status', ensureInitialized, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = (req as any).user?.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const opportunity = await liaisonService.updateOpportunityStatus(id, status, userId);

    // Broadcast the update via WebSocket
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastOpportunityUpdated(opportunity);
    }

    res.json({
      success: true,
      data: opportunity,
      message: `Opportunity status updated to ${status}`
    });
  } catch (error: any) {
    console.error('Error updating opportunity status:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update opportunity status'
    });
  }
});

// POST /api/liaison/feedback - Capture user feedback
router.post('/feedback', ensureInitialized, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const feedback = feedbackSchema.parse(req.body);

    await liaisonService.captureFeedback({
      opportunityId: feedback.opportunityId,
      action: feedback.action,
      reason: feedback.reason,
      userId
    });

    res.json({
      success: true,
      message: 'Feedback captured successfully'
    });
  } catch (error: any) {
    console.error('Error capturing feedback:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to capture feedback'
    });
  }
});

// POST /api/liaison/export - Export opportunities
router.post('/export', ensureInitialized, async (req, res) => {
  try {
    const { filters, options } = req.body;
    
    const validatedFilters = exportFiltersSchema.parse(filters || {});
    const validatedOptions = exportOptionsSchema.parse(options || {});

    // Convert string dates to Date objects
    const processedFilters = {
      ...validatedFilters,
      deadlineAfter: validatedFilters.deadlineAfter 
        ? new Date(validatedFilters.deadlineAfter) 
        : undefined,
      deadlineBefore: validatedFilters.deadlineBefore 
        ? new Date(validatedFilters.deadlineBefore) 
        : undefined,
    };

    const result = await liaisonService.exportOpportunities(
      validatedOptions.format,
      processedFilters,
      {
        filename: validatedOptions.filename,
        includeMetadata: validatedOptions.includeMetadata
      }
    );

    if (result instanceof Blob) {
      // Convert Blob to Buffer for Express response
      const buffer = Buffer.from(await result.arrayBuffer());
      const filename = validatedOptions.filename || 
        `opportunities_${new Date().toISOString().split('T')[0]}.${validatedOptions.format}`;

      res.setHeader('Content-Type', 
        validatedOptions.format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } else {
      res.status(500).json({
        success: false,
        error: 'Export failed to generate file'
      });
    }
  } catch (error: any) {
    console.error('Error exporting opportunities:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to export opportunities'
    });
  }
});

// GET /api/liaison/export/template/:format - Get export template
router.get('/export/template/:format', ensureInitialized, async (req, res) => {
  try {
    const { format } = req.params;
    
    if (format !== 'csv' && format !== 'json') {
      return res.status(400).json({
        success: false,
        error: 'Format must be csv or json'
      });
    }

    const result = await liaisonService.generateExportTemplate(format as 'csv' | 'json');
    const buffer = Buffer.from(await result.arrayBuffer());
    const filename = `template.${format}`;

    res.setHeader('Content-Type', 
      format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Error generating export template:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate export template'
    });
  }
});

// GET /api/liaison/dashboard - Get dashboard data
router.get('/dashboard', ensureInitialized, async (req, res) => {
  try {
    const dashboardData = await liaisonService.getDashboardData();

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard data'
    });
  }
});

// GET /api/liaison/stats - Get liaison statistics
router.get('/stats', ensureInitialized, async (req, res) => {
  try {
    const stats = await liaisonService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching liaison stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch liaison stats'
    });
  }
});

// GET /api/liaison/health - Health check endpoint
router.get('/health', ensureInitialized, async (req, res) => {
  try {
    const health = await liaisonService.healthCheck();

    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: true,
      data: health
    });
  } catch (error: any) {
    console.error('Error checking liaison health:', error);
    res.status(503).json({
      success: false,
      error: error.message || 'Health check failed',
      data: {
        status: 'unhealthy',
        details: {
          database: false,
          websocket: false,
          export: false
        }
      }
    });
  }
});

export default router;