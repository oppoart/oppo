"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalystApi = void 0;
const AnalystService_1 = require("../core/AnalystService");
class AnalystApi {
    constructor(config) {
        this.isInitialized = false;
        this.analystService = new AnalystService_1.AnalystService(config.prisma, {
            aiProvider: config.aiProvider || 'openai',
            enablePersonalization: true
        });
    }
    async initialize() {
        if (this.isInitialized)
            return;
        await this.analystService.initialize();
        this.isInitialized = true;
        console.log('AnalystApi initialized successfully');
    }
    async runAnalysis(request) {
        try {
            if (!this.isInitialized) {
                throw new Error('AnalystApi is not initialized');
            }
            const result = await this.analystService.runAnalysis(request);
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            console.error('Analysis failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async generateQueries(profileId, sources) {
        try {
            if (!this.isInitialized) {
                throw new Error('AnalystApi is not initialized');
            }
            const queries = await this.analystService.generateQueries(profileId, sources);
            return {
                success: true,
                data: queries
            };
        }
        catch (error) {
            console.error('Query generation failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async scoreOpportunities(profileId, opportunityIds) {
        try {
            if (!this.isInitialized) {
                throw new Error('AnalystApi is not initialized');
            }
            const scores = await this.analystService.scoreOpportunities(profileId, opportunityIds);
            const scoresObject = Object.fromEntries(scores);
            return {
                success: true,
                data: scoresObject
            };
        }
        catch (error) {
            console.error('Scoring failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getStats() {
        try {
            if (!this.isInitialized) {
                throw new Error('AnalystApi is not initialized');
            }
            const stats = await this.analystService.getStats();
            return {
                success: true,
                data: stats
            };
        }
        catch (error) {
            console.error('Failed to get stats:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async healthCheck() {
        try {
            const health = await this.analystService.healthCheck();
            return {
                success: health.status !== 'unhealthy',
                data: health
            };
        }
        catch (error) {
            console.error('Health check failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async shutdown() {
        await this.analystService.shutdown();
        this.isInitialized = false;
    }
}
exports.AnalystApi = AnalystApi;
//# sourceMappingURL=analyst.js.map