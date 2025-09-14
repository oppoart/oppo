import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LiaisonService {
  private readonly logger = new Logger(LiaisonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('Liaison service initialized (stub implementation)');
  }

  @OnEvent('liaison.notify_user')
  async handleNotifyUser(notification: any) {
    this.logger.log('Sending notification', { userId: notification.userId });
    return this.sendNotification(notification);
  }

  async sendNotification(notification: any) {
    // TODO: Implement actual notification logic
    this.logger.log('Notification sending stubbed', notification);
    return { success: true, notificationId: Math.random().toString() };
  }

  async syncToNotion(data: any) {
    // TODO: Implement Notion sync
    this.logger.log('Notion sync stubbed', { itemCount: data.length });
    return { success: true, syncedItems: 0 };
  }

  async exportToFormat(format: string, data: any) {
    // TODO: Implement export functionality
    this.logger.log(`Export to ${format} stubbed`);
    return { success: true, format, itemCount: data.length };
  }

  async getExportHistory(userId: string) {
    return [];
  }

  async getFeedback(opportunityId: string) {
    // TODO: Add opportunityId field to Feedback model if needed
    // For now, return feedback related to opportunities via metadata
    return this.prisma.feedback.findMany({
      where: {
        metadata: {
          path: ['opportunityId'],
          equals: opportunityId,
        },
      },
    });
  }

  async submitFeedback(feedback: any) {
    // TODO: Implement feedback submission
    this.logger.log('Feedback submission stubbed', feedback);
    
    // Emit feedback event for analyst to process
    this.eventEmitter.emit('analyst.process_feedback', feedback);
    
    return { success: true, feedbackId: Math.random().toString() };
  }

  async getNotificationSettings(userId: string) {
    return {
      email: true,
      push: false,
      frequency: 'daily',
    };
  }

  async updateNotificationSettings(userId: string, settings: any) {
    this.logger.log('Notification settings update stubbed', { userId, settings });
    return { success: true };
  }

  async getOpportunities(options: any) {
    // Build where clause based on options
    const where: any = {};
    
    if (options.status && options.status.length > 0) {
      where.status = { in: options.status };
    }
    
    if (options.type && options.type.length > 0) {
      where.type = { in: options.type };
    }
    
    if (options.organization) {
      where.organization = { contains: options.organization, mode: 'insensitive' };
    }
    
    if (options.relevanceMinScore) {
      where.relevanceScore = { gte: options.relevanceMinScore };
    }

    const [opportunities, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { lastUpdated: 'desc' }
      }),
      this.prisma.opportunity.count({ where })
    ]);

    return {
      opportunities,
      total
    };
  }

  async updateOpportunityStatus(id: string, status: string) {
    return this.prisma.opportunity.update({
      where: { id },
      data: { status }
    });
  }

  async captureFeedback(feedback: {
    opportunityId: string;
    action: 'accepted' | 'rejected' | 'saved' | 'applied';
    reason?: string;
  }) {
    // Store feedback in database
    return this.prisma.feedback.create({
      data: {
        type: feedback.action,
        subject: `Feedback for opportunity ${feedback.opportunityId}`,
        message: feedback.reason || '',
        metadata: {
          opportunityId: feedback.opportunityId,
          action: feedback.action
        }
      }
    });
  }

  async exportOpportunities(
    filters: {
      status?: string[];
      type?: string[];
      organization?: string[];
      relevanceMinScore?: number;
      deadlineAfter?: string;
      deadlineBefore?: string;
    },
    options: {
      format: 'csv' | 'json';
      filename?: string;
      includeMetadata?: boolean;
    }
  ) {
    // Build where clause for filtering
    const where: any = {};
    
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }
    
    if (filters.type && filters.type.length > 0) {
      where.type = { in: filters.type };
    }
    
    if (filters.organization && filters.organization.length > 0) {
      where.organization = { in: filters.organization };
    }
    
    if (filters.relevanceMinScore) {
      where.relevanceScore = { gte: filters.relevanceMinScore };
    }
    
    if (filters.deadlineAfter) {
      where.deadline = { ...(where.deadline || {}), gte: new Date(filters.deadlineAfter) };
    }
    
    if (filters.deadlineBefore) {
      where.deadline = { ...(where.deadline || {}), lte: new Date(filters.deadlineBefore) };
    }

    const opportunities = await this.prisma.opportunity.findMany({
      where,
      orderBy: { lastUpdated: 'desc' }
    });

    if (options.format === 'csv') {
      return this.convertToCSV(opportunities);
    } else {
      return opportunities;
    }
  }

  async getExportTemplate(format: 'csv' | 'json') {
    const template = {
      title: 'Sample Opportunity Title',
      organization: 'Sample Organization',
      type: 'grant',
      deadline: '2024-12-31T23:59:59.000Z',
      url: 'https://example.com/opportunity',
      description: 'Sample opportunity description',
      eligibility: 'Sample eligibility criteria',
      amount: 'Sample funding amount',
      status: 'open',
      relevanceScore: 85.5
    };

    if (format === 'csv') {
      return this.convertToCSV([template]);
    } else {
      return [template];
    }
  }

  async getDashboardData() {
    const [
      totalOpportunities,
      newThisWeek,
      upcomingDeadlines,
      highRelevance,
      inProgress,
      submitted
    ] = await Promise.all([
      this.prisma.opportunity.count(),
      this.prisma.opportunity.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.prisma.opportunity.count({
        where: {
          deadline: {
            gte: new Date(),
            lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.prisma.opportunity.count({
        where: { relevanceScore: { gte: 70 } }
      }),
      this.prisma.opportunity.count({
        where: { status: 'in_progress' }
      }),
      this.prisma.opportunity.count({
        where: { status: 'submitted' }
      })
    ]);

    const [recentOpportunities, upcomingDeadlineOpportunities] = await Promise.all([
      this.prisma.opportunity.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.opportunity.findMany({
        where: {
          deadline: {
            gte: new Date(),
            lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          }
        },
        take: 5,
        orderBy: { deadline: 'asc' }
      })
    ]);

    return {
      stats: {
        totalOpportunities,
        newThisWeek,
        upcomingDeadlines,
        highRelevance,
        inProgress,
        submitted,
      },
      recentOpportunities,
      upcomingDeadlines: upcomingDeadlineOpportunities,
    };
  }

  async getStats() {
    const [totalExports, feedbackCount] = await Promise.all([
      // Mock export count (in real implementation, you'd track exports)
      Promise.resolve(0),
      this.prisma.feedback.count()
    ]);

    return {
      totalExports,
      feedbackCount,
      lastExport: null,
    };
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}