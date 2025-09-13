"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicQueryTemplate = void 0;
class BasicQueryTemplate {
    constructor() {
        this.isInitialized = false;
    }
    async initialize() {
        this.isInitialized = true;
    }
    async generateQueries(profileAnalysis, sourceType, maxQueries) {
        if (!this.isInitialized) {
            throw new Error('BasicQueryTemplate is not initialized');
        }
        const queries = [];
        const { primaryMediums, coreSkills, primaryInterests, geographicScope } = profileAnalysis;
        // Medium-based queries
        for (const medium of primaryMediums.slice(0, 2)) {
            queries.push({
                query: `${medium} artist opportunities grants`,
                provider: sourceType,
                priority: 8,
                context: { artistMediums: [medium], interests: [] },
                expectedResults: 20
            });
            queries.push({
                query: `${medium} exhibition call for artists`,
                provider: sourceType,
                priority: 7,
                context: { artistMediums: [medium], interests: [] },
                expectedResults: 15
            });
        }
        // Skill-based queries
        if (coreSkills.length > 0) {
            queries.push({
                query: `${coreSkills[0]} art residency programs`,
                provider: sourceType,
                priority: 6,
                context: { artistMediums: primaryMediums, interests: [] },
                expectedResults: 12
            });
        }
        // Interest-based queries
        if (primaryInterests.length > 0) {
            queries.push({
                query: `${primaryInterests[0]} artist funding opportunities`,
                provider: sourceType,
                priority: 6,
                context: { artistMediums: primaryMediums, interests: primaryInterests },
                expectedResults: 10
            });
        }
        // Location-based queries if available
        if (geographicScope.city) {
            queries.push({
                query: `art grants ${geographicScope.city} local artists`,
                provider: sourceType,
                priority: 5,
                context: { artistMediums: primaryMediums, interests: [], location: geographicScope.city },
                expectedResults: 8
            });
        }
        return queries.slice(0, maxQueries);
    }
}
exports.BasicQueryTemplate = BasicQueryTemplate;
