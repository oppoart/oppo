"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeywordScorer = void 0;
class KeywordScorer {
    config;
    isInitialized = false;
    stemCache = new Map();
    keywordWeights = {
        medium: 3.0,
        skill: 2.5,
        interest: 2.0,
        experience: 1.8,
        location: 1.5,
        general: 1.0
    };
    fieldWeights = {
        title: 3.0,
        tags: 2.5,
        organization: 2.0,
        description: 1.0,
        location: 0.8,
        amount: 0.5
    };
    constructor(config = {}) {
        this.config = {
            enableStemming: true,
            caseSensitive: false,
            useWeights: true,
            stopWords: [
                'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
                'by', 'from', 'about', 'into', 'through', 'during', 'before', 'after',
                'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
                'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
                'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
                'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
                'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
            ],
            ...config
        };
    }
    async initialize() {
        if (this.isInitialized)
            return;
        console.log('Initializing KeywordScorer...');
        this.isInitialized = true;
    }
    async calculateScore(profile, opportunity) {
        if (!this.isInitialized) {
            throw new Error('KeywordScorer is not initialized');
        }
        const analysis = await this.analyzeKeywordMatches(profile, opportunity);
        return this.normalizeScore(analysis.weightedScore, analysis.totalMatches);
    }
    async analyzeKeywordMatches(profile, opportunity) {
        const profileKeywords = this.extractProfileKeywords(profile);
        const opportunityTexts = this.extractOpportunityTexts(opportunity);
        const matches = [];
        let totalMatches = 0;
        let weightedScore = 0;
        for (const [category, keywords] of Object.entries(profileKeywords)) {
            const categoryWeight = this.keywordWeights[category] || 1.0;
            for (const keyword of keywords) {
                for (const [field, text] of Object.entries(opportunityTexts)) {
                    const fieldWeight = this.fieldWeights[field] || 1.0;
                    const occurrences = this.countOccurrences(keyword, text);
                    if (occurrences > 0) {
                        const matchWeight = categoryWeight * fieldWeight * occurrences;
                        matches.push({
                            word: keyword,
                            weight: matchWeight,
                            occurrences,
                            field
                        });
                        totalMatches += occurrences;
                        weightedScore += matchWeight;
                    }
                }
            }
        }
        const totalProfileKeywords = Object.values(profileKeywords)
            .reduce((sum, keywords) => sum + keywords.length, 0);
        const matchedKeywords = new Set(matches.map(m => m.word)).size;
        const coverage = totalProfileKeywords > 0 ? matchedKeywords / totalProfileKeywords : 0;
        return {
            matches,
            totalMatches,
            weightedScore,
            coverage
        };
    }
    extractProfileKeywords(profile) {
        const keywords = {
            medium: [],
            skill: [],
            interest: [],
            experience: [],
            location: [],
            general: []
        };
        keywords.medium = this.processKeywords(profile.mediums);
        keywords.skill = this.processKeywords(profile.skills);
        keywords.interest = this.processKeywords(profile.interests);
        if (profile.experience) {
            keywords.experience = this.processKeywords([profile.experience]);
        }
        if (profile.location) {
            keywords.location = this.processKeywords([profile.location]);
        }
        const bioText = [profile.bio, profile.artistStatement].filter(Boolean).join(' ');
        if (bioText) {
            keywords.general = this.extractKeywordsFromText(bioText)
                .filter(word => word.length > 3)
                .slice(0, 10);
        }
        return keywords;
    }
    extractOpportunityTexts(opportunity) {
        return {
            title: opportunity.title || '',
            description: opportunity.description || '',
            organization: opportunity.organization || '',
            location: opportunity.location || '',
            amount: opportunity.amount || '',
            tags: (opportunity.tags || []).join(' ')
        };
    }
    processKeywords(keywords) {
        return keywords
            .flatMap(keyword => this.extractKeywordsFromText(keyword))
            .map(word => this.config.caseSensitive ? word : word.toLowerCase())
            .map(word => this.config.enableStemming ? this.stemWord(word) : word)
            .filter(word => !this.config.stopWords.includes(word))
            .filter(word => word.length > 2);
    }
    extractKeywordsFromText(text) {
        return text.match(/\b\w+\b/g) || [];
    }
    countOccurrences(keyword, text) {
        if (!text || !keyword)
            return 0;
        const searchText = this.config.caseSensitive ? text : text.toLowerCase();
        const searchKeyword = this.config.caseSensitive ? keyword : keyword.toLowerCase();
        const regex = new RegExp(`\\b${this.escapeRegExp(searchKeyword)}\\b`, 'g');
        const matches = searchText.match(regex);
        return matches ? matches.length : 0;
    }
    stemWord(word) {
        if (this.stemCache.has(word)) {
            return this.stemCache.get(word);
        }
        let stemmed = word.toLowerCase();
        const rules = [
            { suffix: 'ing', replacement: '' },
            { suffix: 'ed', replacement: '' },
            { suffix: 'er', replacement: '' },
            { suffix: 'est', replacement: '' },
            { suffix: 'ly', replacement: '' },
            { suffix: 'ion', replacement: '' },
            { suffix: 'tion', replacement: '' },
            { suffix: 'sion', replacement: '' },
            { suffix: 'ness', replacement: '' },
            { suffix: 'ment', replacement: '' },
            { suffix: 'able', replacement: '' },
            { suffix: 'ible', replacement: '' },
            { suffix: 's', replacement: '' }
        ];
        for (const rule of rules) {
            if (stemmed.endsWith(rule.suffix) && stemmed.length > rule.suffix.length + 2) {
                stemmed = stemmed.slice(0, -rule.suffix.length) + rule.replacement;
                break;
            }
        }
        this.stemCache.set(word, stemmed);
        return stemmed;
    }
    normalizeScore(weightedScore, totalMatches) {
        if (totalMatches === 0)
            return 0;
        let score = Math.tanh(weightedScore / 10);
        const matchBonus = Math.min(0.2, totalMatches * 0.02);
        score += matchBonus;
        return Math.max(0, Math.min(1, score));
    }
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    getTopMatches(analysis, limit = 10) {
        return analysis.matches
            .sort((a, b) => b.weight - a.weight)
            .slice(0, limit);
    }
    getKeywordStats(analysis) {
        const uniqueMatches = new Set(analysis.matches.map(m => m.word)).size;
        const averageWeight = analysis.matches.length > 0 ?
            analysis.matches.reduce((sum, m) => sum + m.weight, 0) / analysis.matches.length : 0;
        const fieldDistribution = {};
        for (const match of analysis.matches) {
            fieldDistribution[match.field] = (fieldDistribution[match.field] || 0) + 1;
        }
        return {
            uniqueMatches,
            averageWeight,
            fieldDistribution
        };
    }
    async healthCheck() {
        try {
            const testKeywords = ['painting', 'artist', 'exhibition'];
            const processed = this.processKeywords(testKeywords);
            return processed.length > 0;
        }
        catch (error) {
            console.error('KeywordScorer health check failed:', error);
            return false;
        }
    }
    clearCache() {
        this.stemCache.clear();
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.clearCache();
    }
    async shutdown() {
        this.clearCache();
        this.isInitialized = false;
    }
}
exports.KeywordScorer = KeywordScorer;
//# sourceMappingURL=KeywordScorer.js.map