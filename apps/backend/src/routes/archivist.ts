import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ArchivistService } from '../../../../packages/services/archivist/core/ArchivistService';
import { DataMaintenanceService } from '../../../../packages/services/archivist/data-management/DataMaintenanceService';
import { DataExportService } from '../../../../packages/services/archivist/data-management/DataExportService';
import { 
  OpportunityApiResponse, 
  validateOpportunityData 
} from '../types/discovery';
import { 
  getMockOpportunities, 
  getMockOpportunitiesByType, 
  getMockOpportunitiesByRelevance, 
  searchMockOpportunities 
} from '../data/mockOpportunities';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router: Router = Router();
const prisma = new PrismaClient();

// Initialize services
const archivistService = new ArchivistService(prisma);
const maintenanceService = new DataMaintenanceService(prisma);
const exportService = new DataExportService(prisma);

// Rate limiting for intensive operations
const heavyOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many intensive operations, please try again later.'
});

// Validation schemas
const opportunityQuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  status: z.string().optional(),
  minRelevanceScore: z.string().transform(Number).optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  starred: z.string().transform(val => val === 'true').optional(),
  deadlineAfter: z.string().transform(str => new Date(str)).optional(),
  deadlineBefore: z.string().transform(str => new Date(str)).optional()
});

const exportFiltersSchema = z.object({
  status: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }).optional(),
  minRelevanceScore: z.number().optional(),
  tags: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
  includeSourceData: z.boolean().default(false),
  includeDuplicates: z.boolean().default(false)
});

// =====================================
// Opportunity CRUD Operations
// =====================================

/**
 * GET /archivist/opportunities
 * Search and retrieve opportunities with filtering
 */
router.get('/opportunities', async (req: Request, res: Response) => {
  try {
    const query = opportunityQuerySchema.parse(req.query);
    
    // For now, use mock data since the database might not have opportunities yet
    let opportunities: any[] = [];
    
    // Apply filters to mock data
    if (query.search) {
      opportunities = searchMockOpportunities(query.search, query.limit || 50);
    } else if (query.type) {
      opportunities = getMockOpportunitiesByType(query.type, query.limit || 50);
    } else if (query.minRelevanceScore) {
      opportunities = getMockOpportunitiesByRelevance(query.minRelevanceScore, query.limit || 50);
    } else {
      opportunities = getMockOpportunities(query.limit || 50, ((query.page || 1) - 1) * (query.limit || 50));
    }

    // Apply additional filters
    if (query.deadlineBefore) {
      const deadlineDate = new Date(query.deadlineBefore);
      opportunities = opportunities.filter(opp => 
        opp.deadline && new Date(opp.deadline) <= deadlineDate
      );
    }

    if (query.deadlineAfter) {
      const deadlineDate = new Date(query.deadlineAfter);
      opportunities = opportunities.filter(opp => 
        opp.deadline && new Date(opp.deadline) >= deadlineDate
      );
    }

    // Add IDs and timestamps to mock data
    const opportunitiesWithIds = opportunities.map((opp, index) => ({
      ...opp,
      id: `mock-${Date.now()}-${index}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const total = opportunitiesWithIds.length;

    const response: OpportunityApiResponse = {
      success: true,
      message: 'Opportunities retrieved successfully',
      data: opportunitiesWithIds,
      pagination: {
        page: query.page || 1,
        limit: query.limit || 50,
        total: total,
        pages: Math.ceil(total / (query.limit || 50))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error retrieving opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve opportunities',
      data: null
    });
  }
});

/**
 * GET /archivist/opportunities/:id
 * Get a specific opportunity by ID
 */
router.get('/opportunities/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // For mock data, find by ID or return first opportunity
    const allOpportunities = getMockOpportunities(1000, 0);
    const opportunity = allOpportunities.find(opp => opp.title.toLowerCase().includes(id.toLowerCase())) || allOpportunities[0];
    
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found',
        data: null
      });
    }

    const opportunityWithId = {
      ...opportunity,
      id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response: OpportunityApiResponse = {
      success: true,
      message: 'Opportunity retrieved successfully',
      data: opportunityWithId as any
    };

    return res.json(response);
  } catch (error) {
    console.error('Error retrieving opportunity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve opportunity',
      data: null
    });
  }
});

/**
 * POST /archivist/opportunities
 * Create a new opportunity
 */
router.post('/opportunities', async (req: Request, res: Response) => {
  try {
    const result = await archivistService.saveOpportunity(req.body);

    if (result.isDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'Opportunity already exists',
        data: {
          isDuplicate: true,
          duplicateOf: result.duplicateOf
        }
      });
    }

    const response: OpportunityApiResponse = {
      success: true,
      message: 'Opportunity created successfully',
      data: result.opportunity as any
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating opportunity:', error);
    res.status(400).json({
      success: false,
      message: `Failed to create opportunity: ${error}`,
      data: null
    });
  }
});

/**
 * POST /archivist/opportunities/bulk
 * Bulk create opportunities
 */
router.post('/opportunities/bulk', heavyOperationLimiter, async (req: Request, res: Response) => {
  try {
    const { opportunities } = req.body;
    
    if (!Array.isArray(opportunities)) {
      return res.status(400).json({
        success: false,
        message: 'Expected array of opportunities',
        data: null
      });
    }

    const result = await archivistService.bulkSaveOpportunities(opportunities);

    res.json({
      success: true,
      message: `Bulk operation completed. Created: ${result.created}, Duplicates: ${result.duplicates}, Errors: ${result.errors.length}`,
      data: result
    });
  } catch (error) {
    console.error('Error in bulk create:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk operation failed',
      data: null
    });
  }
});

/**
 * PUT /archivist/opportunities/:id
 * Update an opportunity
 */
router.put('/opportunities/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const opportunity = await archivistService.updateOpportunity(id, req.body);

    const response: OpportunityApiResponse = {
      success: true,
      message: 'Opportunity updated successfully',
      data: opportunity
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating opportunity:', error);
    res.status(400).json({
      success: false,
      message: `Failed to update opportunity: ${error}`,
      data: null
    });
  }
});

/**
 * DELETE /archivist/opportunities/:id
 * Delete an opportunity
 */
router.delete('/opportunities/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await archivistService.deleteOpportunity(id);

    res.json({
      success: true,
      message: 'Opportunity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete opportunity'
    });
  }
});

// =====================================
// Specialized Query Endpoints
// =====================================

/**
 * GET /archivist/opportunities/high-relevance
 * Get high relevance opportunities
 */
router.get('/opportunities/high-relevance', async (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.7;
    const opportunities = getMockOpportunitiesByRelevance(threshold, 20);
    
    // Add IDs and timestamps to mock data
    const opportunitiesWithIds = opportunities.map((opp, index) => ({
      ...opp,
      id: `mock-high-${Date.now()}-${index}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    res.json({
      success: true,
      message: 'High relevance opportunities retrieved',
      data: opportunitiesWithIds
    });
  } catch (error) {
    console.error('Error retrieving high relevance opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve high relevance opportunities'
    });
  }
});

/**
 * GET /archivist/opportunities/upcoming-deadlines
 * Get opportunities with upcoming deadlines
 */
router.get('/opportunities/upcoming-deadlines', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const opportunities = await archivistService.getUpcomingDeadlines(days);

    res.json({
      success: true,
      message: `Opportunities with deadlines in next ${days} days`,
      data: opportunities
    });
  } catch (error) {
    console.error('Error retrieving upcoming deadlines:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve upcoming deadlines'
    });
  }
});

/**
 * GET /archivist/opportunities/starred
 * Get starred/bookmarked opportunities
 */
router.get('/opportunities/starred', async (req: Request, res: Response) => {
  try {
    const opportunities = await archivistService.getStarredOpportunities();

    res.json({
      success: true,
      message: 'Starred opportunities retrieved',
      data: opportunities
    });
  } catch (error) {
    console.error('Error retrieving starred opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve starred opportunities'
    });
  }
});

/**
 * GET /archivist/opportunities/with-stats
 * Get opportunities with additional statistics
 */
router.get('/opportunities/with-stats', async (req: Request, res: Response) => {
  try {
    const opportunities = await archivistService.getOpportunitiesWithStats();

    res.json({
      success: true,
      message: 'Opportunities with stats retrieved',
      data: opportunities
    });
  } catch (error) {
    console.error('Error retrieving opportunities with stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve opportunities with stats'
    });
  }
});

// =====================================
// Statistics and Analytics
// =====================================

/**
 * GET /archivist/stats
 * Get comprehensive Archivist statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await archivistService.getStats();

    res.json({
      success: true,
      message: 'Archivist statistics retrieved',
      data: stats
    });
  } catch (error) {
    console.error('Error retrieving stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
});

/**
 * GET /archivist/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await archivistService.healthCheck();

    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status !== 'unhealthy',
      message: `Archivist service is ${health.status}`,
      data: health
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(503).json({
      success: false,
      message: 'Health check failed'
    });
  }
});

// =====================================
// Deduplication Operations
// =====================================

/**
 * POST /archivist/deduplication/run
 * Run deduplication process
 */
router.post('/deduplication/run', heavyOperationLimiter, async (req: Request, res: Response) => {
  try {
    const result = await archivistService.runDeduplication();

    res.json({
      success: true,
      message: 'Deduplication completed',
      data: result
    });
  } catch (error) {
    console.error('Error running deduplication:', error);
    res.status(500).json({
      success: false,
      message: 'Deduplication failed'
    });
  }
});

/**
 * GET /archivist/deduplication/stats
 * Get deduplication statistics
 */
router.get('/deduplication/stats', async (req: Request, res: Response) => {
  try {
    const stats = await archivistService.getDeduplicationStats();

    res.json({
      success: true,
      message: 'Deduplication statistics retrieved',
      data: stats
    });
  } catch (error) {
    console.error('Error retrieving deduplication stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve deduplication statistics'
    });
  }
});

// =====================================
// Data Maintenance Operations
// =====================================

/**
 * POST /archivist/maintenance/run
 * Run data maintenance
 */
router.post('/maintenance/run', heavyOperationLimiter, async (req: Request, res: Response) => {
  try {
    const stats = await maintenanceService.performCleanup();

    res.json({
      success: true,
      message: 'Data maintenance completed',
      data: stats
    });
  } catch (error) {
    console.error('Error running maintenance:', error);
    res.status(500).json({
      success: false,
      message: 'Data maintenance failed'
    });
  }
});

/**
 * GET /archivist/maintenance/status
 * Get maintenance service status
 */
router.get('/maintenance/status', async (req: Request, res: Response) => {
  try {
    const status = await maintenanceService.getHealthStatus();

    res.json({
      success: true,
      message: 'Maintenance status retrieved',
      data: status
    });
  } catch (error) {
    console.error('Error getting maintenance status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get maintenance status'
    });
  }
});

/**
 * GET /archivist/maintenance/storage
 * Get storage statistics
 */
router.get('/maintenance/storage', async (req: Request, res: Response) => {
  try {
    const stats = await maintenanceService.getStorageStats();

    res.json({
      success: true,
      message: 'Storage statistics retrieved',
      data: stats
    });
  } catch (error) {
    console.error('Error getting storage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get storage statistics'
    });
  }
});

// =====================================
// Export and Backup Operations
// =====================================

/**
 * POST /archivist/export/json
 * Export opportunities to JSON
 */
router.post('/export/json', heavyOperationLimiter, async (req: Request, res: Response) => {
  try {
    const filters = exportFiltersSchema.optional().parse(req.body.filters);
    const result = await exportService.exportToJSON(filters);

    res.json({
      success: true,
      message: 'JSON export completed',
      data: result
    });
  } catch (error) {
    console.error('Error exporting to JSON:', error);
    res.status(500).json({
      success: false,
      message: 'JSON export failed'
    });
  }
});

/**
 * POST /archivist/export/csv
 * Export opportunities to CSV
 */
router.post('/export/csv', heavyOperationLimiter, async (req: Request, res: Response) => {
  try {
    const filters = exportFiltersSchema.optional().parse(req.body.filters);
    const result = await exportService.exportToCSV(filters);

    res.json({
      success: true,
      message: 'CSV export completed',
      data: result
    });
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    res.status(500).json({
      success: false,
      message: 'CSV export failed'
    });
  }
});

/**
 * POST /archivist/backup/create
 * Create a full backup
 */
router.post('/backup/create', heavyOperationLimiter, async (req: Request, res: Response) => {
  try {
    const result = await exportService.createBackup();

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'Backup creation failed'
    });
  }
});

/**
 * GET /archivist/exports
 * List all available exports
 */
router.get('/exports', async (req: Request, res: Response) => {
  try {
    const exports = await exportService.listExports();

    res.json({
      success: true,
      message: 'Exports listed successfully',
      data: exports
    });
  } catch (error) {
    console.error('Error listing exports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list exports'
    });
  }
});

/**
 * GET /archivist/backups
 * List all available backups
 */
router.get('/backups', async (req: Request, res: Response) => {
  try {
    const backups = await exportService.listBackups();

    res.json({
      success: true,
      message: 'Backups listed successfully',
      data: backups
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups'
    });
  }
});

// =====================================
// Data Integrity Operations
// =====================================

/**
 * GET /archivist/integrity/validate
 * Validate data integrity
 */
router.get('/integrity/validate', heavyOperationLimiter, async (req: Request, res: Response) => {
  try {
    const result = await archivistService.validateDataIntegrity();

    res.json({
      success: true,
      message: 'Data integrity validation completed',
      data: result
    });
  } catch (error) {
    console.error('Error validating data integrity:', error);
    res.status(500).json({
      success: false,
      message: 'Data integrity validation failed'
    });
  }
});

/**
 * POST /archivist/integrity/repair
 * Repair data integrity issues
 */
router.post('/integrity/repair', heavyOperationLimiter, async (req: Request, res: Response) => {
  try {
    const result = await archivistService.repairDataIntegrity();

    res.json({
      success: true,
      message: 'Data integrity repair completed',
      data: result
    });
  } catch (error) {
    console.error('Error repairing data integrity:', error);
    res.status(500).json({
      success: false,
      message: 'Data integrity repair failed'
    });
  }
});

// Error handling middleware for this router
router.use((error: any, req: Request, res: Response, next: any) => {
  console.error('Archivist route error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error in Archivist service',
    data: null
  });
});

export default router;