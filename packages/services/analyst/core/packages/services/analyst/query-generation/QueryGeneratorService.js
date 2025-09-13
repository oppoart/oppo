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
            maxQueriesPerSource: 5,
            useSemanticEnhancement: true,
            cacheResults: true,
            ...config
        };
        // Initialize components
        this.profileAnalyzer = new ProfileAnalyzer_1.ProfileAnalyzer();
        this.contextBuilder = new ContextBuilder_1.ContextBuilder(this.config.aiProvider);
        this.queryOptimizer = new QueryOptimizer_1.QueryOptimizer();
        this.basicTemplate = new basic_query_template_1.BasicQueryTemplate();
        this.semanticTemplate = new semantic_query_template_1.SemanticQueryTemplate(this.config.aiProvider);
    }
    /**
     * Initialize the query generation service
     */
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
    /**
     * Generate search queries from an artist profile
     * This is the core method that converts artist profiles into targeted search queries
     */
    async generateQueries(profile, sources, maxQueries) {
        const result = await this.generateQueriesWithMetadata({
            profile,
            sources,
            maxQueries,
            priority: 'medium'
        });
        return result.queries.map(q => q.query);
    }
    /**
     * Generate queries with full metadata and analysis
     */
    async generateQueriesWithMetadata(request) {
        const startTime = Date.now();
        const { profile, sources, maxQueries, priority = 'medium' } = request;
        // Check cache first
        if (this.config.cacheResults) {
            const cacheKey = this.generateCacheKey(profile, sources, maxQueries);
            const cached = this.queryCache.get(cacheKey);
            if (cached) {
                return { ...cached, cacheHit: true };
            }
        }
        try {
            // Step 1: Analyze the artist profile to extract searchable elements
            const profileAnalysis = await this.profileAnalyzer.analyzeProfile(profile);
            // Step 2: Build AI context for query generation
            const aiContext = await this.contextBuilder.buildContext(profile, profileAnalysis);
            // Step 3: Determine target sources
            const targetSources = sources || this.getDefaultSources(priority);
            // Step 4: Generate queries for each source
            const allQueries = [];
            const sourceDistribution = {};
            for (const sourceType of targetSources) {
                const sourceQueries = await this.generateQueriesForSource(sourceType, profile, aiContext, profileAnalysis, Math.min(maxQueries || this.config.maxQueriesPerSource, this.config.maxQueriesPerSource));
                allQueries.push(...sourceQueries);
                sourceDistribution[sourceType] = sourceQueries.length;
            }
            // Step 5: Optimize and rank queries
            const optimizedQueries = await this.queryOptimizer.optimizeQueries(allQueries, profileAnalysis, maxQueries);
            const result = {
                queries: optimizedQueries,
                sourceDistribution,
                processingTimeMs: Date.now() - startTime,
                aiServiceUsed: this.config.aiProvider,
                cacheHit: false
            };
            // Cache the result
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
    /**
     * Generate queries specifically optimized for a source type
     */
    async generateQueriesForSource(sourceType, profile, aiContext, profileAnalysis, maxQueries) {
        const queries = [];
        // Generate basic keyword-based queries
        const basicQueries = await this.basicTemplate.generateQueries(profileAnalysis, sourceType, Math.ceil(maxQueries * 0.4) // 40% basic queries
        );
        queries.push(...basicQueries);
        // Generate AI-enhanced semantic queries if enabled
        if (this.config.useSemanticEnhancement) {
            const semanticQueries = await this.semanticTemplate.generateQueries(aiContext, sourceType, Math.ceil(maxQueries * 0.6) // 60% semantic queries
            );
            queries.push(...semanticQueries);
        }
        return queries.slice(0, maxQueries);
    }
    /**
     * Get default sources based on priority
     */
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
    /**
     * Generate cache key for query caching
     */
    generateCacheKey(profile, sources, maxQueries) {
        const sourcesStr = sources ? sources.sort().join(',') : 'default';
        const maxQueriesStr = maxQueries?.toString() || 'default';
        // Create a simple hash of profile characteristics
        const profileHash = this.hashProfileCharacteristics(profile);
        return `queries:${profileHash}:${sourcesStr}:${maxQueriesStr}`;
    }
    /**
     * Create a hash of key profile characteristics for caching
     */
    hashProfileCharacteristics(profile) {
        const characteristics = [
            profile.mediums.sort().join(','),
            profile.skills.sort().join(','),
            profile.interests.sort().join(','),
            profile.experience || '',
            profile.location || ''
        ].join('|');
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < characteristics.length; i++) {
            const char = characteristics.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Clear query cache
     */
    clearCache() {
        this.queryCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.queryCache.size,
            hitRate: 0 // Would need to track hits/misses for real hit rate
        };
    }
    /**
     * Health check for query generation service
     */
    async healthCheck() {
        try {
            // Test basic functionality with a simple profile
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
    /**
     * Shutdown the service
     */
    async shutdown() {
        this.clearCache();
        await this.semanticTemplate.shutdown();
        await this.contextBuilder.shutdown();
    }
}
exports.QueryGeneratorService = QueryGeneratorService;
