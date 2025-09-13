import { z } from 'zod';
import { 
  QUERY_TYPES, 
  QUERY_STRATEGIES, 
  QUERY_PRIORITIES,
  LOCATION_MODIFIERS,
  CAREER_STAGE_MODIFIERS,
  QueryType,
  QueryStrategy,
  QueryPriority,
  LocationModifier,
  CareerStageModifier
} from '../constants/query.constants';

// Re-export types for external use
export type { 
  QueryType,
  QueryStrategy,
  QueryPriority,
  LocationModifier,
  CareerStageModifier 
};

// =====================================
// Query Generation Request Schema
// =====================================

export const queryGenerationRequestSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  queryTypes: z.array(z.enum(Object.values(QUERY_TYPES) as [QueryType, ...QueryType[]])).optional(),
  strategy: z.enum(Object.values(QUERY_STRATEGIES) as [QueryStrategy, ...QueryStrategy[]]).optional(),
  maxQueries: z.number().min(1).max(50).optional(),
  location: z.string().optional(),
  locationModifier: z.enum(Object.values(LOCATION_MODIFIERS) as [LocationModifier, ...LocationModifier[]]).optional(),
  careerStage: z.enum(Object.values(CAREER_STAGE_MODIFIERS) as [CareerStageModifier, ...CareerStageModifier[]]).optional(),
  customKeywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional()
});

export type QueryGenerationRequest = z.infer<typeof queryGenerationRequestSchema>;

// =====================================
// Generated Query Schema
// =====================================

export const generatedQuerySchema = z.object({
  id: z.string().optional(),
  query: z.string().min(1, 'Query is required'),
  type: z.enum(Object.values(QUERY_TYPES) as [QueryType, ...QueryType[]]),
  strategy: z.enum(Object.values(QUERY_STRATEGIES) as [QueryStrategy, ...QueryStrategy[]]),
  priority: z.number().min(1).max(3),
  keywords: z.array(z.string()),
  expectedResults: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  context: z.object({
    profileId: z.string(),
    mediums: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    location: z.string().optional(),
    careerStage: z.string().optional()
  }),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date().optional(),
});

export type GeneratedQuery = z.infer<typeof generatedQuerySchema>;

// =====================================
// Query Generation Response Schema
// =====================================

export const queryGenerationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    profileId: z.string(),
    totalQueries: z.number(),
    queriesByType: z.record(z.number()),
    queries: z.array(generatedQuerySchema),
    processingTimeMs: z.number(),
    strategy: z.enum(Object.values(QUERY_STRATEGIES) as [QueryStrategy, ...QueryStrategy[]]),
    aiServiceUsed: z.string().optional(),
    recommendations: z.array(z.string()).optional()
  })
});

export type QueryGenerationResponse = z.infer<typeof queryGenerationResponseSchema>;

// =====================================
// Query Template Schema
// =====================================

export const queryTemplateSchema = z.object({
  id: z.string().optional(),
  type: z.enum(Object.values(QUERY_TYPES) as [QueryType, ...QueryType[]]),
  template: z.string(),
  variables: z.array(z.string()),
  priority: z.number().min(1).max(3),
  description: z.string().optional(),
  active: z.boolean().default(true)
});

export type QueryTemplate = z.infer<typeof queryTemplateSchema>;

// =====================================
// Query History Schema
// =====================================

export const queryHistorySchema = z.object({
  id: z.string().optional(),
  profileId: z.string(),
  query: z.string(),
  type: z.enum(Object.values(QUERY_TYPES) as [QueryType, ...QueryType[]]),
  strategy: z.enum(Object.values(QUERY_STRATEGIES) as [QueryStrategy, ...QueryStrategy[]]),
  resultsFound: z.number().optional(),
  relevantResults: z.number().optional(),
  effectiveness: z.number().min(0).max(1).optional(),
  feedback: z.enum(['helpful', 'somewhat_helpful', 'not_helpful']).optional(),
  executedAt: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

export type QueryHistory = z.infer<typeof queryHistorySchema>;

// =====================================
// Query Performance Metrics Schema
// =====================================

export const queryPerformanceSchema = z.object({
  queryType: z.enum(Object.values(QUERY_TYPES) as [QueryType, ...QueryType[]]),
  averageResultsFound: z.number(),
  averageRelevantResults: z.number(),
  successRate: z.number().min(0).max(1),
  averageEffectiveness: z.number().min(0).max(1),
  totalExecutions: z.number(),
  lastUpdated: z.date()
});

export type QueryPerformance = z.infer<typeof queryPerformanceSchema>;

// =====================================
// Interfaces
// =====================================

export interface QueryGenerationContext {
  profile: {
    id: string;
    name?: string;
    mediums: string[];
    interests: string[];
    location?: string;
    careerStage?: string;
    bio?: string;
    artistStatement?: string;
  };
  preferences?: {
    preferredQueryTypes?: QueryType[];
    excludedKeywords?: string[];
    locationPreference?: LocationModifier;
  };
}

export interface QueryVariation {
  original: string;
  variations: string[];
  strategy: QueryStrategy;
}

export interface QueryGenerationStats {
  totalGenerated: number;
  typeBreakdown: Record<QueryType, number>;
  strategyBreakdown: Record<QueryStrategy, number>;
  averageConfidence: number;
  processingTime: number;
}

// =====================================
// Validation Helpers
// =====================================

export const validateQueryGenerationRequest = (data: unknown): QueryGenerationRequest => {
  return queryGenerationRequestSchema.parse(data);
};

export const validateGeneratedQuery = (data: unknown): GeneratedQuery => {
  return generatedQuerySchema.parse(data);
};

export const validateQueryTemplate = (data: unknown): QueryTemplate => {
  return queryTemplateSchema.parse(data);
};

export const validateQueryHistory = (data: unknown): QueryHistory => {
  return queryHistorySchema.parse(data);
};

// =====================================
// Error Types
// =====================================

export class QueryGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'QueryGenerationError';
  }
}

export class QueryValidationError extends Error {
  constructor(
    message: string,
    public validationErrors: string[],
    public originalData?: any
  ) {
    super(message);
    this.name = 'QueryValidationError';
  }
}