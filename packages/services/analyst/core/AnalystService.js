"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalystService = void 0;
const events_1 = require("events");
const QueryGeneratorService_1 = require("../query-generation/QueryGeneratorService");
const RelevanceScoringEngine_1 = require("../relevance-scoring/RelevanceScoringEngine");
const SentinelConnector_1 = require("../integration/SentinelConnector");
const ArchivistConnector_1 = require("../integration/ArchivistConnector");
const discovery_1 = require("../../../../apps/backend/src/types/discovery");
class AnalystService extends events_1.EventEmitter {
    constructor(prisma, config = {}) {
        super();
        this.prisma = prisma;
        this.isInitialized = false;
        this.activeAnalyses = new Map();
        this.config = {
            maxConcurrentAnalyses: 3,
            queryGenerationTimeout: 30000,
            scoringTimeout: 60000,
            aiProvider: 'openai',
            cacheDuration: 3600000,
            enablePersonalization: true,
            ...config
        };
        this.queryGenerator = new QueryGeneratorService_1.QueryGeneratorService({
            aiProvider: this.config.aiProvider,
            timeout: this.config.queryGenerationTimeout
        });
        this.scoringEngine = new RelevanceScoringEngine_1.RelevanceScoringEngine(prisma, {
            aiProvider: this.config.aiProvider,
            timeout: this.config.scoringTimeout
        });
        this.sentinelConnector = new SentinelConnector_1.SentinelConnector();
        this.archivistConnector = new ArchivistConnector_1.ArchivistConnector(prisma);
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        console.log('Initializing Analyst AI-Powered Analysis Engine...');
        try {
            await this.queryGenerator.initialize();
            await this.scoringEngine.initialize();
            await this.sentinelConnector.initialize();
            await this.archivistConnector.initialize();
            this.isInitialized = true;
            console.log('Analyst service initialized successfully');
        }
        catch (error) {
            const initError = new discovery_1.AIServiceError(`Failed to initialize Analyst service: ${error}`, 'analyst', 'initialization');
            this.emit('error', initError);
            throw initError;
        }
    }
    async runAnalysis(request) {
        if (!this.isInitialized) {
            throw new Error('Analyst service is not initialized');
        }
        if (this.activeAnalyses.size >= this.config.maxConcurrentAnalyses) {
            throw new Error('Maximum concurrent analyses limit reached');
        }
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        const analysisPromise = this.executeAnalysis(requestId, request, startTime);
        this.activeAnalyses.set(requestId, analysisPromise);
        try {
            const result = await analysisPromise;
            this.emit('analysis.completed', result);
            return result;
        }
        catch (error) {
            this.emit('analysis.failed', error, request);
            throw error;
        }
        finally {
            this.activeAnalyses.delete(requestId);
        }
    }
    async generateQueries(profileId, sources) {
        const profile = await this.getArtistProfile(profileId);
        return await this.queryGenerator.generateQueries(profile, sources);
    }
    async scoreOpportunities(profileId, opportunityIds) {
        const profile = await this.getArtistProfile(profileId);
        const opportunities = await this.archivistConnector.getOpportunities(opportunityIds);
        return await this.scoringEngine.scoreOpportunities(profile, opportunities);
    }
    async getStats() {
        return {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            averageProcessingTime: 0,
            totalQueriesGenerated: 0,
            totalOpportunitiesScored: 0,
            aiServiceUsage: {},
            lastAnalysis: undefined
        };
    }
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            const databaseOk = true;
            const queryGeneratorOk = await this.queryGenerator.healthCheck();
            const scoringEngineOk = await this.scoringEngine.healthCheck();
            const sentinelConnectionOk = await this.sentinelConnector.healthCheck();
            const archivistConnectionOk = await this.archivistConnector.healthCheck();
            const allHealthy = databaseOk && queryGeneratorOk && scoringEngineOk &&
                sentinelConnectionOk && archivistConnectionOk;
            return {
                status: allHealthy ? 'healthy' : 'degraded',
                details: {
                    database: databaseOk,
                    queryGenerator: queryGeneratorOk,
                    scoringEngine: scoringEngineOk,
                    sentinelConnection: sentinelConnectionOk,
                    archivistConnection: archivistConnectionOk
                }
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    database: false,
                    queryGenerator: false,
                    scoringEngine: false,
                    sentinelConnection: false,
                    archivistConnection: false
                }
            };
        }
    }
    async shutdown() {
        console.log('Shutting down Analyst service...');
        const activePromises = Array.from(this.activeAnalyses.values());
        if (activePromises.length > 0) {
            console.log(`Waiting for ${activePromises.length} active analyses to complete...`);
            await Promise.allSettled(activePromises);
        }
        await this.queryGenerator.shutdown();
        await this.scoringEngine.shutdown();
        await this.sentinelConnector.shutdown();
        await this.archivistConnector.shutdown();
        this.removeAllListeners();
        await this.prisma.$disconnect();
        this.isInitialized = false;
        console.log('Analyst service shutdown complete');
    }
    async executeAnalysis(requestId, request, startTime) {
        this.emit('analysis.started', request);
        const errors = [];
        let queriesGenerated = 0;
        let opportunitiesDiscovered = 0;
        let opportunitiesScored = 0;
        let newOpportunities = 0;
        try {
            const profile = await this.getArtistProfile(request.artistProfileId);
            const queries = await this.queryGenerator.generateQueries(profile, request.sources, request.maxQueries);
            queriesGenerated = queries.length;
            queries.forEach(query => {
                this.emit('query.generated', query, { profileId: profile.id });
            });
            const discoveryResults = await this.sentinelConnector.runDiscovery({
                queries,
                priority: request.priority || 'medium'
            });
            opportunitiesDiscovered = discoveryResults.length;
            this.emit('opportunities.discovered', discoveryResults);
            const scoredOpportunities = await this.scoringEngine.scoreOpportunities(profile, discoveryResults);
            opportunitiesScored = scoredOpportunities.size;
            const storedResults = await this.archivistConnector.storeOpportunities(Array.from(scoredOpportunities.entries()).map(([oppId, score]) => ({
                ...discoveryResults.find(opp => opp.id === oppId),
                relevanceScore: score
            })));
            newOpportunities = storedResults.created;
            this.emit('opportunities.scored', Array.from(scoredOpportunities.keys()));
            return {
                requestId,
                profileId: request.artistProfileId,
                queriesGenerated,
                opportunitiesDiscovered,
                opportunitiesScored,
                newOpportunities,
                processingTimeMs: Date.now() - startTime,
                errors
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(errorMessage);
            throw new discovery_1.AIServiceError(`Analysis failed: ${errorMessage}`, 'analyst', 'analysis', { requestId, profileId: request.artistProfileId });
        }
    }
    async getArtistProfile(profileId) {
        const profile = await this.prisma.artistProfile.findUnique({
            where: { id: profileId },
            include: {
                user: true
            }
        });
        if (!profile) {
            throw new Error(`Artist profile not found: ${profileId}`);
        }
        return profile;
    }
    generateRequestId() {
        return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.AnalystService = AnalystService;
//# sourceMappingURL=AnalystService.js.map