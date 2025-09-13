"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticQueryTemplate = void 0;
const types_1 = require("../types");
const openai_1 = __importDefault(require("openai"));
class SemanticQueryTemplate {
    constructor(aiProvider = 'openai') {
        this.isInitialized = false;
        this.openai = null;
        this.aiProvider = aiProvider;
        if (aiProvider === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY;
            console.log(`🔑 Initializing OpenAI client... API key present: ${!!apiKey}`);
            this.openai = new openai_1.default({
                apiKey: apiKey,
            });
            console.log(`✅ OpenAI client initialized successfully`);
        }
    }
    async initialize() {
        this.isInitialized = true;
        console.log(`SemanticQueryTemplate initialized with ${this.aiProvider}`);
    }
    async generateQueries(aiContext, sourceType, maxQueries) {
        if (!this.isInitialized) {
            throw new Error('SemanticQueryTemplate is not initialized');
        }
        try {
            console.log(`🤖 SemanticQueryTemplate: aiProvider = ${this.aiProvider}, maxQueries = ${maxQueries}`);
            if (this.aiProvider === 'openai') {
                console.log('🚀 Attempting to call OpenAI for query generation...');
                return await this.generateOpenAIQueries(aiContext, sourceType, maxQueries);
            }
            else {
                console.log('⚠️ Using mock queries (non-OpenAI provider)');
                return this.generateMockSemanticQueries(aiContext, sourceType, maxQueries);
            }
        }
        catch (error) {
            console.error('❌ Failed to generate semantic queries, falling back to mock:', error);
            return this.generateMockSemanticQueries(aiContext, sourceType, maxQueries);
        }
    }
    async generateOpenAIQueries(aiContext, sourceType, maxQueries) {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }
        const profileData = aiContext?.profileAnalysis || {};
        const { primaryMediums = ['contemporary art'], experienceLevel = { category: 'emerging', keywords: [] }, primaryInterests = ['artistic practice'], opportunityTypes = ['grant', 'residency'], fundingPreferences = ['mid-level grants'], geographicScope = {} } = profileData;
        const systemPrompt = `You are an expert in artist opportunities and grant writing. Generate ${maxQueries} highly specific, targeted search queries for finding art opportunities.

Artist Profile:
- Primary Mediums: ${primaryMediums.join(', ')}
- Experience Level: ${experienceLevel.category}
- Interests: ${primaryInterests.join(', ')}
- Preferred Opportunity Types: ${opportunityTypes.join(', ')}
- Funding Preferences: ${fundingPreferences.join(', ')}
- Location: ${geographicScope.city || geographicScope.state || 'Various'}

Requirements:
1. Generate specific, actionable search queries
2. Include current year (${new Date().getFullYear()}) when relevant
3. Focus on ${sourceType} sources
4. Mix opportunity types: ${opportunityTypes.join(', ')}
5. Use exact medium names and experience level
6. Include location when relevant
7. Make queries specific enough to find real opportunities

Return ONLY a JSON array of strings, no other text.`;
        const userPrompt = `Generate ${maxQueries} targeted search queries for this artist profile.`;
        try {
            console.log('🤖 Calling OpenAI for intelligent query generation...');
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 500,
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenAI');
            }
            const queries = JSON.parse(content);
            if (!Array.isArray(queries)) {
                throw new Error('OpenAI response is not an array');
            }
            console.log(`✅ Generated ${queries.length} AI-powered queries`);
            return queries.slice(0, maxQueries).map((query, index) => ({
                query: query.trim(),
                provider: sourceType,
                priority: 10,
                context: {
                    artistMediums: primaryMediums,
                    interests: primaryInterests,
                    opportunityType: opportunityTypes[index % opportunityTypes.length],
                    experienceLevel: experienceLevel.category,
                    aiGenerated: true
                },
                expectedResults: 30
            }));
        }
        catch (error) {
            console.error('OpenAI query generation failed:', error);
            throw new types_1.AIServiceError(`OpenAI query generation failed: ${error}`, 'openai', 'query-generation');
        }
    }
    async generateMockSemanticQueries(aiContext, sourceType, maxQueries) {
        const queries = [];
        const profileData = aiContext?.profileAnalysis || {};
        const { primaryMediums = ['contemporary art'], experienceLevel = { category: 'emerging', keywords: [] }, primaryInterests = ['social practice'], opportunityTypes = ['grant', 'residency'], fundingPreferences = ['mid-level grants'], geographicScope = {} } = profileData;
        const templates = [
            'innovative {medium} {opportunityType} for {experience} artists {year}',
            '{medium} {fundingType} supporting {interest} artistic practice',
            '{experience} {medium} artist {opportunityType} and fellowships',
            '{interest} focused {medium} {opportunityType} and exhibitions',
            'professional development {opportunityType} {medium} artist opportunities',
            '{medium} collaborative {opportunityType} and artist exchanges',
            '{location} {medium} {opportunityType} {experience} artists',
            '{opportunityType} {medium} artists {location} {year}',
            '{experienceKeyword} {medium} {opportunityType} {interest}',
            '{fundingType} {medium} {experience} artist {opportunityType}'
        ];
        const medium = primaryMediums[0] || 'contemporary art';
        const experience = experienceLevel.category || 'emerging';
        const interest = primaryInterests[0] || 'artistic practice';
        const opportunityType = opportunityTypes[0] || 'opportunities';
        const secondaryOpportunityType = opportunityTypes[1] || 'grant';
        const fundingType = fundingPreferences[0] || 'funding';
        const location = geographicScope.city || geographicScope.state || '';
        const experienceKeyword = experienceLevel.keywords?.[0] || experience;
        const year = new Date().getFullYear();
        for (let i = 0; i < Math.min(templates.length, maxQueries); i++) {
            const template = templates[i];
            const query = template
                .replace('{medium}', medium)
                .replace('{experience}', experience)
                .replace('{interest}', interest)
                .replace('{opportunityType}', i % 2 === 0 ? opportunityType : secondaryOpportunityType)
                .replace('{fundingType}', fundingType)
                .replace('{location}', location)
                .replace('{experienceKeyword}', experienceKeyword)
                .replace('{year}', year.toString())
                .replace(/\s+/g, ' ')
                .trim();
            queries.push({
                query,
                provider: sourceType,
                priority: 9,
                context: {
                    artistMediums: primaryMediums,
                    interests: primaryInterests,
                    opportunityType: i % 2 === 0 ? opportunityType : secondaryOpportunityType,
                    experienceLevel: experience,
                    location: location || undefined
                },
                expectedResults: 25
            });
        }
        return queries;
    }
    generateFallbackQueries(aiContext, sourceType, maxQueries) {
        return [
            {
                query: 'contemporary art grants emerging artists',
                provider: sourceType,
                priority: 5,
                context: { artistMediums: ['contemporary art'], interests: [] },
                expectedResults: 15
            },
            {
                query: 'artist residency programs creative funding',
                provider: sourceType,
                priority: 5,
                context: { artistMediums: [], interests: [] },
                expectedResults: 12
            }
        ].slice(0, maxQueries);
    }
    async shutdown() {
        this.isInitialized = false;
    }
}
exports.SemanticQueryTemplate = SemanticQueryTemplate;
//# sourceMappingURL=semantic-query.template.js.map