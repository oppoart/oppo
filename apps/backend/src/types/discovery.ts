import { z } from 'zod';

// =====================================
// Discovery System Types & Schemas
// =====================================

// Source Types
export const sourceTypes = ['websearch', 'social', 'bookmark', 'newsletter', 'manual'] as const;
export type SourceType = typeof sourceTypes[number];

// Opportunity Status Types
export const opportunityStatuses = ['new', 'reviewing', 'applying', 'submitted', 'rejected', 'archived'] as const;
export type OpportunityStatus = typeof opportunityStatuses[number];

// Job Status Types
export const jobStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
export type JobStatus = typeof jobStatuses[number];

// =====================================
// Core Opportunity Schema
// =====================================

export const opportunityDataSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  organization: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  url: z.string().url('Invalid URL'),
  deadline: z.date().optional(),
  amount: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).default([]),
  
  // Discovery metadata
  sourceType: z.enum(sourceTypes),
  sourceUrl: z.string().url().optional(),
  sourceMetadata: z.record(z.any()).optional(),
  
  // Processing metadata
  relevanceScore: z.number().min(0).max(1).optional(),
  semanticScore: z.number().min(0).max(1).optional(),
  keywordScore: z.number().min(0).max(1).optional(),
  categoryScore: z.number().min(0).max(1).optional(),
  aiServiceUsed: z.string().optional(),
  processingTimeMs: z.number().optional(),
  processed: z.boolean().default(false),
  
  // User interaction
  status: z.enum(opportunityStatuses).default('new'),
  applied: z.boolean().default(false),
  notes: z.string().optional(),
  starred: z.boolean().default(false),
});

export type OpportunityData = z.infer<typeof opportunityDataSchema>;

// =====================================
// Discovery Source Schema
// =====================================

export const discoverySourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Source name is required'),
  type: z.enum(sourceTypes),
  url: z.string().url().optional(),
  enabled: z.boolean().default(true),
  config: z.record(z.any()).optional(),
});

export type DiscoverySourceData = z.infer<typeof discoverySourceSchema>;

// Source-specific configurations
export const webSearchConfigSchema = z.object({
  searchQueries: z.array(z.string()),
  providers: z.array(z.enum(['serpapi', 'tavily', 'bing', 'perplexity'])),
  maxResults: z.number().default(20),
  language: z.string().default('en'),
});

export const socialConfigSchema = z.object({
  platform: z.enum(['twitter', 'instagram', 'linkedin', 'threads']),
  hashtags: z.array(z.string()).optional(),
  accounts: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  maxPosts: z.number().default(50),
});

export const bookmarkConfigSchema = z.object({
  urls: z.array(z.string().url()),
  selectors: z.record(z.string()).optional(), // CSS selectors for data extraction
  frequency: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
});

export const newsletterConfigSchema = z.object({
  senderEmails: z.array(z.string().email()),
  keywords: z.array(z.string()),
  processAttachments: z.boolean().default(false),
});

// =====================================
// Discovery Job Schema
// =====================================

export const discoveryJobSchema = z.object({
  id: z.string().optional(),
  sourceId: z.string().optional(),
  sourceType: z.enum(sourceTypes),
  sourceName: z.string().optional(),
  status: z.enum(jobStatuses).default('pending'),
  metadata: z.record(z.any()).optional(),
});

export type DiscoveryJobData = z.infer<typeof discoveryJobSchema>;

// =====================================
// AI Service Metrics Schema
// =====================================

export const aiServiceMetricsSchema = z.object({
  serviceName: z.enum(['openai', 'anthropic', 'google', 'huggingface', 'local']),
  operation: z.enum(['embedding', 'analysis', 'search', 'classification']),
  responseTimeMs: z.number(),
  success: z.boolean(),
  costUsd: z.number().optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type AIServiceMetrics = z.infer<typeof aiServiceMetricsSchema>;

// =====================================
// Discovery Result Types
// =====================================

export interface DiscoveryResult {
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  opportunities: OpportunityData[];
  errors: string[];
  processingTimeMs: number;
  metadata?: Record<string, any>;
}

export interface ConsolidatedDiscoveryResult {
  totalOpportunities: number;
  newOpportunities: number;
  duplicatesRemoved: number;
  sources: DiscoveryResult[];
  processingTimeMs: number;
  errors: string[];
}

// =====================================
// Search Query Generation Types
// =====================================

export interface SearchQueryContext {
  artistMediums: string[];
  location?: string;
  interests: string[];
  careerStage?: string;
  fundingRange?: {
    min?: number;
    max?: number;
  };
}

export interface GeneratedSearchQuery {
  query: string;
  provider: string;
  priority: number;
  context: SearchQueryContext;
  expectedResults: number;
}

// =====================================
// Deduplication Types
// =====================================

export interface DuplicationCandidate {
  opportunityId: string;
  duplicateId: string;
  similarityScore: number;
  similarityFactors: {
    titleSimilarity: number;
    organizationSimilarity: number;
    deadlineSimilarity: number;
    descriptionSimilarity: number;
  };
}

export interface DeduplicationResult {
  duplicatesFound: number;
  duplicatesRemoved: number;
  duplicatePairs: DuplicationCandidate[];
  processingTimeMs: number;
}

// =====================================
// API Response Types
// =====================================

export interface OpportunityApiResponse {
  success: boolean;
  message: string;
  data?: OpportunityData | OpportunityData[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DiscoveryJobApiResponse {
  success: boolean;
  message: string;
  data?: DiscoveryJobData | DiscoveryJobData[];
}

export interface DiscoveryMetricsApiResponse {
  success: boolean;
  data: {
    totalOpportunities: number;
    newToday: number;
    averageRelevanceScore: number;
    sourceBreakdown: Record<SourceType, number>;
    aiServiceMetrics: Record<string, {
      avgResponseTime: number;
      successRate: number;
      totalCost: number;
    }>;
    recentJobs: DiscoveryJobData[];
  };
}

// =====================================
// Error Types
// =====================================

export class DiscoveryError extends Error {
  constructor(
    message: string,
    public sourceType: SourceType,
    public sourceName: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'DiscoveryError';
  }
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public serviceName: string,
    public operation: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// =====================================
// Validation Helpers
// =====================================

export const validateOpportunityData = (data: unknown): OpportunityData => {
  return opportunityDataSchema.parse(data);
};

export const validateDiscoverySource = (data: unknown): DiscoverySourceData => {
  return discoverySourceSchema.parse(data);
};

export const validateDiscoveryJob = (data: unknown): DiscoveryJobData => {
  return discoveryJobSchema.parse(data);
};