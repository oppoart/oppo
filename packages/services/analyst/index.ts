/**
 * OPPO Analyst Module - AI-Powered Analysis Engine
 * 
 * This module provides the critical bridge between artist profiles and opportunity discovery
 * by converting artist profiles into targeted search queries and scoring opportunities for relevance.
 * 
 * Key Features:
 * - Query Generation: Converts artist profiles into optimized search queries
 * - Relevance Scoring: AI-powered semantic similarity + keyword matching
 * - Integration: Seamless connection with Sentinel (discovery) and Archivist (storage)
 * - Caching: Performance optimization for expensive AI operations
 * 
 * Architecture:
 * Artist Profile → Query Generator → Sentinel Discovery → Relevance Scorer → Archivist Storage
 */

// Core Services
export { AnalystService } from './core/AnalystService';
export { QueryGeneratorService } from './query-generation/QueryGeneratorService';
export { RelevanceScoringEngine } from './relevance-scoring/RelevanceScoringEngine';

// Query Generation Components
export { ProfileAnalyzer } from './query-generation/ProfileAnalyzer';
export { ContextBuilder } from './query-generation/ContextBuilder';
export { QueryOptimizer } from './query-generation/QueryOptimizer';
export { BasicQueryTemplate } from './query-generation/templates/basic-query.template';
export { SemanticQueryTemplate } from './query-generation/templates/semantic-query.template';

// Scoring Components
export { SemanticScorer } from './relevance-scoring/scorers/SemanticScorer';
export { KeywordScorer } from './relevance-scoring/scorers/KeywordScorer';
export { CategoryScorer } from './relevance-scoring/scorers/CategoryScorer';
export { LocationScorer } from './relevance-scoring/scorers/LocationScorer';
export { ExperienceScorer } from './relevance-scoring/scorers/ExperienceScorer';
export { WeightedScoreAggregator } from './relevance-scoring/aggregators/WeightedScoreAggregator';

// Integration Components
export { SentinelConnector } from './integration/SentinelConnector';
export { ArchivistConnector } from './integration/ArchivistConnector';

// API
export { AnalystApi } from './api/analyst';

// Types and Interfaces
export type {
  AnalystConfig,
  AnalysisRequest,
  AnalysisResult,
  AnalystStats
} from './core/AnalystService';

export type {
  QueryGeneratorConfig,
  QueryGenerationRequest,
  QueryGenerationResult
} from './query-generation/QueryGeneratorService';

export type {
  ScoringConfig,
  ScoringWeights,
  ScoringResult,
  BatchScoringResult
} from './relevance-scoring/RelevanceScoringEngine';

export type { ProfileAnalysis } from './query-generation/ProfileAnalyzer';

/**
 * Quick Start Example:
 * 
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { AnalystService } from './packages/services/analyst';
 * 
 * const prisma = new PrismaClient();
 * const analyst = new AnalystService(prisma, {
 *   aiProvider: 'openai',
 *   enablePersonalization: true
 * });
 * 
 * await analyst.initialize();
 * 
 * // Run complete analysis for an artist profile
 * const result = await analyst.runAnalysis({
 *   artistProfileId: 'artist_123',
 *   sources: ['websearch', 'bookmark'],
 *   maxQueries: 10,
 *   priority: 'high'
 * });
 * 
 * console.log(`Found ${result.newOpportunities} relevant opportunities`);
 * ```
 * 
 * This solves the architectural gap identified in the sprint plan:
 * "which service is going to take system prompt, and turn into search queries?"
 * 
 * Answer: The QueryGeneratorService within the Analyst module takes artist profiles
 * (including any system prompts) and converts them into targeted search queries that
 * the Sentinel module can execute for opportunity discovery.
 */

export { AnalystService as default } from './core/AnalystService';