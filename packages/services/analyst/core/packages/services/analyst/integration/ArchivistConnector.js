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
    /**
     * Initialize the Archivist connector
     */
    async initialize() {
        if (this.isInitialized)
            return;
        console.log('Initializing ArchivistConnector...');
        try {
            // If no Archivist instance provided, create one
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
    /**
     * Store analyzed opportunities with relevance scores
     */
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
            // Filter opportunities by relevance threshold if enabled
            const filteredOpportunities = this.config.enableFiltering ?
                opportunities.filter(opp => !opp.relevanceScore || opp.relevanceScore >= this.config.minRelevanceThreshold) : opportunities;
            console.log(`Storing ${filteredOpportunities.length} opportunities (filtered from ${opportunities.length})`);
            // Process in batches to avoid overwhelming the database
            const batches = this.createBatches(filteredOpportunities, this.config.batchSize);
            for (const batch of batches) {
                try {
                    const batchResult = await this.archivistService.bulkSaveOpportunities(batch);
                    result.created += batchResult.created;
                    result.duplicates += batchResult.duplicates;
                    result.errors.push(...batchResult.errors);
                    // Collect successful opportunity IDs
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
    /**
     * Get opportunities by IDs for scoring
     */
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
    /**
     * Update opportunity relevance scores
     */
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
    /**
     * Get high-relevance opportunities for an artist profile
     */
    async getHighRelevanceOpportunities(profileId, threshold = 0.7, limit = 50) {
        if (!this.isInitialized || !this.archivistService) {
            throw new Error('ArchivistConnector is not initialized');
        }
        try {
            // Get high relevance opportunities
            const opportunities = await this.archivistService.getHighRelevanceOpportunities(threshold);
            // Limit results
            return opportunities.slice(0, limit);
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to get high relevance opportunities: ${error}`, 'archivist', 'high-relevance-query', { profileId, threshold, limit });
        }
    }
    /**
     * Search opportunities with filters
     */
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
    /**
     * Get Archivist statistics
     */
    async getArchivistStats() {
        if (!this.isInitialized || !this.archivistService) {
            throw new Error('ArchivistConnector is not initialized');
        }
        try {
            const stats = await this.archivistService.getStats();
            return {
                totalOpportunities: stats.totalOpportunities,
                averageRelevanceScore: stats.averageRelevanceScore,
                processedOpportunities: 0, // Would need a database query to get actual count
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
    /**
     * Health check for Archivist connection
     */
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
    /**
     * Set Archivist service instance
     */
    setArchivistService(archivistService) {
        this.archivistService = archivistService;
    }
    /**
     * Shutdown the connector
     */
    async shutdown() {
        // Note: We don't shutdown the ArchivistService here as it might be used elsewhere
        this.isInitialized = false;
    }
    // =====================================
    // Private Methods
    // =====================================
    /**
     * Create batches for processing
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
    /**
     * Validate opportunity data before storage
     */
    validateOpportunity(opportunity) {
        // Basic validation
        return !!(opportunity.title &&
            opportunity.description &&
            opportunity.url &&
            opportunity.sourceType);
    }
    /**
     * Filter opportunities by various criteria
     */
    filterOpportunities(opportunities, criteria) {
        return opportunities.filter(opp => {
            // Relevance score filter
            if (criteria.minRelevanceScore && opp.relevanceScore &&
                opp.relevanceScore < criteria.minRelevanceScore) {
                return false;
            }
            // Age filter (if we had discoveredAt field)
            // if (criteria.maxAge && opp.discoveredAt) {
            //   const daysSinceDiscovered = (Date.now() - opp.discoveredAt.getTime()) / (1000 * 60 * 60 * 24);
            //   if (daysSinceDiscovered > criteria.maxAge) {
            //     return false;
            //   }
            // }
            // Required fields filter
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
