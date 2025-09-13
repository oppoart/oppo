"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchivistConnector = void 0;
const ArchivistService_1 = require("../../archivist/core/ArchivistService");
const discovery_1 = require("../../../../apps/backend/src/types/discovery");
class ArchivistConnector {
    constructor(prisma, config = {}) {
        this.prisma = prisma;
        this.isInitialized = false;
        this.config = {
            minRelevanceThreshold: 0.3,
            batchSize: 20,
            enableFiltering: true,
            ...config
        };
        this.archivistService = config.archivistInstance;
    }
    async initialize() {
        if (this.isInitialized)
            return;
        console.log('Initializing ArchivistConnector...');
        try {
            if (!this.archivistService) {
                this.archivistService = new ArchivistService_1.ArchivistService(this.prisma);
                console.log('Created new ArchivistService instance');
            }
            this.isInitialized = true;
            console.log('ArchivistConnector initialized successfully');
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to initialize ArchivistConnector: ${error}`, 'archivist', 'connector-initialization');
        }
    }
    async storeOpportunities(opportunities) {
        if (!this.isInitialized || !this.archivistService) {
            throw new Error('ArchivistConnector is not initialized');
        }
        const result = {
            created: 0,
            duplicates: 0,
            errors: [],
            storedOpportunities: []
        };
        try {
            const filteredOpportunities = this.config.enableFiltering ?
                opportunities.filter(opp => !opp.relevanceScore || opp.relevanceScore >= this.config.minRelevanceThreshold) : opportunities;
            console.log(`Storing ${filteredOpportunities.length} opportunities (filtered from ${opportunities.length})`);
            const batches = this.createBatches(filteredOpportunities, this.config.batchSize);
            for (const batch of batches) {
                try {
                    const batchResult = await this.archivistService.bulkSaveOpportunities(batch);
                    result.created += batchResult.created;
                    result.duplicates += batchResult.duplicates;
                    result.errors.push(...batchResult.errors);
                    for (const batchItem of batchResult.results) {
                        if (batchItem.success && batchItem.opportunityId) {
                            result.storedOpportunities.push(batchItem.opportunityId);
                        }
                    }
                }
                catch (batchError) {
                    const errorMessage = `Batch storage failed: ${batchError}`;
                    result.errors.push(errorMessage);
                    console.error(errorMessage);
                }
            }
            console.log(`Storage complete: ${result.created} created, ${result.duplicates} duplicates, ${result.errors.length} errors`);
            return result;
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to store opportunities: ${error}`, 'archivist', 'opportunity-storage', { opportunityCount: opportunities.length });
        }
    }
    async getOpportunities(opportunityIds) {
        if (!this.isInitialized || !this.archivistService) {
            throw new Error('ArchivistConnector is not initialized');
        }
        try {
            const opportunities = [];
            for (const id of opportunityIds) {
                const opportunity = await this.archivistService.getOpportunity(id);
                if (opportunity) {
                    opportunities.push(opportunity);
                }
            }
            return opportunities;
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to retrieve opportunities: ${error}`, 'archivist', 'opportunity-retrieval', { opportunityIds });
        }
    }
    async updateRelevanceScores(scores) {
        if (!this.isInitialized || !this.archivistService) {
            throw new Error('ArchivistConnector is not initialized');
        }
        const result = {
            updated: 0,
            errors: []
        };
        try {
            for (const [opportunityId, score] of scores.entries()) {
                try {
                    await this.archivistService.updateOpportunity(opportunityId, {
                        relevanceScore: score,
                        processed: true,
                        aiServiceUsed: 'analyst'
                    });
                    result.updated++;
                }
                catch (error) {
                    const errorMessage = `Failed to update opportunity ${opportunityId}: ${error}`;
                    result.errors.push(errorMessage);
                }
            }
            return result;
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to update relevance scores: ${error}`, 'archivist', 'score-update');
        }
    }
    async getHighRelevanceOpportunities(profileId, threshold = 0.7, limit = 50) {
        if (!this.isInitialized || !this.archivistService) {
            throw new Error('ArchivistConnector is not initialized');
        }
        try {
            const opportunities = await this.archivistService.getHighRelevanceOpportunities(threshold);
            return opportunities.slice(0, limit);
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to get high relevance opportunities: ${error}`, 'archivist', 'high-relevance-query', { profileId, threshold, limit });
        }
    }
    async searchOpportunities(filters) {
        if (!this.isInitialized || !this.archivistService) {
            throw new Error('ArchivistConnector is not initialized');
        }
        try {
            const searchOptions = {
                limit: filters.maxResults || 50,
                minRelevanceScore: filters.minRelevanceScore,
                tags: filters.tags,
                status: filters.status
            };
            return await this.archivistService.searchOpportunities(searchOptions);
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to search opportunities: ${error}`, 'archivist', 'opportunity-search', { filters });
        }
    }
    async getArchivistStats() {
        if (!this.isInitialized || !this.archivistService) {
            throw new Error('ArchivistConnector is not initialized');
        }
        try {
            const stats = await this.archivistService.getStats();
            return {
                totalOpportunities: stats.totalOpportunities,
                averageRelevanceScore: stats.averageRelevanceScore,
                processedOpportunities: 0,
                recentlyAdded: stats.recentlyAdded
            };
        }
        catch (error) {
            console.error('Failed to get Archivist stats:', error);
            return {
                totalOpportunities: 0,
                averageRelevanceScore: 0,
                processedOpportunities: 0,
                recentlyAdded: 0
            };
        }
    }
    async healthCheck() {
        try {
            if (!this.archivistService)
                return false;
            const health = await this.archivistService.healthCheck();
            return health.status === 'healthy';
        }
        catch (error) {
            console.error('ArchivistConnector health check failed:', error);
            return false;
        }
    }
    setArchivistService(archivistService) {
        this.archivistService = archivistService;
    }
    async shutdown() {
        this.isInitialized = false;
    }
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
    validateOpportunity(opportunity) {
        return !!(opportunity.title &&
            opportunity.description &&
            opportunity.url &&
            opportunity.sourceType);
    }
    filterOpportunities(opportunities, criteria) {
        return opportunities.filter(opp => {
            if (criteria.minRelevanceScore && opp.relevanceScore &&
                opp.relevanceScore < criteria.minRelevanceScore) {
                return false;
            }
            if (criteria.requiredFields) {
                for (const field of criteria.requiredFields) {
                    if (!opp[field]) {
                        return false;
                    }
                }
            }
            return true;
        });
    }
}
exports.ArchivistConnector = ArchivistConnector;
//# sourceMappingURL=ArchivistConnector.js.map