"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeywordScorer = void 0;
class KeywordScorer {
    constructor(config = {}) {
        this.isInitialized = false;
        this.stemCache = new Map();
        // Weights for different types of keywords
        this.keywordWeights = {
            medium: 3.0, // Highest weight for medium matches
            skill: 2.5, // High weight for skill matches
            interest: 2.0, // Medium-high weight for interests
            experience: 1.8, // Medium weight for experience terms
            location: 1.5, // Lower weight for location
            general: 1.0 // Base weight for general terms
        };
        // Field weights for where keywords are found
        this.fieldWeights = {
            title: 3.0, // Title matches are most important
            tags: 2.5, // Tags are very important
            organization: 2.0, // Organization name is important
            description: 1.0, // Description matches are baseline
            location: 0.8, // Location matches are less important
            amount: 0.5 // Amount matches are least important
        };
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
    /**
     * Initialize the keyword scorer
     */
    async initialize() {
        if (this.isInitialized)
            return;
        console.log('Initializing KeywordScorer...');
        this.isInitialized = true;
    }
    /**
     * Calculate keyword matching score between artist profile and opportunity
     */
    async calculateScore(profile, opportunity) {
        if (!this.isInitialized) {
            throw new Error('KeywordScorer is not initialized');
        }
        const analysis = await this.analyzeKeywordMatches(profile, opportunity);
        return this.normalizeScore(analysis.weightedScore, analysis.totalMatches);
    }
    /**
     * Analyze keyword matches with detailed breakdown
     */
    async analyzeKeywordMatches(profile, opportunity) {
        // Extract and categorize keywords from profile
        const profileKeywords = this.extractProfileKeywords(profile);
        // Extract text from opportunity
        const opportunityTexts = this.extractOpportunityTexts(opportunity);
        // Find matches
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
        // Calculate coverage (percentage of profile keywords that had matches)
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
    /**
     * Extract and categorize keywords from artist profile
     */
    extractProfileKeywords(profile) {
        const keywords = {
            medium: [],
            skill: [],
            interest: [],
            experience: [],
            location: [],
            general: []
        };
        // Process mediums
        keywords.medium = this.processKeywords(profile.mediums);
        // Process skills
        keywords.skill = this.processKeywords(profile.skills);
        // Process interests
        keywords.interest = this.processKeywords(profile.interests);
        // Process experience terms
        if (profile.experience) {
            keywords.experience = this.processKeywords([profile.experience]);
        }
        // Process location
        if (profile.location) {
            keywords.location = this.processKeywords([profile.location]);
        }
        // Process bio and artist statement for general keywords
        const bioText = [profile.bio, profile.artistStatement].filter(Boolean).join(' ');
        if (bioText) {
            keywords.general = this.extractKeywordsFromText(bioText)
                .filter(word => word.length > 3) // Filter short words
                .slice(0, 10); // Limit to top 10 general keywords
        }
        return keywords;
    }
    /**
     * Extract text fields from opportunity
     */
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
    /**
     * Process keywords (normalize, stem, filter)
     */
    processKeywords(keywords) {
        return keywords
            .flatMap(keyword => this.extractKeywordsFromText(keyword))
            .map(word => this.config.caseSensitive ? word : word.toLowerCase())
            .map(word => this.config.enableStemming ? this.stemWord(word) : word)
            .filter(word => !this.config.stopWords.includes(word))
            .filter(word => word.length > 2);
    }
    /**
     * Extract keywords from text
     */
    extractKeywordsFromText(text) {
        // Split on word boundaries and punctuation
        return text.match(/\b\w+\b/g) || [];
    }
    /**
     * Count occurrences of a keyword in text
     */
    countOccurrences(keyword, text) {
        if (!text || !keyword)
            return 0;
        const searchText = this.config.caseSensitive ? text : text.toLowerCase();
        const searchKeyword = this.config.caseSensitive ? keyword : keyword.toLowerCase();
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${this.escapeRegExp(searchKeyword)}\\b`, 'g');
        const matches = searchText.match(regex);
        return matches ? matches.length : 0;
    }
    /**
     * Simple stemming algorithm (Porter stemmer approximation)
     */
    stemWord(word) {
        if (this.stemCache.has(word)) {
            return this.stemCache.get(word);
        }
        let stemmed = word.toLowerCase();
        // Simple suffix removal rules
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
            { suffix: 's', replacement: '' } // Simple plurals
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
    /**
     * Normalize score to 0-1 range
     */
    normalizeScore(weightedScore, totalMatches) {
        if (totalMatches === 0)
            return 0;
        // Base normalization
        let score = Math.tanh(weightedScore / 10); // Tanh to prevent extreme scores
        // Boost for multiple matches
        const matchBonus = Math.min(0.2, totalMatches * 0.02);
        score += matchBonus;
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Escape special regex characters
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * Get top matching keywords for analysis
     */
    getTopMatches(analysis, limit = 10) {
        return analysis.matches
            .sort((a, b) => b.weight - a.weight)
            .slice(0, limit);
    }
    /**
     * Get keyword statistics
     */
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
    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Test basic functionality
            const testKeywords = ['painting', 'artist', 'exhibition'];
            const processed = this.processKeywords(testKeywords);
            return processed.length > 0;
        }
        catch (error) {
            console.error('KeywordScorer health check failed:', error);
            return false;
        }
    }
    /**
     * Clear stem cache
     */
    clearCache() {
        this.stemCache.clear();
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.clearCache(); // Clear cache since config changed
    }
    /**
     * Shutdown the scorer
     */
    async shutdown() {
        this.clearCache();
        this.isInitialized = false;
    }
}
exports.KeywordScorer = KeywordScorer;
