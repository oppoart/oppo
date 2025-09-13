"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentinelConnector = void 0;
const discovery_1 = require("../../../../apps/backend/src/types/discovery");
class SentinelConnector {
    constructor(config = {}) {
        this.isInitialized = false;
        this.discoveryCache = new Map();
        this.config = {
            timeout: 120000,
            maxRetries: 3,
            enableCaching: true,
            ...config
        };
        this.sentinelService = config.sentinelInstance;
    }
    async initialize() {
        if (this.isInitialized)
            return;
        console.log('Initializing SentinelConnector...');
        try {
            if (!this.sentinelService) {
                console.log('No Sentinel service instance provided, using mock implementation');
            }
            this.isInitialized = true;
            console.log('SentinelConnector initialized successfully');
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to initialize SentinelConnector: ${error}`, 'sentinel', 'connector-initialization');
        }
    }
    async runDiscovery(request) {
        if (!this.isInitialized) {
            throw new Error('SentinelConnector is not initialized');
        }
        const response = await this.runDiscoveryWithMetadata(request);
        return response.opportunities;
    }
    async runDiscoveryWithMetadata(request) {
        const startTime = Date.now();
        const { queries, sources, priority = 'medium', maxResults = 50, context } = request;
        if (this.config.enableCaching) {
            const cacheKey = this.generateCacheKey(request);
            const cached = this.discoveryCache.get(cacheKey);
            if (cached) {
                console.log('Returning cached discovery results');
                return cached;
            }
        }
        try {
            const opportunities = [];
            const errors = [];
            const sourcesUsed = [];
            if (this.sentinelService) {
                const discoveryContext = {
                    searchTerms: queries,
                    maxResults,
                    ...context
                };
                const result = await this.sentinelService.runDiscovery(discoveryContext);
                for (const sourceResult of result.sources) {
                    opportunities.push(...sourceResult.opportunities);
                    sourcesUsed.push(sourceResult.sourceType);
                }
                errors.push(...result.errors);
            }
            else {
                const mockOpportunities = this.generateMockDiscoveryResults(queries, sources);
                opportunities.push(...mockOpportunities);
                sourcesUsed.push(...(sources || ['websearch', 'bookmark']));
            }
            const limitedOpportunities = maxResults ?
                opportunities.slice(0, maxResults) : opportunities;
            const response = {
                opportunities: limitedOpportunities,
                totalFound: opportunities.length,
                sourcesUsed: [...new Set(sourcesUsed)],
                processingTimeMs: Date.now() - startTime,
                errors
            };
            if (this.config.enableCaching) {
                const cacheKey = this.generateCacheKey(request);
                this.discoveryCache.set(cacheKey, response);
            }
            console.log(`Discovery completed: ${response.opportunities.length} opportunities found`);
            return response;
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Discovery failed: ${error}`, 'sentinel', 'discovery-execution', { queriesCount: queries.length, sources });
        }
    }
    async healthCheck() {
        try {
            if (this.sentinelService) {
                const health = await this.sentinelService.checkHealth();
                return Object.values(health).every(status => status === true);
            }
            else {
                return true;
            }
        }
        catch (error) {
            console.error('SentinelConnector health check failed:', error);
            return false;
        }
    }
    async getDiscoveryStats() {
        return {
            totalDiscoveries: this.discoveryCache.size,
            cacheHits: 0,
            averageOpportunitiesFound: 0,
            mostUsedSources: ['websearch', 'bookmark']
        };
    }
    clearCache() {
        this.discoveryCache.clear();
    }
    setSentinelService(sentinelService) {
        this.sentinelService = sentinelService;
    }
    async shutdown() {
        this.clearCache();
        this.isInitialized = false;
    }
    generateCacheKey(request) {
        const { queries, sources, priority, maxResults } = request;
        const key = [
            queries.sort().join(','),
            (sources || []).sort().join(','),
            priority || 'medium',
            maxResults || 'all'
        ].join('|');
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `discovery:${Math.abs(hash).toString(36)}`;
    }
    generateMockDiscoveryResults(queries, sources) {
        const opportunities = [];
        const mockTitles = [
            'Contemporary Art Grant Program',
            'Emerging Artists Fellowship',
            'Digital Art Residency',
            'Community Art Exhibition Call',
            'Public Art Commission',
            'Artist Studio Rental Program',
            'Art Education Workshop Series',
            'Sculpture Competition',
            'Photography Contest',
            'Mixed Media Art Show'
        ];
        const mockOrganizations = [
            'Arts Council',
            'Cultural Foundation',
            'Art Museum',
            'Gallery Space',
            'Arts Center',
            'Public Art Commission',
            'Artist Collective',
            'Art School'
        ];
        const numOpportunities = Math.min(15, Math.max(5, queries.length * 2));
        for (let i = 0; i < numOpportunities; i++) {
            const title = mockTitles[Math.floor(Math.random() * mockTitles.length)];
            const organization = mockOrganizations[Math.floor(Math.random() * mockOrganizations.length)];
            opportunities.push({
                id: `mock-${Date.now()}-${i}`,
                title: `${title} ${i + 1}`,
                organization,
                description: `A ${title.toLowerCase()} opportunity focused on supporting artists in their creative practice. Application deadline and requirements vary.`,
                url: `https://example.com/opportunity-${i + 1}`,
                deadline: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
                amount: Math.random() > 0.5 ? `$${Math.floor(Math.random() * 50000 + 1000)}` : undefined,
                location: Math.random() > 0.3 ? 'Various Locations' : 'Remote',
                tags: this.generateMockTags(queries),
                sourceType: sources ? sources[Math.floor(Math.random() * sources.length)] : 'websearch',
                sourceUrl: `https://example.com/source-${i + 1}`,
                sourceMetadata: {},
                relevanceScore: undefined,
                semanticScore: undefined,
                keywordScore: undefined,
                categoryScore: undefined,
                aiServiceUsed: undefined,
                processingTimeMs: undefined,
                processed: false,
                status: 'new',
                applied: false,
                notes: undefined,
                starred: false
            });
        }
        return opportunities;
    }
    generateMockTags(queries) {
        const allWords = queries.join(' ').toLowerCase().split(/\s+/);
        const commonTags = ['art', 'grant', 'exhibition', 'artist', 'creative', 'funding', 'residency', 'workshop'];
        const tags = [...new Set([...allWords.slice(0, 3), ...commonTags.slice(0, 4)])];
        return tags.slice(0, 5);
    }
}
exports.SentinelConnector = SentinelConnector;
//# sourceMappingURL=SentinelConnector.js.map