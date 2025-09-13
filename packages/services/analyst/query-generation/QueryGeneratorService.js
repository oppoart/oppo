"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryGeneratorService = void 0;
const ProfileAnalyzer_1 = require("./ProfileAnalyzer");
const ContextBuilder_1 = require("./ContextBuilder");
const QueryOptimizer_1 = require("./QueryOptimizer");
const basic_query_template_1 = require("./templates/basic-query.template");
const semantic_query_template_1 = require("./templates/semantic-query.template");
const types_1 = require("./types");
class QueryGeneratorService {
    constructor(config = {}) {
        this.queryCache = new Map();
        this.config = {
            aiProvider: 'openai',
            timeout: 30000,
            maxQueriesPerSource: 20,
            useSemanticEnhancement: true,
            cacheResults: true,
            ...config
        };
        this.profileAnalyzer = new ProfileAnalyzer_1.ProfileAnalyzer();
        this.contextBuilder = new ContextBuilder_1.ContextBuilder(this.config.aiProvider);
        this.queryOptimizer = new QueryOptimizer_1.QueryOptimizer();
        this.basicTemplate = new basic_query_template_1.BasicQueryTemplate();
        this.semanticTemplate = new semantic_query_template_1.SemanticQueryTemplate(this.config.aiProvider);
    }
    async initialize() {
        console.log('Initializing Query Generation Service...');
        try {
            await this.contextBuilder.initialize();
            await this.queryOptimizer.initialize();
            await this.basicTemplate.initialize();
            await this.semanticTemplate.initialize();
            console.log('Query Generation Service initialized successfully');
        }
        catch (error) {
            throw new types_1.AIServiceError(`Failed to initialize QueryGeneratorService: ${error}`, 'query-generator', 'initialization');
        }
    }
    async generateQueries(profile, sources, maxQueries) {
        const result = await this.generateQueriesWithMetadata({
            profile,
            sources,
            maxQueries,
            priority: 'medium'
        });
        return result.queries.map(q => q.query);
    }
    async generateQueriesWithMetadata(request) {
        const startTime = Date.now();
        const { profile, sources, maxQueries, priority = 'medium' } = request;
        if (this.config.cacheResults) {
            const cacheKey = this.generateCacheKey(profile, sources, maxQueries);
            const cached = this.queryCache.get(cacheKey);
            if (cached) {
                return { ...cached, cacheHit: true };
            }
        }
        try {
            const profileAnalysis = await this.profileAnalyzer.analyzeProfile(profile);
            const aiContext = await this.contextBuilder.buildContext(profile, profileAnalysis);
            const targetSources = sources || this.getDefaultSources(priority);
            const allQueries = [];
            const sourceDistribution = {};
            for (const sourceType of targetSources) {
                const sourceQueries = await this.generateQueriesForSource(sourceType, profile, aiContext, profileAnalysis, maxQueries || this.config.maxQueriesPerSource);
                allQueries.push(...sourceQueries);
                sourceDistribution[sourceType] = sourceQueries.length;
            }
            const optimizedQueries = await this.queryOptimizer.optimizeQueries(allQueries, profileAnalysis, maxQueries);
            const result = {
                queries: optimizedQueries,
                sourceDistribution,
                processingTimeMs: Date.now() - startTime,
                aiServiceUsed: this.config.aiProvider,
                cacheHit: false
            };
            if (this.config.cacheResults) {
                const cacheKey = this.generateCacheKey(profile, sources, maxQueries);
                this.queryCache.set(cacheKey, result);
            }
            return result;
        }
        catch (error) {
            throw new types_1.AIServiceError(`Query generation failed: ${error}`, this.config.aiProvider, 'query-generation', { profileId: profile.id });
        }
    }
    async generateQueriesForSource(sourceType, profile, aiContext, profileAnalysis, maxQueries) {
        const queries = [];
        const basicQueries = await this.basicTemplate.generateQueries(profileAnalysis, sourceType, Math.ceil(maxQueries * 0.4));
        queries.push(...basicQueries);
        if (this.config.useSemanticEnhancement) {
            const semanticQueries = await this.semanticTemplate.generateQueries(aiContext, sourceType, Math.ceil(maxQueries * 0.6));
            queries.push(...semanticQueries);
        }
        return queries.slice(0, maxQueries);
    }
    getDefaultSources(priority) {
        switch (priority) {
            case 'high':
                return ['websearch', 'social', 'bookmark', 'newsletter'];
            case 'medium':
                return ['websearch', 'social', 'bookmark'];
            case 'low':
            default:
                return ['websearch', 'bookmark'];
        }
    }
    generateCacheKey(profile, sources, maxQueries) {
        const sourcesStr = sources ? sources.sort().join(',') : 'default';
        const maxQueriesStr = maxQueries?.toString() || 'default';
        const profileHash = this.hashProfileCharacteristics(profile);
        return `queries:${profileHash}:${sourcesStr}:${maxQueriesStr}`;
    }
    hashProfileCharacteristics(profile) {
        const characteristics = [
            profile.mediums.sort().join(','),
            profile.skills.sort().join(','),
            profile.interests.sort().join(','),
            profile.experience || '',
            profile.location || ''
        ].join('|');
        let hash = 0;
        for (let i = 0; i < characteristics.length; i++) {
            const char = characteristics.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    clearCache() {
        this.queryCache.clear();
    }
    getCacheStats() {
        return {
            size: this.queryCache.size,
            hitRate: 0
        };
    }
    async healthCheck() {
        try {
            const testProfile = {
                id: 'test',
                name: 'Test Artist',
                mediums: ['painting'],
                skills: ['oil painting'],
                interests: ['contemporary art'],
                experience: 'intermediate',
                location: 'New York',
                userId: 'test'
            };
            const analysis = await this.profileAnalyzer.analyzeProfile(testProfile);
            return analysis !== null;
        }
        catch (error) {
            console.error('QueryGeneratorService health check failed:', error);
            return false;
        }
    }
    async shutdown() {
        this.clearCache();
        await this.semanticTemplate.shutdown();
        await this.contextBuilder.shutdown();
    }
}
exports.QueryGeneratorService = QueryGeneratorService;
//# sourceMappingURL=QueryGeneratorService.js.map