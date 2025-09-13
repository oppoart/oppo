/**
 * Research Validation Schemas
 * Zod schemas for research service validation
 */

import { z } from 'zod';
import {
  RESEARCH_SERVICES,
  RESEARCH_SESSION_STATUSES,
  RESEARCH_PRIORITIES,
  SOURCE_TYPES,
  RESEARCH_EXPORT_FORMATS,
  DEFAULT_RESEARCH_OPTIONS,
  RESULT_PAGINATION,
} from '../constants/research.constants';

// Research service start schema
export const startServiceSchema = z.object({
  serviceId: z.enum([
    RESEARCH_SERVICES.QUERY_GENERATION,
    RESEARCH_SERVICES.WEB_SEARCH,
    RESEARCH_SERVICES.LLM_SEARCH,
    RESEARCH_SERVICES.SOCIAL_MEDIA,
    RESEARCH_SERVICES.BOOKMARKS,
    RESEARCH_SERVICES.NEWSLETTERS,
  ]),
  profileId: z.string().uuid(),
  options: z.object({
    maxQueries: z.number().int().positive().max(50).default(DEFAULT_RESEARCH_OPTIONS.MAX_QUERIES),
    sources: z.array(z.string()).optional(),
    priority: z.enum([
      RESEARCH_PRIORITIES.LOW,
      RESEARCH_PRIORITIES.MEDIUM,
      RESEARCH_PRIORITIES.HIGH,
    ]).default(RESEARCH_PRIORITIES.MEDIUM),
    query: z.string().optional(),
    limit: z.number().int().positive().max(100).default(DEFAULT_RESEARCH_OPTIONS.SEARCH_LIMIT),
  }).optional(),
});

// Research service stop schema
export const stopServiceSchema = z.object({
  serviceId: z.string(),
  sessionId: z.string(),
});

// Research export schema
export const exportSchema = z.object({
  profileId: z.string().uuid(),
  serviceIds: z.array(z.string()).optional(),
  format: z.enum([
    RESEARCH_EXPORT_FORMATS.JSON,
    RESEARCH_EXPORT_FORMATS.CSV,
  ]).default(RESEARCH_EXPORT_FORMATS.JSON),
});

// Fetch opportunities schema
export const fetchOpportunitiesSchema = z.object({
  searchTerms: z.string().optional(),
  types: z.array(z.string()).optional(),
  minRelevanceScore: z.number().min(0).max(1).optional(),
});

// Query generation options schema
export const queryGenerationOptionsSchema = z.object({
  maxQueries: z.number().int().positive().max(50).default(DEFAULT_RESEARCH_OPTIONS.MAX_QUERIES),
  sourceTypes: z.array(z.enum([
    SOURCE_TYPES.WEBSEARCH,
    SOURCE_TYPES.SOCIAL,
    SOURCE_TYPES.BOOKMARK,
    SOURCE_TYPES.NEWSLETTER,
  ])).default([SOURCE_TYPES.WEBSEARCH, SOURCE_TYPES.SOCIAL]),
  profileId: z.string().uuid(),
  style: z.enum(['focused', 'diverse', 'creative']).default('diverse'),
});

// Search options schema
export const searchOptionsSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.number().int().positive().max(100).default(DEFAULT_RESEARCH_OPTIONS.SEARCH_LIMIT),
  offset: z.number().int().nonnegative().default(0),
  source: z.string().optional(),
});

// Session status schema
export const sessionStatusSchema = z.object({
  sessionId: z.string(),
  serviceId: z.string(),
  status: z.enum([
    RESEARCH_SESSION_STATUSES.RUNNING,
    RESEARCH_SESSION_STATUSES.COMPLETED,
    RESEARCH_SESSION_STATUSES.ERROR,
    RESEARCH_SESSION_STATUSES.STOPPED,
  ]),
  progress: z.number().min(0).max(100),
  resultsCount: z.number().int().nonnegative(),
  error: z.string().optional(),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Research result pagination schema
export const resultPaginationSchema = z.object({
  limit: z.string()
    .transform((val) => parseInt(val))
    .refine((val) => !isNaN(val) && val > 0 && val <= RESULT_PAGINATION.MAX_LIMIT)
    .default(String(RESULT_PAGINATION.DEFAULT_LIMIT)),
  offset: z.string()
    .transform((val) => parseInt(val))
    .refine((val) => !isNaN(val) && val >= 0)
    .default(String(RESULT_PAGINATION.DEFAULT_OFFSET)),
});

// Research session metadata schema
export const sessionMetadataSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  profileId: z.string().uuid(),
  status: z.enum([
    RESEARCH_SESSION_STATUSES.RUNNING,
    RESEARCH_SESSION_STATUSES.COMPLETED,
    RESEARCH_SESSION_STATUSES.ERROR,
    RESEARCH_SESSION_STATUSES.STOPPED,
  ]),
  progress: z.number().min(0).max(100),
  results: z.array(z.any()),
  error: z.string().optional(),
  startedAt: z.date(),
  updatedAt: z.date(),
});

// LLM search insight schema
export const llmInsightSchema = z.object({
  insight: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()),
  relevantOpportunities: z.number().int().nonnegative(),
  type: z.enum(['trend', 'opportunity', 'analysis', 'prediction']).optional(),
});

// Social media mention schema
export const socialMentionSchema = z.object({
  platform: z.string(),
  content: z.string(),
  engagement: z.number().int().nonnegative(),
  url: z.string().url(),
  author: z.string(),
  timestamp: z.string().datetime(),
  relevanceScore: z.number().min(0).max(1).optional(),
});

// Bookmark result schema
export const bookmarkSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  category: z.string(),
  savedDate: z.string().date(),
  tags: z.array(z.string()),
  description: z.string(),
  relevanceScore: z.number().min(0).max(1).optional(),
});

// Newsletter result schema
export const newsletterSchema = z.object({
  subject: z.string(),
  sender: z.string(),
  date: z.string().date(),
  content: z.string(),
  opportunities: z.number().int().nonnegative(),
  relevanceScore: z.number().min(0).max(1),
});

// Web search result schema
export const webSearchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  source: z.string(),
  relevance: z.number().min(0).max(1),
  publishedDate: z.string().datetime().optional(),
});

// Bulk research operation schema
export const bulkResearchSchema = z.object({
  services: z.array(z.string()).min(1, "At least one service must be specified"),
  profileIds: z.array(z.string().uuid()).min(1, "At least one profile must be specified"),
  options: z.object({
    maxQueries: z.number().int().positive().max(50).default(DEFAULT_RESEARCH_OPTIONS.MAX_QUERIES),
    priority: z.enum([
      RESEARCH_PRIORITIES.LOW,
      RESEARCH_PRIORITIES.MEDIUM,
      RESEARCH_PRIORITIES.HIGH,
    ]).default(RESEARCH_PRIORITIES.MEDIUM),
  }).optional(),
});

// Export type definitions
export type StartService = z.infer<typeof startServiceSchema>;
export type StopService = z.infer<typeof stopServiceSchema>;
export type ExportOptions = z.infer<typeof exportSchema>;
export type FetchOpportunities = z.infer<typeof fetchOpportunitiesSchema>;
export type QueryGenerationOptions = z.infer<typeof queryGenerationOptionsSchema>;
export type SearchOptions = z.infer<typeof searchOptionsSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type ResultPagination = z.infer<typeof resultPaginationSchema>;
export type SessionMetadata = z.infer<typeof sessionMetadataSchema>;
export type LLMInsight = z.infer<typeof llmInsightSchema>;
export type SocialMention = z.infer<typeof socialMentionSchema>;
export type BookmarkResult = z.infer<typeof bookmarkSchema>;
export type NewsletterResult = z.infer<typeof newsletterSchema>;
export type WebSearchResult = z.infer<typeof webSearchResultSchema>;
export type BulkResearch = z.infer<typeof bulkResearchSchema>;