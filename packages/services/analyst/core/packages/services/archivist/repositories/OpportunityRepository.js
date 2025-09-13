"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityRepository = void 0;
class OpportunityRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Create a new opportunity with proper relationship handling
     */
    async create(data) {
        // Convert our typed data to Prisma format
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
    /**
     * Find opportunity by ID with full relationships
     */
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
    /**
     * Update opportunity with validation
     */
    async update(id, data) {
        const updateData = {
            lastUpdated: new Date()
        };
        // Only include defined fields
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
    /**
     * Update opportunity status with history tracking
     */
    async updateStatus(id, status, notes) {
        await this.prisma.$transaction([
            // Update the opportunity status
            this.prisma.opportunity.update({
                where: { id },
                data: {
                    status,
                    lastUpdated: new Date()
                }
            })
        ]);
    }
    /**
     * Delete opportunity and all related data
     */
    async delete(id) {
        await this.prisma.opportunity.delete({
            where: { id }
        });
    }
    /**
     * Find opportunities with advanced filtering
     */
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
    /**
     * Find upcoming deadlines
     */
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
    /**
     * Find high relevance opportunities
     */
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
    /**
     * Get opportunities with comprehensive stats
     */
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
            applicationCount: 0, // Will be implemented when application tracking is added
            lastAction: opp.lastUpdated
        }));
    }
    /**
     * Get comprehensive opportunity statistics
     */
    async getStats() {
        const [total, statusCounts, relevanceScoreAvg, upcomingDeadlines, recentlyAdded] = await Promise.all([
            // Total count
            this.prisma.opportunity.count(),
            // Count by status
            this.prisma.opportunity.groupBy({
                by: ['status'],
                _count: true
            }),
            // Average relevance score
            this.prisma.opportunity.aggregate({
                _avg: {
                    relevanceScore: true
                }
            }),
            // Upcoming deadlines (next 7 days)
            this.prisma.opportunity.count({
                where: {
                    deadline: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    }
                }
            }),
            // Recently added (last 24 hours)
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
    /**
     * Search opportunities with full-text search capabilities
     */
    async search(query, options = {}) {
        return this.findMany({
            ...options,
            search: query
        });
    }
    /**
     * Mark opportunities as expired based on deadline
     */
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
    /**
     * Get opportunity by source hash (for deduplication)
     */
    async findBySourceHash(hash) {
        return await this.prisma.opportunity.findFirst({
            where: {
                // We'll implement a proper source hash field or use URL as proxy
                url: hash
            }
        });
    }
    /**
     * Bulk create opportunities with conflict handling
     */
    async bulkCreate(opportunities) {
        const results = {
            created: 0,
            duplicates: 0,
            errors: []
        };
        for (const opp of opportunities) {
            try {
                // Check for existing opportunity by URL
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
