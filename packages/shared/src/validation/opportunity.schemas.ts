/**
 * Opportunity Validation Schemas
 * Zod schemas for opportunity data validation
 */

import { z } from 'zod';
import {
  OPPORTUNITY_TYPES,
  OPPORTUNITY_CATEGORIES,
  APPLICATION_STATUSES,
  RELEVANCE_THRESHOLDS,
  GEOGRAPHIC_SCOPE,
  DURATION_TYPES,
  TARGET_DEMOGRAPHICS,
  ART_DISCIPLINES,
  VALIDATION_STATUSES,
  DISCOVERY_SOURCES,
} from '../constants/opportunity.constants';
import { 
  SCRAPING_METHODS,
  CONTENT_LIMITS,
} from '../constants/scraper.constants';

// Base opportunity schema
export const opportunityBaseSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(CONTENT_LIMITS.TITLE_MAX_LENGTH),
  description: z.string().min(1).max(CONTENT_LIMITS.DESCRIPTION_MAX_LENGTH),
  url: z.string().url(),
  organization: z.string().max(CONTENT_LIMITS.ORGANIZATION_MAX_LENGTH).optional(),
  deadline: z.date().optional(),
  amount: z.string().optional(),
  location: z.string().max(CONTENT_LIMITS.LOCATION_MAX_LENGTH).optional(),
  
  // Classification
  type: z.enum(Object.values(OPPORTUNITY_TYPES) as [string, ...string[]]).optional(),
  category: z.enum(Object.values(OPPORTUNITY_CATEGORIES) as [string, ...string[]]).optional(),
  geographicScope: z.enum(Object.values(GEOGRAPHIC_SCOPE) as [string, ...string[]]).optional(),
  durationType: z.enum(Object.values(DURATION_TYPES) as [string, ...string[]]).optional(),
  targetDemographic: z.enum(Object.values(TARGET_DEMOGRAPHICS) as [string, ...string[]]).optional(),
  artDisciplines: z.array(z.enum(Object.values(ART_DISCIPLINES) as [string, ...string[]])).optional(),
  
  // Metadata
  requirements: z.array(z.string().max(CONTENT_LIMITS.REQUIREMENT_MAX_LENGTH)).max(CONTENT_LIMITS.MAX_REQUIREMENTS).optional(),
  tags: z.array(z.string()).max(CONTENT_LIMITS.MAX_TAGS).optional(),
  applicationUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  
  // Discovery metadata
  discoverySource: z.enum(Object.values(DISCOVERY_SOURCES) as [string, ...string[]]).optional(),
  scrapingMethod: z.enum(Object.values(SCRAPING_METHODS) as [string, ...string[]]).optional(),
  rawContent: z.string().max(CONTENT_LIMITS.RAW_CONTENT_MAX_LENGTH).optional(),
  
  // Relevance and validation
  relevanceScore: z.number().min(0).max(1).optional(),
  validationStatus: z.enum(Object.values(VALIDATION_STATUSES) as [string, ...string[]]).default(VALIDATION_STATUSES.UNVALIDATED),
  
  // Timestamps
  scrapedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  publishedAt: z.date().optional(),
});

// Scraped opportunity schema (from scraper service)
export const scrapedOpportunitySchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string().url(),
  organization: z.string().optional(),
  deadline: z.date().optional(),
  amount: z.string().optional(),
  location: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  applicationUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  rawContent: z.string(),
  scrapingMethod: z.enum([
    SCRAPING_METHODS.FIRECRAWL,
    SCRAPING_METHODS.PLAYWRIGHT,
    SCRAPING_METHODS.CHEERIO,
  ]),
  scrapedAt: z.date(),
  success: z.boolean(),
  error: z.string().optional(),
});

// Opportunity creation schema (API input)
export const createOpportunitySchema = opportunityBaseSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Opportunity update schema (API input)
export const updateOpportunitySchema = opportunityBaseSchema.partial().omit({
  id: true,
  createdAt: true,
});

// Opportunity search/filter schema
export const opportunitySearchSchema = z.object({
  // Text search
  query: z.string().optional(),
  title: z.string().optional(),
  organization: z.string().optional(),
  
  // Filters
  type: z.enum(Object.values(OPPORTUNITY_TYPES) as [string, ...string[]]).optional(),
  category: z.enum(Object.values(OPPORTUNITY_CATEGORIES) as [string, ...string[]]).optional(),
  location: z.string().optional(),
  geographicScope: z.enum(Object.values(GEOGRAPHIC_SCOPE) as [string, ...string[]]).optional(),
  artDisciplines: z.array(z.enum(Object.values(ART_DISCIPLINES) as [string, ...string[]])).optional(),
  tags: z.array(z.string()).optional(),
  
  // Amount filters
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  
  // Deadline filters
  deadlineAfter: z.date().optional(),
  deadlineBefore: z.date().optional(),
  
  // Relevance filters
  minRelevanceScore: z.number().min(0).max(1).optional(),
  maxRelevanceScore: z.number().min(0).max(1).optional(),
  
  // Validation filters
  validationStatus: z.enum(Object.values(VALIDATION_STATUSES) as [string, ...string[]]).optional(),
  discoverySource: z.enum(Object.values(DISCOVERY_SOURCES) as [string, ...string[]]).optional(),
  
  // Date filters
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  
  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  
  // Sorting
  sortBy: z.enum(['createdAt', 'deadline', 'relevanceScore', 'title', 'amount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Application tracking schema
export const opportunityApplicationSchema = z.object({
  opportunityId: z.string().uuid(),
  profileId: z.string().uuid(),
  status: z.enum(Object.values(APPLICATION_STATUSES) as [string, ...string[]]),
  appliedAt: z.date().optional(),
  submittedAt: z.date().optional(),
  responseAt: z.date().optional(),
  notes: z.string().optional(),
  applicationData: z.record(z.any()).optional(), // Flexible application data
});

// Opportunity analysis schema
export const opportunityAnalysisSchema = z.object({
  opportunityId: z.string().uuid(),
  profileId: z.string().uuid(),
  relevanceScore: z.number().min(0).max(1),
  matchingCriteria: z.array(z.string()),
  strengthsAlignment: z.array(z.string()),
  gapsIdentified: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  confidenceLevel: z.number().min(0).max(1),
  analysisDate: z.date(),
  aiModel: z.string().optional(),
});

// Bulk opportunity operations schema
export const bulkOpportunityOperationSchema = z.object({
  opportunityIds: z.array(z.string().uuid()).min(1).max(100),
  operation: z.enum(['validate', 'archive', 'delete', 'reprocess']),
  options: z.record(z.any()).optional(),
});

// Opportunity import schema
export const opportunityImportSchema = z.object({
  source: z.string(),
  format: z.enum(['json', 'csv', 'xml']),
  data: z.array(z.record(z.any())).min(1).max(1000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateFirst: z.boolean().default(true),
    assignToProfile: z.string().uuid().optional(),
  }).optional(),
});

// Opportunity statistics schema
export const opportunityStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  byType: z.record(z.number().int().nonnegative()),
  byCategory: z.record(z.number().int().nonnegative()),
  byValidationStatus: z.record(z.number().int().nonnegative()),
  byRelevanceRange: z.record(z.number().int().nonnegative()),
  averageRelevanceScore: z.number().min(0).max(1),
  recentlyAdded: z.number().int().nonnegative(),
  upcomingDeadlines: z.number().int().nonnegative(),
});

// Export type definitions
export type OpportunityBase = z.infer<typeof opportunityBaseSchema>;
export type ScrapedOpportunity = z.infer<typeof scrapedOpportunitySchema>;
export type CreateOpportunity = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunity = z.infer<typeof updateOpportunitySchema>;
export type OpportunitySearch = z.infer<typeof opportunitySearchSchema>;
export type OpportunityApplication = z.infer<typeof opportunityApplicationSchema>;
export type OpportunityAnalysis = z.infer<typeof opportunityAnalysisSchema>;
export type BulkOpportunityOperation = z.infer<typeof bulkOpportunityOperationSchema>;
export type OpportunityImport = z.infer<typeof opportunityImportSchema>;
export type OpportunityStats = z.infer<typeof opportunityStatsSchema>;