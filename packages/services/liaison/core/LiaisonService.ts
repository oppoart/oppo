import { PrismaClient, Opportunity } from '@prisma/client';
import { EventEmitter } from 'events';
import { ExportService } from '../export/ExportService';
import { WebSocketService } from '../websocket/WebSocketService';
import { 
  LiaisonConfig, 
  LiaisonEvents, 
  UserFeedback, 
  FeedbackAction,
  ExportFormat,
  LiaisonStats
} from '../types';

export interface FeedbackCapture {
  opportunityId: string;
  action: FeedbackAction;
  reason?: string;
  userId?: string;
}

export class LiaisonService extends EventEmitter {
  private exportService: ExportService;
  private webSocketService: WebSocketService;
  private config: LiaisonConfig;
  private isInitialized: boolean = false;

  constructor(
    private prisma: PrismaClient,
    config: Partial<LiaisonConfig> = {},
    wsUrl?: string
  ) {
    super();
    
    this.config = {
      ui: {
        theme: 'light',
        kanbanColumns: ['new', 'reviewing', 'applying', 'submitted', 'rejected'],
        defaultView: 'kanban',
        itemsPerPage: 20,
        ...config.ui
      },
      export: {
        formats: ['csv', 'json'],
        maxItems: 1000,
        ...config.export
      },
      realtime: {
        enabled: true,
        reconnectDelay: 5000,
        maxReconnectAttempts: 10,
        ...config.realtime
      }
    };

    // Initialize services
    this.exportService = new ExportService(this.prisma, this.config.export);
    
    if (wsUrl && this.config.realtime.enabled) {
      this.webSocketService = new WebSocketService(wsUrl, this.config.realtime);
    }

    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing Liaison User Interface and External Integrations...');

    try {
      // Initialize WebSocket service if configured
      if (this.webSocketService) {
        await this.webSocketService.initialize();
      }


      this.isInitialized = true;
      console.log('Liaison service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Liaison service:', error);
      throw error;
    }
  }

  // UI State Management Methods

  async getOpportunities(filters?: {
    status?: string[];
    type?: string[];
    organization?: string;
    relevanceMinScore?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    opportunities: Opportunity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || this.config.ui.itemsPerPage, 100);
    const offset = (page - 1) * limit;

    const where: any = {};

    if (filters?.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters?.type && filters.type.length > 0) {
      where.type = { in: filters.type };
    }

    if (filters?.organization) {
      where.organization = { contains: filters.organization, mode: 'insensitive' };
    }

    if (filters?.relevanceMinScore !== undefined) {
      where.relevanceScore = { gte: filters.relevanceMinScore };
    }

    const [opportunities, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.opportunity.count({ where })
    ]);

    return {
      opportunities,
      total,
      page,
      limit
    };
  }

  async updateOpportunityStatus(
    opportunityId: string, 
    status: string,
    userId?: string
  ): Promise<Opportunity> {
    const opportunity = await this.prisma.opportunity.update({
      where: { id: opportunityId },
      data: { 
        status,
        updatedAt: new Date()
      }
    });

    // Broadcast update via WebSocket
    if (this.webSocketService) {
      this.webSocketService.broadcastOpportunityUpdated(opportunity);
    }


    this.emit('opportunity.updated', opportunity);
    return opportunity;
  }

  // Feedback System

  async captureFeedback(feedback: FeedbackCapture): Promise<void> {
    const userFeedback: UserFeedback = {
      opportunityId: feedback.opportunityId,
      action: feedback.action,
      reason: feedback.reason,
      timestamp: new Date(),
      context: {
        previousStatus: await this.getOpportunityStatus(feedback.opportunityId),
        timeToDecision: await this.calculateTimeToDecision(feedback.opportunityId)
      }
    };

    // Store feedback in database (would need a feedback table)
    // await this.prisma.userFeedback.create({ data: userFeedback });

    // Update opportunity status based on feedback
    let newStatus: string;
    switch (feedback.action) {
      case 'accepted':
        newStatus = 'applying';
        break;
      case 'rejected':
        newStatus = 'rejected';
        break;
      case 'saved':
        newStatus = 'saved';
        break;
      case 'applied':
        newStatus = 'submitted';
        break;
      default:
        newStatus = 'reviewing';
    }

    await this.updateOpportunityStatus(feedback.opportunityId, newStatus, feedback.userId);

    this.emit('feedback.received', userFeedback);
  }

  // Export Functionality

  async exportOpportunities(
    format: ExportFormat,
    filters?: {
      status?: string[];
      type?: string[];
      organization?: string[];
      relevanceMinScore?: number;
      deadlineAfter?: Date;
      deadlineBefore?: Date;
    },
    options?: {
      filename?: string;
      includeMetadata?: boolean;
    }
  ): Promise<Blob | void> {
    return this.exportService.exportFiltered(filters || {}, format, options);
  }

  async generateExportTemplate(format: ExportFormat): Promise<Blob> {
    return this.exportService.generateExportTemplate(format);
  }


  // Real-time Updates

  broadcastUpdate(type: 'added' | 'updated', opportunity: Opportunity): void {
    if (!this.webSocketService) return;

    switch (type) {
      case 'added':
        this.webSocketService.broadcastOpportunityAdded(opportunity);
        break;
      case 'updated':
        this.webSocketService.broadcastOpportunityUpdated(opportunity);
        break;
    }
  }

  // Statistics and Analytics

  async getStats(): Promise<LiaisonStats> {
    // This would query actual database tables for statistics
    const opportunityCount = await this.prisma.opportunity.count();
    
    return {
      totalExports: 0, // Would come from export log table
      feedbackCount: 0, // Would come from feedback table
      lastExport: undefined
    };
  }

  async getDashboardData(): Promise<{
    stats: {
      totalOpportunities: number;
      newThisWeek: number;
      upcomingDeadlines: number;
      highRelevance: number;
      inProgress: number;
      submitted: number;
    };
    recentOpportunities: Opportunity[];
    upcomingDeadlines: Opportunity[];
  }> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalOpportunities,
      newThisWeek,
      upcomingDeadlines,
      highRelevance,
      inProgress,
      submitted,
      recentOpportunities,
      deadlineOpportunities
    ] = await Promise.all([
      this.prisma.opportunity.count(),
      this.prisma.opportunity.count({
        where: { createdAt: { gte: weekAgo } }
      }),
      this.prisma.opportunity.count({
        where: { 
          deadline: { 
            gte: now,
            lte: oneWeekFromNow 
          } 
        }
      }),
      this.prisma.opportunity.count({
        where: { relevanceScore: { gte: 80 } }
      }),
      this.prisma.opportunity.count({
        where: { status: { in: ['reviewing', 'applying'] } }
      }),
      this.prisma.opportunity.count({
        where: { status: 'submitted' }
      }),
      this.prisma.opportunity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      this.prisma.opportunity.findMany({
        where: {
          deadline: {
            gte: now,
            lte: oneWeekFromNow
          }
        },
        orderBy: { deadline: 'asc' },
        take: 10
      })
    ]);

    return {
      stats: {
        totalOpportunities,
        newThisWeek,
        upcomingDeadlines,
        highRelevance,
        inProgress,
        submitted
      },
      recentOpportunities,
      upcomingDeadlines: deadlineOpportunities
    };
  }

  // Health Check

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      database: boolean;
      websocket: boolean;
      export: boolean;
    };
  }> {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      const databaseOk = true;

      // Test WebSocket connection
      const websocketOk = this.webSocketService ? 
        await this.webSocketService.healthCheck() : true;

      // Export service is always available
      const exportOk = true;

      const allHealthy = databaseOk && websocketOk && exportOk;

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        details: {
          database: databaseOk,
          websocket: websocketOk,
          export: exportOk
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          database: false,
          websocket: false,
          export: false
        }
      };
    }
  }

  // Graceful Shutdown

  async shutdown(): Promise<void> {
    console.log('Shutting down Liaison service...');

    // Shutdown services
    if (this.webSocketService) {
      await this.webSocketService.shutdown();
    }

    // Clean up
    this.removeAllListeners();
    await this.prisma.$disconnect();

    this.isInitialized = false;
    console.log('Liaison service shutdown complete');
  }

  // Private Methods

  private setupEventHandlers(): void {
    this.exportService.on('export.completed', (format, count) => {
      this.emit('export.completed', format, count);
    });

    if (this.webSocketService) {
      this.webSocketService.on('websocket.connected', () => {
        this.emit('websocket.connected');
      });

      this.webSocketService.on('websocket.disconnected', () => {
        this.emit('websocket.disconnected');
      });
    }
  }


  private async getOpportunityStatus(opportunityId: string): Promise<string> {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { status: true }
    });
    return opportunity?.status || 'unknown';
  }

  private async calculateTimeToDecision(opportunityId: string): Promise<number> {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { createdAt: true }
    });
    
    if (!opportunity) return 0;
    
    return Date.now() - opportunity.createdAt.getTime();
  }
}