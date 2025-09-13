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
        const { primaryMediums, coreSkills, primaryInterests, geographicScope, opportunityTypes, fundingPreferences, experienceLevel } = profileAnalysis;
        for (const opportunityType of (opportunityTypes || []).slice(0, 3)) {
            for (const medium of primaryMediums.slice(0, 2)) {
                queries.push({
                    query: `${medium} ${opportunityType} ${new Date().getFullYear()}`,
                    provider: sourceType,
                    priority: 9,
                    context: { artistMediums: [medium], interests: [], opportunityType },
                    expectedResults: 25
                });
            }
        }
        for (const fundingPref of (fundingPreferences || []).slice(0, 2)) {
            for (const medium of primaryMediums.slice(0, 1)) {
                queries.push({
                    query: `${medium} ${fundingPref} ${experienceLevel?.category || 'artist'}`,
                    provider: sourceType,
                    priority: 8,
                    context: { artistMediums: [medium], interests: [], fundingType: fundingPref },
                    expectedResults: 20
                });
            }
        }
        for (const medium of primaryMediums.slice(0, 2)) {
            const topOpportunityType = opportunityTypes?.[0] || 'opportunities';
            queries.push({
                query: `${medium} ${topOpportunityType} call for artists`,
                provider: sourceType,
                priority: 7,
                context: { artistMediums: [medium], interests: [], opportunityType: topOpportunityType },
                expectedResults: 18
            });
        }
        if (experienceLevel?.category) {
            const experienceKeywords = experienceLevel.keywords || [];
            for (const keyword of experienceKeywords.slice(0, 1)) {
                queries.push({
                    query: `${keyword} artist ${opportunityTypes?.[0] || 'opportunities'} ${primaryMediums[0] || 'art'}`,
                    provider: sourceType,
                    priority: 7,
                    context: {
                        artistMediums: primaryMediums,
                        interests: [],
                        experienceLevel: experienceLevel.category,
                        keyword
                    },
                    expectedResults: 15
                });
            }
        }
        if (geographicScope?.city && opportunityTypes?.length > 0) {
            queries.push({
                query: `${opportunityTypes[0]} ${geographicScope.city} ${primaryMediums[0] || 'artists'}`,
                provider: sourceType,
                priority: 6,
                context: {
                    artistMediums: primaryMediums,
                    interests: [],
                    location: geographicScope.city,
                    opportunityType: opportunityTypes[0]
                },
                expectedResults: 12
            });
        }
        if (primaryInterests.length > 0 && opportunityTypes?.length > 0) {
            queries.push({
                query: `${primaryInterests[0]} ${opportunityTypes[1] || opportunityTypes[0]} ${primaryMediums[0] || 'art'}`,
                provider: sourceType,
                priority: 6,
                context: {
                    artistMediums: primaryMediums,
                    interests: primaryInterests,
                    opportunityType: opportunityTypes[1] || opportunityTypes[0]
                },
                expectedResults: 10
            });
        }
        return queries.slice(0, maxQueries);
    }
}
exports.BasicQueryTemplate = BasicQueryTemplate;
//# sourceMappingURL=basic-query.template.js.map