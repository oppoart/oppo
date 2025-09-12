import { PrismaClient, ArtistProfile, Opportunity } from '@prisma/client';
import { SemanticScorer } from './scorers/SemanticScorer';
import { KeywordScorer } from './scorers/KeywordScorer';
import { CategoryScorer } from './scorers/CategoryScorer';
import { LocationScorer } from './scorers/LocationScorer';
import { ExperienceScorer } from './scorers/ExperienceScorer';
import { WeightedScoreAggregator } from './aggregators/WeightedScoreAggregator';
import { ScoringModels } from './models/ScoringModels';
import { 
  OpportunityData,
  AIServiceError
} from '../../../../apps/backend/src/types/discovery';

export interface ScoringConfig {
  aiProvider: 'openai' | 'anthropic' | 'google';
  timeout: number;
  enableSemanticScoring: boolean;
  scoringWeights: ScoringWeights;
  minRelevanceThreshold: number;
  cacheResults: boolean;
}

export interface ScoringWeights {
  semantic: number;      // AI-powered semantic similarity
  keyword: number;       // Traditional keyword matching
  category: number;      // Medium/category alignment
  location: number;      // Geographic relevance
  experience: number;    // Experience level matching
  deadline: number;      // Time urgency factor
}

export interface ScoringResult {
  opportunityId: string;
  overallScore: number;
  componentScores: {
    semantic: number;
    keyword: number;
    category: number;
    location: number;
    experience: number;
    deadline: number;
  };
  reasoning: string;
  processingTimeMs: number;
}

export interface BatchScoringResult {
  scores: Map<string, number>;
  detailedResults: ScoringResult[];
  averageScore: number;
  processingTimeMs: number;
  aiServiceUsed: string;
}

export class RelevanceScoringEngine {
  private semanticScorer: SemanticScorer;
  private keywordScorer: KeywordScorer;
  private categoryScorer: CategoryScorer;
  private locationScorer: LocationScorer;
  private experienceScorer: ExperienceScorer;
  private scoreAggregator: WeightedScoreAggregator;
  private config: ScoringConfig;
  private isInitialized: boolean = false;
  private scoreCache: Map<string, ScoringResult> = new Map();

  constructor(
    private prisma: PrismaClient,
    config: Partial<ScoringConfig> = {}
  ) {
    this.config = {
      aiProvider: 'openai',
      timeout: 60000,
      enableSemanticScoring: true,
      scoringWeights: {
        semantic: 0.35,    // 35% - AI understanding
        keyword: 0.25,     // 25% - Direct keyword matching
        category: 0.20,    // 20% - Medium/category fit
        location: 0.10,    // 10% - Geographic relevance
        experience: 0.10,  // 10% - Experience level match
        deadline: 0.05     // 5% - Time urgency
      },
      minRelevanceThreshold: 0.3,
      cacheResults: true,
      ...config
    };

    // Initialize scoring components
    this.semanticScorer = new SemanticScorer(this.config.aiProvider);
    this.keywordScorer = new KeywordScorer();
    this.categoryScorer = new CategoryScorer();
    this.locationScorer = new LocationScorer();
    this.experienceScorer = new ExperienceScorer();
    this.scoreAggregator = new WeightedScoreAggregator(this.config.scoringWeights);
  }

  /**
   * Initialize the scoring engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

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
    } catch (error) {
      throw new AIServiceError(
        `Failed to initialize RelevanceScoringEngine: ${error}`,
        this.config.aiProvider,
        'scoring-initialization'
      );
    }
  }

  /**
   * Score multiple opportunities for relevance to an artist profile
   */
  async scoreOpportunities(
    profile: ArtistProfile,
    opportunities: OpportunityData[]
  ): Promise<Map<string, number>> {
    if (!this.isInitialized) {
      throw new Error('RelevanceScoringEngine is not initialized');
    }

    const result = await this.scoreOpportunitiesWithDetails(profile, opportunities);
    return result.scores;
  }

  /**
   * Score opportunities with detailed breakdown
   */
  async scoreOpportunitiesWithDetails(
    profile: ArtistProfile,
    opportunities: OpportunityData[]
  ): Promise<BatchScoringResult> {
    const startTime = Date.now();
    const scores = new Map<string, number>();
    const detailedResults: ScoringResult[] = [];

    try {
      // Process opportunities in batches to manage performance
      const batchSize = 10;
      const batches = this.createBatches(opportunities, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(opportunity => 
          this.scoreOpportunity(profile, opportunity)
        );
        
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

    } catch (error) {
      throw new AIServiceError(
        `Batch scoring failed: ${error}`,
        this.config.aiProvider,
        'batch-scoring',
        { profileId: profile.id, opportunityCount: opportunities.length }
      );
    }
  }

  /**
   * Score a single opportunity for relevance to an artist profile
   */
  async scoreOpportunity(
    profile: ArtistProfile,
    opportunity: OpportunityData
  ): Promise<ScoringResult> {
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
      const [semanticScore, keywordScore, categoryScore, locationScore, experienceScore] = 
        await Promise.all([
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

      const result: ScoringResult = {
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

    } catch (error) {
      throw new AIServiceError(
        `Failed to score opportunity ${opportunityId}: ${error}`,
        this.config.aiProvider,
        'opportunity-scoring',
        { profileId: profile.id, opportunityId }
      );
    }
  }

  /**
   * Update scoring weights
   */
  updateWeights(weights: Partial<ScoringWeights>): void {
    this.config.scoringWeights = { ...this.config.scoringWeights, ...weights };
    this.scoreAggregator.updateWeights(this.config.scoringWeights);
    
    // Clear cache since weights changed
    this.clearCache();
  }

  /**
   * Get scoring statistics
   */
  async getStats(): Promise<{
    totalScored: number;
    averageScore: number;
    cacheSize: number;
    componentStats: Record<string, { average: number; max: number; min: number }>;
  }> {
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
  async healthCheck(): Promise<boolean> {
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
    } catch (error) {
      console.error('RelevanceScoringEngine health check failed:', error);
      return false;
    }
  }

  /**
   * Clear scoring cache
   */
  clearCache(): void {
    this.scoreCache.clear();
  }

  /**
   * Shutdown the scoring engine
   */
  async shutdown(): Promise<void> {
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
  private calculateDeadlineScore(deadline?: Date): number {
    if (!deadline) return 0.5; // Neutral score for no deadline

    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDeadline < 0) return 0; // Past deadline
    if (daysUntilDeadline <= 7) return 1; // Very urgent
    if (daysUntilDeadline <= 30) return 0.8; // Urgent
    if (daysUntilDeadline <= 90) return 0.6; // Moderate urgency
    if (daysUntilDeadline <= 180) return 0.4; // Some urgency
    
    return 0.2; // Low urgency (far future)
  }

  /**
   * Generate human-readable reasoning for the score
   */
  private generateScoreReasoning(
    componentScores: ScoringResult['componentScores'],
    overallScore: number
  ): string {
    const reasons: string[] = [];

    // Analyze each component
    if (componentScores.semantic > 0.7) {
      reasons.push('Strong semantic match with artist profile');
    } else if (componentScores.semantic < 0.3) {
      reasons.push('Limited semantic alignment');
    }

    if (componentScores.keyword > 0.7) {
      reasons.push('Excellent keyword match');
    } else if (componentScores.keyword < 0.3) {
      reasons.push('Few matching keywords');
    }

    if (componentScores.category > 0.8) {
      reasons.push('Perfect medium/category fit');
    } else if (componentScores.category < 0.4) {
      reasons.push('Medium/category mismatch');
    }

    if (componentScores.location > 0.7) {
      reasons.push('Geographically convenient');
    } else if (componentScores.location < 0.3) {
      reasons.push('Geographic limitations');
    }

    if (componentScores.experience > 0.7) {
      reasons.push('Experience level well-matched');
    } else if (componentScores.experience < 0.3) {
      reasons.push('Experience level mismatch');
    }

    if (componentScores.deadline > 0.8) {
      reasons.push('Urgent deadline');
    } else if (componentScores.deadline < 0.3) {
      reasons.push('Deadline passed or very tight');
    }

    // Overall assessment
    if (overallScore > 0.8) {
      reasons.unshift('Highly relevant opportunity');
    } else if (overallScore > 0.6) {
      reasons.unshift('Good match');
    } else if (overallScore > 0.4) {
      reasons.unshift('Moderate relevance');
    } else {
      reasons.unshift('Low relevance');
    }

    return reasons.slice(0, 4).join('; ');
  }

  /**
   * Generate cache key for scoring results
   */
  private generateCacheKey(profileId: string, opportunityId: string): string {
    return `score:${profileId}:${opportunityId}`;
  }

  /**
   * Create batches for processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}