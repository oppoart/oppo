"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchivistService = void 0;
const events_1 = require("events");
const OpportunityRepository_1 = require("../repositories/OpportunityRepository");
const DeduplicationService_1 = require("../deduplication/DeduplicationService");
const discovery_1 = require("../../../../apps/backend/src/types/discovery");
class ArchivistService extends events_1.EventEmitter {
    constructor(prisma, config = {}) {
        super();
        this.prisma = prisma;
        this.config = {
            maxOpportunities: 10000,
            maxSourcesPerOpportunity: 10,
            autoCleanup: true,
            cleanupIntervalHours: 24,
            archiveAfterDays: 365,
            duplicateThreshold: 0.85,
            ...config
        };
        this.opportunityRepository = new OpportunityRepository_1.OpportunityRepository(prisma);
        this.deduplicationService = new DeduplicationService_1.DeduplicationService(prisma);
        if (this.config.autoCleanup) {
            this.scheduleCleanup();
        }
    }
    async saveOpportunity(data) {
        try {
            const validatedData = (0, discovery_1.validateOpportunityData)(data);
            const duplicateCheck = await this.deduplicationService.checkDuplicate(validatedData);
            if (duplicateCheck.isDuplicate) {
                this.emit('duplicate.detected', duplicateCheck);
                return {
                    isDuplicate: true,
                    duplicateOf: duplicateCheck.existingId
                };
            }
            const opportunity = await this.opportunityRepository.create(validatedData);
            this.emit('opportunity.created', opportunity);
            return {
                opportunity,
                isDuplicate: false
            };
        }
        catch (error) {
            const archivistError = new discovery_1.DiscoveryError(`Failed to save opportunity: ${error}`, 'manual', 'archivist');
            this.emit('error', archivistError);
            throw archivistError;
        }
    }
    async bulkSaveOpportunities(opportunities) {
        const results = {
            created: 0,
            duplicates: 0,
            errors: [],
            results: []
        };
        for (let i = 0; i < opportunities.length; i++) {
            try {
                const result = await this.saveOpportunity(opportunities[i]);
                results.results.push({
                    index: i,
                    success: true,
                    opportunityId: result.opportunity?.id,
                    isDuplicate: result.isDuplicate
                });
                if (result.isDuplicate) {
                    results.duplicates++;
                }
                else {
                    results.created++;
                }
            }
            catch (error) {
                const errorMessage = `Item ${i}: ${error}`;
                results.errors.push(errorMessage);
                results.results.push({
                    index: i,
                    success: false,
                    error: errorMessage
                });
            }
        }
        return results;
    }
    async getOpportunity(id) {
        return await this.opportunityRepository.findById(id);
    }
    async searchOpportunities(options) {
        return await this.opportunityRepository.findMany(options);
    }
    async updateOpportunity(id, data) {
        try {
            const opportunity = await this.opportunityRepository.update(id, data);
            this.emit('opportunity.updated', opportunity);
            return opportunity;
        }
        catch (error) {
            const archivistError = new discovery_1.DiscoveryError(`Failed to update opportunity ${id}: ${error}`, 'manual', 'archivist');
            this.emit('error', archivistError);
            throw archivistError;
        }
    }
    async deleteOpportunity(id) {
        try {
            await this.opportunityRepository.delete(id);
            this.emit('opportunity.deleted', id);
        }
        catch (error) {
            const archivistError = new discovery_1.DiscoveryError(`Failed to delete opportunity ${id}: ${error}`, 'manual', 'archivist');
            this.emit('error', archivistError);
            throw archivistError;
        }
    }
    async getHighRelevanceOpportunities(threshold = 0.7) {
        return await this.opportunityRepository.findHighRelevance(threshold);
    }
    async getUpcomingDeadlines(days = 7) {
        return await this.opportunityRepository.findUpcomingDeadlines(days);
    }
    async getOpportunitiesWithStats() {
        return await this.opportunityRepository.getOpportunitiesWithStats();
    }
    async getStarredOpportunities() {
        return await this.opportunityRepository.findMany({ starred: true });
    }
    async runDeduplication() {
        return await this.deduplicationService.runDeduplication();
    }
    async getDeduplicationStats() {
        return await this.deduplicationService.getDeduplicationStats();
    }
    async performMaintenance() {
        const startTime = Date.now();
        try {
            const archivedCount = await this.opportunityRepository.markExpiredOpportunities();
            const archiveDate = new Date();
            archiveDate.setDate(archiveDate.getDate() - this.config.archiveAfterDays);
            const { count: deletedCount } = await this.prisma.opportunity.deleteMany({
                where: {
                    discoveredAt: { lt: archiveDate },
                    status: 'archived'
                }
            });
            const stats = { archived: archivedCount, deleted: deletedCount };
            this.emit('cleanup.completed', stats);
            return stats;
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    async getStats() {
        const [oppStats, deduplicationStats, sourcesCount, storageInfo] = await Promise.all([
            this.opportunityRepository.getStats(),
            this.deduplicationService.getDeduplicationStats(),
            this.prisma.opportunitySource.count({ where: { enabled: true } }),
            this.getStorageInfo()
        ]);
        return {
            totalOpportunities: oppStats.total,
            opportunitiesByStatus: oppStats.byStatus,
            averageRelevanceScore: oppStats.averageRelevanceScore,
            recentlyAdded: oppStats.recentlyAdded,
            upcomingDeadlines: oppStats.upcomingDeadlines,
            duplicatesDetected: deduplicationStats.duplicatesIdentified,
            sourcesActive: sourcesCount,
            storageUsed: storageInfo
        };
    }
    async validateDataIntegrity() {
        const issues = [];
        let invalidRecords = 0;
        let missingRelationships = 0;
        let orphanedRecords = 0;
        const opportunitiesWithoutTitle = await this.prisma.opportunity.count({
            where: { title: '' }
        });
        if (opportunitiesWithoutTitle > 0) {
            invalidRecords += opportunitiesWithoutTitle;
            issues.push(`${opportunitiesWithoutTitle} opportunities missing title`);
        }
        const orphanedSourceLinks = await this.prisma.opportunitySourceLink.count({
            where: {
                opportunity: null
            }
        });
        if (orphanedSourceLinks > 0) {
            orphanedRecords += orphanedSourceLinks;
            issues.push(`${orphanedSourceLinks} orphaned source links`);
        }
        const totalRecords = await this.prisma.opportunity.count();
        return {
            totalRecords,
            invalidRecords,
            missingRelationships,
            orphanedRecords,
            issues
        };
    }
    async repairDataIntegrity() {
        const errors = [];
        let repaired = 0;
        try {
            const { count: orphanedRemoved } = await this.prisma.opportunitySourceLink.deleteMany({
                where: {
                    opportunity: null
                }
            });
            repaired += orphanedRemoved;
            const { count: titlesFixed } = await this.prisma.opportunity.updateMany({
                where: { title: '' },
                data: { title: 'Untitled Opportunity' }
            });
            repaired += titlesFixed;
        }
        catch (error) {
            errors.push(`Repair failed: ${error}`);
        }
        return { repaired, errors };
    }
    scheduleCleanup() {
        setInterval(() => {
            this.performMaintenance().catch(error => {
                this.emit('error', error);
            });
        }, this.config.cleanupIntervalHours * 60 * 60 * 1000);
    }
    async getStorageInfo() {
        try {
            const count = await this.prisma.opportunity.count();
            return `${Math.round(count * 2.5)} KB (estimated)`;
        }
        catch {
            return 'Unknown';
        }
    }
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            const databaseOk = true;
            const testCount = await this.opportunityRepository.findMany({ limit: 1 });
            const repositoriesOk = true;
            const dedupStats = await this.deduplicationService.getDeduplicationStats();
            const deduplicationOk = true;
            const allHealthy = databaseOk && repositoriesOk && deduplicationOk;
            return {
                status: allHealthy ? 'healthy' : 'degraded',
                details: {
                    database: databaseOk,
                    repositories: repositoriesOk,
                    deduplication: deduplicationOk
                }
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    database: false,
                    repositories: false,
                    deduplication: false
                }
            };
        }
    }
    async shutdown() {
        this.removeAllListeners();
        await this.prisma.$disconnect();
    }
}
exports.ArchivistService = ArchivistService;
//# sourceMappingURL=ArchivistService.js.map