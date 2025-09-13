"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiaisonService = void 0;
const events_1 = require("events");
const ExportService_1 = require("../export/ExportService");
const WebSocketService_1 = require("../websocket/WebSocketService");
class LiaisonService extends events_1.EventEmitter {
    constructor(prisma, config = {}, wsUrl) {
        super();
        this.prisma = prisma;
        this.isInitialized = false;
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
        this.exportService = new ExportService_1.ExportService(this.prisma, this.config.export);
        if (wsUrl && this.config.realtime.enabled) {
            this.webSocketService = new WebSocketService_1.WebSocketService(wsUrl, this.config.realtime);
        }
        this.setupEventHandlers();
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        console.log('Initializing Liaison User Interface and External Integrations...');
        try {
            if (this.webSocketService) {
                await this.webSocketService.initialize();
            }
            this.isInitialized = true;
            console.log('Liaison service initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize Liaison service:', error);
            throw error;
        }
    }
    async getOpportunities(filters) {
        const page = filters?.page || 1;
        const limit = Math.min(filters?.limit || this.config.ui.itemsPerPage, 100);
        const offset = (page - 1) * limit;
        const where = {};
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
    async updateOpportunityStatus(opportunityId, status, userId) {
        const opportunity = await this.prisma.opportunity.update({
            where: { id: opportunityId },
            data: {
                status,
                updatedAt: new Date()
            }
        });
        if (this.webSocketService) {
            this.webSocketService.broadcastOpportunityUpdated(opportunity);
        }
        this.emit('opportunity.updated', opportunity);
        return opportunity;
    }
    async captureFeedback(feedback) {
        const userFeedback = {
            opportunityId: feedback.opportunityId,
            action: feedback.action,
            reason: feedback.reason,
            timestamp: new Date(),
            context: {
                previousStatus: await this.getOpportunityStatus(feedback.opportunityId),
                timeToDecision: await this.calculateTimeToDecision(feedback.opportunityId)
            }
        };
        let newStatus;
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
    async exportOpportunities(format, filters, options) {
        return this.exportService.exportFiltered(filters || {}, format, options);
    }
    async generateExportTemplate(format) {
        return this.exportService.generateExportTemplate(format);
    }
    broadcastUpdate(type, opportunity) {
        if (!this.webSocketService)
            return;
        switch (type) {
            case 'added':
                this.webSocketService.broadcastOpportunityAdded(opportunity);
                break;
            case 'updated':
                this.webSocketService.broadcastOpportunityUpdated(opportunity);
                break;
        }
    }
    async getStats() {
        const opportunityCount = await this.prisma.opportunity.count();
        return {
            totalExports: 0,
            feedbackCount: 0,
            lastExport: undefined
        };
    }
    async getDashboardData() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const [totalOpportunities, newThisWeek, upcomingDeadlines, highRelevance, inProgress, submitted, recentOpportunities, deadlineOpportunities] = await Promise.all([
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
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            const databaseOk = true;
            const websocketOk = this.webSocketService ?
                await this.webSocketService.healthCheck() : true;
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
        }
        catch (error) {
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
    async shutdown() {
        console.log('Shutting down Liaison service...');
        if (this.webSocketService) {
            await this.webSocketService.shutdown();
        }
        this.removeAllListeners();
        await this.prisma.$disconnect();
        this.isInitialized = false;
        console.log('Liaison service shutdown complete');
    }
    setupEventHandlers() {
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
    async getOpportunityStatus(opportunityId) {
        const opportunity = await this.prisma.opportunity.findUnique({
            where: { id: opportunityId },
            select: { status: true }
        });
        return opportunity?.status || 'unknown';
    }
    async calculateTimeToDecision(opportunityId) {
        const opportunity = await this.prisma.opportunity.findUnique({
            where: { id: opportunityId },
            select: { createdAt: true }
        });
        if (!opportunity)
            return 0;
        return Date.now() - opportunity.createdAt.getTime();
    }
}
exports.LiaisonService = LiaisonService;
//# sourceMappingURL=LiaisonService.js.map