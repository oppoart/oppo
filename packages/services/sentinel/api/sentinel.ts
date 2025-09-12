import { Request, Response } from 'express';
import { SentinelService } from '../core/SentinelService';
import { DiscoveryContext } from '../core/interfaces';

/**
 * REST API endpoints for the Sentinel Discovery Engine
 */
export class SentinelAPI {
  constructor(private sentinelService: SentinelService) {}
  
  /**
   * GET /api/sentinel/health
   * Service health check endpoint
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await this.sentinelService.checkHealth();
      const overallHealth = Object.values(healthStatus).every(status => status);
      
      res.status(overallHealth ? 200 : 503).json({
        success: true,
        status: overallHealth ? 'healthy' : 'unhealthy',
        message: overallHealth ? 'All discoverers are healthy' : 'Some discoverers are unhealthy',
        data: {
          discoverers: healthStatus,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * POST /api/sentinel/discover
   * Trigger discovery from specific sources or all enabled sources
   */
  async triggerDiscovery(req: Request, res: Response): Promise<void> {
    try {
      const { sources, context } = req.body;
      
      // Validate context if provided
      const discoveryContext: DiscoveryContext | undefined = context ? {
        searchTerms: context.searchTerms || undefined,
        location: context.location || undefined,
        dateRange: context.dateRange ? {
          start: new Date(context.dateRange.start),
          end: new Date(context.dateRange.end)
        } : undefined,
        maxResults: context.maxResults || undefined,
        metadata: context.metadata || undefined
      } : undefined;
      
      let result;
      
      if (sources && Array.isArray(sources) && sources.length > 0) {
        // Run discovery from specific sources
        result = await this.sentinelService.runSpecificDiscovery(sources, discoveryContext);
      } else {
        // Run discovery from all enabled sources
        result = await this.sentinelService.runDiscovery(discoveryContext);
      }
      
      res.status(200).json({
        success: true,
        message: `Discovery completed: ${result.newOpportunities} new opportunities found`,
        data: result
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Discovery failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * GET /api/sentinel/sources
   * List all available discovery sources
   */
  async getSources(req: Request, res: Response): Promise<void> {
    try {
      const discoverers = this.sentinelService.getDiscoverers();
      const pluginStats = this.sentinelService.getPluginStats();
      
      const sources = discoverers.map(discoverer => ({
        name: discoverer.name,
        sourceType: discoverer.sourceType,
        version: discoverer.version,
        enabled: pluginStats[discoverer.name]?.enabled || false,
        priority: pluginStats[discoverer.name]?.priority || 'medium',
        stats: {
          totalRuns: pluginStats[discoverer.name]?.totalRuns || 0,
          successfulRuns: pluginStats[discoverer.name]?.successfulRuns || 0,
          successRate: pluginStats[discoverer.name]?.successRate || 0,
          averageProcessingTime: pluginStats[discoverer.name]?.averageProcessingTime || 0,
          lastRun: pluginStats[discoverer.name]?.lastRun || null
        }
      }));
      
      res.status(200).json({
        success: true,
        message: `Found ${sources.length} discovery sources`,
        data: {
          sources,
          summary: {
            total: sources.length,
            enabled: sources.filter(s => s.enabled).length,
            disabled: sources.filter(s => !s.enabled).length
          }
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve sources',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * GET /api/sentinel/sources/:name
   * Get details for a specific source
   */
  async getSource(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const discoverer = this.sentinelService.getDiscoverer(name);
      
      if (!discoverer) {
        res.status(404).json({
          success: false,
          message: `Source not found: ${name}`
        });
        return;
      }
      
      const pluginStats = this.sentinelService.getPluginStats();
      const sourceStats = pluginStats[name];
      
      const isHealthy = await discoverer.isHealthy();
      const config = discoverer.getConfig();
      
      res.status(200).json({
        success: true,
        message: `Source details for ${name}`,
        data: {
          name: discoverer.name,
          sourceType: discoverer.sourceType,
          version: discoverer.version,
          enabled: sourceStats?.enabled || false,
          healthy: isHealthy,
          config: {
            priority: config.priority,
            rateLimit: config.rateLimit,
            timeout: config.timeout,
            retryAttempts: config.retryAttempts
          },
          stats: sourceStats || {
            totalRuns: 0,
            successfulRuns: 0,
            successRate: 0,
            averageProcessingTime: 0,
            lastRun: null
          }
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve source details',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * PUT /api/sentinel/sources/:name/toggle
   * Enable/disable a specific source
   */
  async toggleSource(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'enabled field must be a boolean'
        });
        return;
      }
      
      await this.sentinelService.toggleDiscoverer(name, enabled);
      
      res.status(200).json({
        success: true,
        message: `Source ${name} ${enabled ? 'enabled' : 'disabled'}`,
        data: {
          name,
          enabled
        }
      });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes('not found') ? 404 : 500;
      
      res.status(status).json({
        success: false,
        message: `Failed to toggle source: ${message}`,
        error: message
      });
    }
  }
  
  /**
   * GET /api/sentinel/jobs
   * List discovery jobs and their status
   */
  async getJobs(req: Request, res: Response): Promise<void> {
    try {
      const { status, limit = 50, discoverer } = req.query;
      
      let jobs;
      
      if (status && typeof status === 'string') {
        jobs = await this.sentinelService.getJobStatuses();
        jobs = jobs.filter(job => job.status === status);
      } else if (discoverer && typeof discoverer === 'string') {
        // Get jobs for specific discoverer would need to be implemented in SentinelService
        jobs = await this.sentinelService.getJobStatuses();
        jobs = jobs.filter(job => job.discovererName === discoverer);
      } else {
        jobs = await this.sentinelService.getJobStatuses();
      }
      
      // Apply limit
      const limitNum = parseInt(limit as string, 10) || 50;
      jobs = jobs.slice(0, limitNum);
      
      // Get job queue status for additional context
      const jobManager = (this.sentinelService as any).jobManager;
      const queueStatus = jobManager ? jobManager.getQueueStatus() : null;
      
      res.status(200).json({
        success: true,
        message: `Found ${jobs.length} jobs`,
        data: {
          jobs,
          queue: queueStatus,
          summary: {
            total: jobs.length,
            pending: jobs.filter(job => job.status === 'pending').length,
            running: jobs.filter(job => job.status === 'running').length,
            completed: jobs.filter(job => job.status === 'completed').length,
            failed: jobs.filter(job => job.status === 'failed').length
          }
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve jobs',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * POST /api/sentinel/jobs
   * Create a new discovery job (manual trigger)
   */
  async createJob(req: Request, res: Response): Promise<void> {
    try {
      const { discoverer, context } = req.body;
      
      if (!discoverer || typeof discoverer !== 'string') {
        res.status(400).json({
          success: false,
          message: 'discoverer field is required and must be a string'
        });
        return;
      }
      
      // Validate that the discoverer exists
      const discovererInstance = this.sentinelService.getDiscoverer(discoverer);
      if (!discovererInstance) {
        res.status(404).json({
          success: false,
          message: `Discoverer not found: ${discoverer}`
        });
        return;
      }
      
      // Validate context if provided
      const discoveryContext: DiscoveryContext | undefined = context ? {
        searchTerms: context.searchTerms || undefined,
        location: context.location || undefined,
        dateRange: context.dateRange ? {
          start: new Date(context.dateRange.start),
          end: new Date(context.dateRange.end)
        } : undefined,
        maxResults: context.maxResults || undefined,
        metadata: context.metadata || undefined
      } : undefined;
      
      // Trigger discovery for the specific discoverer
      const result = await this.sentinelService.runSpecificDiscovery([discoverer], discoveryContext);
      
      res.status(201).json({
        success: true,
        message: `Discovery job created for ${discoverer}`,
        data: result
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create discovery job',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * GET /api/sentinel/jobs/:id
   * Get details for a specific job
   */
  async getJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // This would require extending the job manager to support job lookup by ID
      const jobs = await this.sentinelService.getJobStatuses();
      const job = jobs.find(j => j.id === id);
      
      if (!job) {
        res.status(404).json({
          success: false,
          message: `Job not found: ${id}`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: `Job details for ${id}`,
        data: job
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve job details',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * GET /api/sentinel/stats
   * Get comprehensive statistics about the discovery system
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const pluginStats = this.sentinelService.getPluginStats();
      const healthStatus = await this.sentinelService.checkHealth();
      const jobs = await this.sentinelService.getJobStatuses();
      
      const stats = {
        discoverers: {
          total: Object.keys(pluginStats).length,
          enabled: Object.values(pluginStats).filter((s: any) => s.enabled).length,
          healthy: Object.values(healthStatus).filter(Boolean).length,
          details: pluginStats
        },
        jobs: {
          active: jobs.filter(job => job.status === 'running' || job.status === 'pending').length,
          completed: jobs.filter(job => job.status === 'completed').length,
          failed: jobs.filter(job => job.status === 'failed').length,
          recent: jobs.slice(0, 10)
        },
        system: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      res.status(200).json({
        success: true,
        message: 'Discovery system statistics',
        data: stats
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}