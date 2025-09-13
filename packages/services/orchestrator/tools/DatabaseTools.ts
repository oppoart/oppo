import { PrismaClient } from '@prisma/client';
import { Tool } from '../types';

export class DatabaseTools {
  constructor(private prisma: PrismaClient) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_upcoming_deadline_opportunities',
        description: 'Retrieves opportunities with deadlines within specified number of days',
        parameters: [
          {
            name: 'days',
            type: 'number',
            description: 'Number of days to look ahead for deadlines',
            required: false,
            default: 7
          },
          {
            name: 'limit',
            type: 'number', 
            description: 'Maximum number of opportunities to return',
            required: false,
            default: 20
          }
        ],
        handler: async (params) => {
          const days = params.days || 7;
          const limit = params.limit || 20;
          
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + days);

          const opportunities = await this.prisma.opportunity.findMany({
            where: {
              deadline: {
                gte: new Date(),
                lte: futureDate
              }
            },
            orderBy: { deadline: 'asc' },
            take: limit
          });

          return {
            opportunities,
            count: opportunities.length,
            dateRange: {
              from: new Date().toISOString().split('T')[0],
              to: futureDate.toISOString().split('T')[0]
            },
            summary: `Found ${opportunities.length} opportunities with deadlines in the next ${days} days`
          };
        }
      },

      {
        name: 'get_high_relevance_opportunities', 
        description: 'Fetches opportunities above relevance score threshold',
        parameters: [
          {
            name: 'threshold',
            type: 'number',
            description: 'Minimum relevance score (0-100)',
            required: false,
            default: 80
          },
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum number of opportunities to return', 
            required: false,
            default: 20
          }
        ],
        handler: async (params) => {
          const threshold = params.threshold || 80;
          const limit = params.limit || 20;

          const opportunities = await this.prisma.opportunity.findMany({
            where: {
              relevanceScore: {
                gte: threshold
              }
            },
            orderBy: { relevanceScore: 'desc' },
            take: limit
          });

          const avgScore = opportunities.length > 0 
            ? opportunities.reduce((sum, opp) => sum + (opp.relevanceScore || 0), 0) / opportunities.length
            : 0;

          return {
            opportunities,
            count: opportunities.length,
            threshold,
            averageScore: Math.round(avgScore * 100) / 100,
            summary: `Found ${opportunities.length} opportunities with relevance score ≥ ${threshold}`
          };
        }
      },

      {
        name: 'get_opportunities_by_status',
        description: 'Filters opportunities by application status',
        parameters: [
          {
            name: 'status',
            type: 'string',
            description: 'Status to filter by (new, reviewing, applying, submitted, rejected)',
            required: true
          },
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum number of opportunities to return',
            required: false,
            default: 50
          }
        ],
        handler: async (params) => {
          const status = params.status;
          const limit = params.limit || 50;

          const opportunities = await this.prisma.opportunity.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
            take: limit
          });

          return {
            opportunities,
            count: opportunities.length,
            status,
            summary: `Found ${opportunities.length} opportunities with status: ${status}`
          };
        }
      },

      {
        name: 'get_opportunities_by_type',
        description: 'Filters opportunities by type (grant, residency, exhibition, etc.)',
        parameters: [
          {
            name: 'type',
            type: 'string', 
            description: 'Opportunity type to filter by',
            required: true
          },
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum number of opportunities to return',
            required: false,
            default: 30
          }
        ],
        handler: async (params) => {
          const type = params.type;
          const limit = params.limit || 30;

          const opportunities = await this.prisma.opportunity.findMany({
            where: { type },
            orderBy: { createdAt: 'desc' },
            take: limit
          });

          return {
            opportunities,
            count: opportunities.length,
            type,
            summary: `Found ${opportunities.length} ${type} opportunities`
          };
        }
      },

      {
        name: 'get_opportunity_stats',
        description: 'Gets statistical overview of opportunities in the database',
        parameters: [],
        handler: async () => {
          const [
            total,
            byStatus,
            byType,
            withDeadlines,
            highRelevance
          ] = await Promise.all([
            this.prisma.opportunity.count(),
            this.prisma.opportunity.groupBy({
              by: ['status'],
              _count: { status: true }
            }),
            this.prisma.opportunity.groupBy({
              by: ['type'],
              _count: { type: true }
            }),
            this.prisma.opportunity.count({
              where: {
                deadline: { not: null }
              }
            }),
            this.prisma.opportunity.count({
              where: {
                relevanceScore: { gte: 80 }
              }
            })
          ]);

          const statusStats = Object.fromEntries(
            byStatus.map(item => [item.status || 'unknown', item._count.status])
          );

          const typeStats = Object.fromEntries(
            byType.map(item => [item.type || 'unknown', item._count.type])
          );

          return {
            total,
            byStatus: statusStats,
            byType: typeStats,
            withDeadlines,
            highRelevance,
            summary: `Total: ${total} opportunities. ${highRelevance} high-relevance. ${withDeadlines} with deadlines.`
          };
        }
      },

      {
        name: 'search_opportunities',
        description: 'Searches opportunities by title, description, or organization',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: 'Search query string',
            required: true
          },
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum number of results to return',
            required: false,
            default: 20
          }
        ],
        handler: async (params) => {
          const query = params.query;
          const limit = params.limit || 20;

          const opportunities = await this.prisma.opportunity.findMany({
            where: {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { organization: { contains: query, mode: 'insensitive' } }
              ]
            },
            orderBy: { relevanceScore: 'desc' },
            take: limit
          });

          return {
            opportunities,
            count: opportunities.length,
            query,
            summary: `Found ${opportunities.length} opportunities matching "${query}"`
          };
        }
      },

      {
        name: 'get_artist_profiles',
        description: 'Retrieves artist profiles from the database',
        parameters: [
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum number of profiles to return',
            required: false,
            default: 10
          }
        ],
        handler: async (params) => {
          const limit = params.limit || 10;

          const profiles = await this.prisma.artistProfile.findMany({
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
          });

          return {
            profiles,
            count: profiles.length,
            summary: `Found ${profiles.length} artist profiles`
          };
        }
      },

      {
        name: 'get_recent_activity',
        description: 'Gets recent activity (newly added opportunities)',
        parameters: [
          {
            name: 'hours',
            type: 'number',
            description: 'Number of hours to look back',
            required: false,
            default: 24
          },
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum number of items to return',
            required: false,
            default: 50
          }
        ],
        handler: async (params) => {
          const hours = params.hours || 24;
          const limit = params.limit || 50;

          const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);

          const recentOpportunities = await this.prisma.opportunity.findMany({
            where: {
              createdAt: { gte: sinceDate }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
          });

          return {
            opportunities: recentOpportunities,
            count: recentOpportunities.length,
            timeframe: `Last ${hours} hours`,
            summary: `Found ${recentOpportunities.length} opportunities added in the last ${hours} hours`
          };
        }
      }
    ];
  }
}