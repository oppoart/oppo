"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityRepository = void 0;
class OpportunityRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const opportunityData = {
            title: data.title,
            organization: data.organization || null,
            description: data.description,
            url: data.url,
            deadline: data.deadline || null,
            amount: data.amount || null,
            location: data.location || null,
            tags: data.tags,
            sourceType: data.sourceType,
            sourceUrl: data.sourceUrl || null,
            sourceMetadata: data.sourceMetadata || {},
            relevanceScore: data.relevanceScore || null,
            semanticScore: data.semanticScore || null,
            keywordScore: data.keywordScore || null,
            categoryScore: data.categoryScore || null,
            aiServiceUsed: data.aiServiceUsed || null,
            processingTimeMs: data.processingTimeMs || null,
            processed: data.processed || false,
            status: data.status || 'new',
            applied: data.applied || false,
            notes: data.notes || null,
            starred: data.starred || false,
        };
        return await this.prisma.opportunity.create({
            data: opportunityData,
            include: {
                sourceLinks: {
                    include: {
                        source: true
                    }
                },
                matches: true,
                duplicates: true,
                duplicateOf: true
            }
        });
    }
    async findById(id) {
        return await this.prisma.opportunity.findUnique({
            where: { id },
            include: {
                sourceLinks: {
                    include: {
                        source: true
                    }
                },
                matches: true,
                duplicates: true,
                duplicateOf: true
            }
        });
    }
    async update(id, data) {
        const updateData = {
            lastUpdated: new Date()
        };
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value !== undefined) {
                updateData[key] = value;
            }
        });
        return await this.prisma.opportunity.update({
            where: { id },
            data: updateData,
            include: {
                sourceLinks: {
                    include: {
                        source: true
                    }
                },
                matches: true
            }
        });
    }
    async updateStatus(id, status, notes) {
        await this.prisma.$transaction([
            this.prisma.opportunity.update({
                where: { id },
                data: {
                    status,
                    lastUpdated: new Date()
                }
            })
        ]);
    }
    async delete(id) {
        await this.prisma.opportunity.delete({
            where: { id }
        });
    }
    async findMany(options = {}) {
        const { limit = 50, offset = 0, status, minRelevanceScore, deadlineAfter, deadlineBefore, search, tags, organizationName, starred } = options;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (minRelevanceScore !== undefined) {
            where.relevanceScore = { gte: minRelevanceScore };
        }
        if (deadlineAfter || deadlineBefore) {
            where.deadline = {};
            if (deadlineAfter)
                where.deadline.gte = deadlineAfter;
            if (deadlineBefore)
                where.deadline.lte = deadlineBefore;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { organization: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (tags && tags.length > 0) {
            where.tags = { hasSome: tags };
        }
        if (organizationName) {
            where.organization = { contains: organizationName, mode: 'insensitive' };
        }
        if (starred !== undefined) {
            where.starred = starred;
        }
        return await this.prisma.opportunity.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: [
                { relevanceScore: 'desc' },
                { discoveredAt: 'desc' }
            ],
            include: {
                sourceLinks: {
                    include: {
                        source: true
                    }
                },
                matches: true
            }
        });
    }
    async findUpcomingDeadlines(days = 7) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + days);
        return await this.prisma.opportunity.findMany({
            where: {
                deadline: {
                    gte: new Date(),
                    lte: deadline
                },
                status: {
                    in: ['new', 'reviewing', 'applying']
                }
            },
            orderBy: {
                deadline: 'asc'
            },
            include: {
                sourceLinks: {
                    include: {
                        source: true
                    }
                }
            }
        });
    }
    async findHighRelevance(threshold = 0.7) {
        return await this.prisma.opportunity.findMany({
            where: {
                relevanceScore: {
                    gte: threshold
                },
                status: 'new'
            },
            orderBy: {
                relevanceScore: 'desc'
            },
            take: 20,
            include: {
                sourceLinks: {
                    include: {
                        source: true
                    }
                }
            }
        });
    }
    async getOpportunitiesWithStats() {
        const opportunities = await this.prisma.opportunity.findMany({
            include: {
                sourceLinks: true,
                _count: {
                    select: {
                        sourceLinks: true
                    }
                }
            },
            orderBy: {
                relevanceScore: 'desc'
            },
            take: 50
        });
        return opportunities.map(opp => ({
            ...opp,
            sourceCount: opp._count.sourceLinks,
            applicationCount: 0,
            lastAction: opp.lastUpdated
        }));
    }
    async getStats() {
        const [total, statusCounts, relevanceScoreAvg, upcomingDeadlines, recentlyAdded] = await Promise.all([
            this.prisma.opportunity.count(),
            this.prisma.opportunity.groupBy({
                by: ['status'],
                _count: true
            }),
            this.prisma.opportunity.aggregate({
                _avg: {
                    relevanceScore: true
                }
            }),
            this.prisma.opportunity.count({
                where: {
                    deadline: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    }
                }
            }),
            this.prisma.opportunity.count({
                where: {
                    discoveredAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);
        const byStatus = {};
        statusCounts.forEach(item => {
            byStatus[item.status] = item._count;
        });
        return {
            total,
            byStatus,
            averageRelevanceScore: relevanceScoreAvg._avg.relevanceScore || 0,
            upcomingDeadlines,
            recentlyAdded
        };
    }
    async search(query, options = {}) {
        return this.findMany({
            ...options,
            search: query
        });
    }
    async markExpiredOpportunities() {
        const result = await this.prisma.opportunity.updateMany({
            where: {
                deadline: {
                    lt: new Date()
                },
                status: {
                    in: ['new', 'reviewing']
                }
            },
            data: {
                status: 'archived'
            }
        });
        return result.count;
    }
    async findBySourceHash(hash) {
        return await this.prisma.opportunity.findFirst({
            where: {
                url: hash
            }
        });
    }
    async bulkCreate(opportunities) {
        const results = {
            created: 0,
            duplicates: 0,
            errors: []
        };
        for (const opp of opportunities) {
            try {
                const existing = await this.prisma.opportunity.findFirst({
                    where: { url: opp.url }
                });
                if (existing) {
                    results.duplicates++;
                    continue;
                }
                await this.create(opp);
                results.created++;
            }
            catch (error) {
                results.errors.push(`Failed to create opportunity "${opp.title}": ${error}`);
            }
        }
        return results;
    }
}
exports.OpportunityRepository = OpportunityRepository;
//# sourceMappingURL=OpportunityRepository.js.map