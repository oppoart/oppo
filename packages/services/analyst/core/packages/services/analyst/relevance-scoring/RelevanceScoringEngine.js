"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelevanceScoringEngine = void 0;
const SemanticScorer_1 = require("./scorers/SemanticScorer");
const KeywordScorer_1 = require("./scorers/KeywordScorer");
const CategoryScorer_1 = require("./scorers/CategoryScorer");
const LocationScorer_1 = require("./scorers/LocationScorer");
const ExperienceScorer_1 = require("./scorers/ExperienceScorer");
const WeightedScoreAggregator_1 = require("./aggregators/WeightedScoreAggregator");
const discovery_1 = require("../../../../apps/backend/src/types/discovery");
class RelevanceScoringEngine {
    constructor(prisma, config = {}) {
        this.prisma = prisma;
        this.isInitialized = false;
        this.scoreCache = new Map();
        this.config = {
            aiProvider: 'openai',
            timeout: 60000,
            enableSemanticScoring: true,
            scoringWeights: {
                semantic: 0.35, // 35% - AI understanding
                keyword: 0.25, // 25% - Direct keyword matching
                category: 0.20, // 20% - Medium/category fit
                location: 0.10, // 10% - Geographic relevance
                experience: 0.10, // 10% - Experience level match
                deadline: 0.05 // 5% - Time urgency
            },
            minRelevanceThreshold: 0.3,
            cacheResults: true,
            ...config
        };
        // Initialize scoring components
        this.semanticScorer = new SemanticScorer_1.SemanticScorer(this.config.aiProvider);
        this.keywordScorer = new KeywordScorer_1.KeywordScorer();
        this.categoryScorer = new CategoryScorer_1.CategoryScorer();
        this.locationScorer = new LocationScorer_1.LocationScorer();
        this.experienceScorer = new ExperienceScorer_1.ExperienceScorer();
        this.scoreAggregator = new WeightedScoreAggregator_1.WeightedScoreAggregator(this.config.scoringWeights);
    }
    /**
     * Initialize the scoring engine
     */
    async initialize() {
        if (this.isInitialized)
            return;
        console.log('Initializing Relevance Scoring Engine...');
        try {
            await this.semanticScorer.initialize();
            await this.keywordScorer.initialize();
            await this.categoryScorer.initialize();
            await this.locationScorer.initialize();
            await this.experienceScorer.initialize();
            await this.scoreAggregator.initialize();
            this.isInitialized = true;
            console.log('Relevance Scoring Engine initialized successfully');
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to initialize RelevanceScoringEngine: ${error}`, this.config.aiProvider, 'scoring-initialization');
        }
    }
    /**
     * Score multiple opportunities for relevance to an artist profile
     */
    async scoreOpportunities(profile, opportunities) {
        if (!this.isInitialized) {
            throw new Error('RelevanceScoringEngine is not initialized');
        }
        const result = await this.scoreOpportunitiesWithDetails(profile, opportunities);
        return result.scores;
    }
    /**
     * Score opportunities with detailed breakdown
     */
    async scoreOpportunitiesWithDetails(profile, opportunities) {
        const startTime = Date.now();
        const scores = new Map();
        const detailedResults = [];
        try {
            // Process opportunities in batches to manage performance
            const batchSize = 10;
            const batches = this.createBatches(opportunities, batchSize);
            for (const batch of batches) {
                const batchPromises = batch.map(opportunity => this.scoreOpportunity(profile, opportunity));
                const batchResults = await Promise.all(batchPromises);
                for (const result of batchResults) {
                    scores.set(result.opportunityId, result.overallScore);
                    detailedResults.push(result);
                }
            }
            // Calculate average score
            const scoreValues = Array.from(scores.values());
            const averageScore = scoreValues.length > 0 ?
                scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length : 0;
            return {
                scores,
                detailedResults,
                averageScore,
                processingTimeMs: Date.now() - startTime,
                aiServiceUsed: this.config.aiProvider
            };
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Batch scoring failed: ${error}`, this.config.aiProvider, 'batch-scoring', { profileId: profile.id, opportunityCount: opportunities.length });
        }
    }
    /**
     * Score a single opportunity for relevance to an artist profile
     */
    async scoreOpportunity(profile, opportunity) {
        const startTime = Date.now();
        const opportunityId = opportunity.id || 'unknown';
        // Check cache first
        if (this.config.cacheResults) {
            const cacheKey = this.generateCacheKey(profile.id, opportunityId);
            const cached = this.scoreCache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        try {
            // Calculate component scores
            const [semanticScore, keywordScore, categoryScore, locationScore, experienceScore] = await Promise.all([
                this.config.enableSemanticScoring ?
                    this.semanticScorer.calculateScore(profile, opportunity) : 0,
                this.keywordScorer.calculateScore(profile, opportunity),
                this.categoryScorer.calculateScore(profile, opportunity),
                this.locationScorer.calculateScore(profile, opportunity),
                this.experienceScorer.calculateScore(profile, opportunity)
            ]);
            // Calculate deadline urgency score
            const deadlineScore = this.calculateDeadlineScore(opportunity.deadline);
            const componentScores = {
                semantic: semanticScore,
                keyword: keywordScore,
                category: categoryScore,
                location: locationScore,
                experience: experienceScore,
                deadline: deadlineScore
            };
            // Aggregate scores using weighted approach
            const overallScore = this.scoreAggregator.aggregateScores(componentScores);
            // Generate reasoning
            const reasoning = this.generateScoreReasoning(componentScores, overallScore);
            const result = {
                opportunityId,
                overallScore,
                componentScores,
                reasoning,
                processingTimeMs: Date.now() - startTime
            };
            // Cache the result
            if (this.config.cacheResults) {
                const cacheKey = this.generateCacheKey(profile.id, opportunityId);
                this.scoreCache.set(cacheKey, result);
            }
            return result;
        }
        catch (error) {
            throw new discovery_1.AIServiceError(`Failed to score opportunity ${opportunityId}: ${error}`, this.config.aiProvider, 'opportunity-scoring', { profileId: profile.id, opportunityId });
        }
    }
    /**
     * Update scoring weights
     */
    updateWeights(weights) {
        this.config.scoringWeights = { ...this.config.scoringWeights, ...weights };
        this.scoreAggregator.updateWeights(this.config.scoringWeights);
        // Clear cache since weights changed
        this.clearCache();
    }
    /**
     * Get scoring statistics
     */
    async getStats() {
        // This would need actual database queries for real stats
        return {
            totalScored: this.scoreCache.size,
            averageScore: 0,
            cacheSize: this.scoreCache.size,
            componentStats: {
                semantic: { average: 0, max: 0, min: 0 },
                keyword: { average: 0, max: 0, min: 0 },
                category: { average: 0, max: 0, min: 0 },
                location: { average: 0, max: 0, min: 0 },
                experience: { average: 0, max: 0, min: 0 },
                deadline: { average: 0, max: 0, min: 0 }
            }
        };
    }
    /**
     * Health check for scoring engine
     */
    async healthCheck() {
        try {
            // Test all components
            const checks = await Promise.all([
                this.semanticScorer.healthCheck(),
                this.keywordScorer.healthCheck(),
                this.categoryScorer.healthCheck(),
                this.locationScorer.healthCheck(),
                this.experienceScorer.healthCheck()
            ]);
            return checks.every(check => check === true);
        }
        catch (error) {
            console.error('RelevanceScoringEngine health check failed:', error);
            return false;
        }
    }
    /**
     * Clear scoring cache
     */
    clearCache() {
        this.scoreCache.clear();
    }
    /**
     * Shutdown the scoring engine
     */
    async shutdown() {
        this.clearCache();
        await this.semanticScorer.shutdown();
        await this.keywordScorer.shutdown();
        await this.categoryScorer.shutdown();
        await this.locationScorer.shutdown();
        await this.experienceScorer.shutdown();
        this.isInitialized = false;
    }
    // =====================================
    // Private Methods
    // =====================================
    /**
     * Calculate deadline urgency score
     */
    calculateDeadlineScore(deadline) {
        if (!deadline)
            return 0.5; // Neutral score for no deadline
        const now = new Date();
        const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDeadline < 0)
            return 0; // Past deadline
        if (daysUntilDeadline <= 7)
            return 1; // Very urgent
        if (daysUntilDeadline <= 30)
            return 0.8; // Urgent
        if (daysUntilDeadline <= 90)
            return 0.6; // Moderate urgency
        if (daysUntilDeadline <= 180)
            return 0.4; // Some urgency
        return 0.2; // Low urgency (far future)
    }
    /**
     * Generate human-readable reasoning for the score
     */
    generateScoreReasoning(componentScores, overallScore) {
        const reasons = [];
        // Analyze each component
        if (componentScores.semantic > 0.7) {
            reasons.push('Strong semantic match with artist profile');
        }
        else if (componentScores.semantic < 0.3) {
            reasons.push('Limited semantic alignment');
        }
        if (componentScores.keyword > 0.7) {
            reasons.push('Excellent keyword match');
        }
        else if (componentScores.keyword < 0.3) {
            reasons.push('Few matching keywords');
        }
        if (componentScores.category > 0.8) {
            reasons.push('Perfect medium/category fit');
        }
        else if (componentScores.category < 0.4) {
            reasons.push('Medium/category mismatch');
        }
        if (componentScores.location > 0.7) {
            reasons.push('Geographically convenient');
        }
        else if (componentScores.location < 0.3) {
            reasons.push('Geographic limitations');
        }
        if (componentScores.experience > 0.7) {
            reasons.push('Experience level well-matched');
        }
        else if (componentScores.experience < 0.3) {
            reasons.push('Experience level mismatch');
        }
        if (componentScores.deadline > 0.8) {
            reasons.push('Urgent deadline');
        }
        else if (componentScores.deadline < 0.3) {
            reasons.push('Deadline passed or very tight');
        }
        // Overall assessment
        if (overallScore > 0.8) {
            reasons.unshift('Highly relevant opportunity');
        }
        else if (overallScore > 0.6) {
            reasons.unshift('Good match');
        }
        else if (overallScore > 0.4) {
            reasons.unshift('Moderate relevance');
        }
        else {
            reasons.unshift('Low relevance');
        }
        return reasons.slice(0, 4).join('; ');
    }
    /**
     * Generate cache key for scoring results
     */
    generateCacheKey(profileId, opportunityId) {
        return `score:${profileId}:${opportunityId}`;
    }
    /**
     * Create batches for processing
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
}
exports.RelevanceScoringEngine = RelevanceScoringEngine;
