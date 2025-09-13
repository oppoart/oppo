/**
 * User Validation Schemas
 * Zod schemas for user preferences and settings validation
 */

import { z } from 'zod';
import { 
  NOTIFICATION_FREQUENCIES,
  APPLICATION_STYLES,
  AI_PROVIDERS,
  USER_AI_MODELS,
  QUERY_GENERATION_STYLES,
  COMMON_LOCATIONS,
  AI_SETTINGS,
  MATCH_SCORE,
} from '../constants/user.constants';
import { OPPORTUNITY_TYPES } from '../constants/opportunity.constants';

// Base user schema
export const userBaseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// User preferences schema
export const userPreferencesSchema = z.object({
  // Opportunity matching preferences
  minFundingAmount: z.number().int().positive().optional(),
  maxFundingAmount: z.number().int().positive().optional(),
  preferredLocations: z.array(z.string()).default([]),
  opportunityTypes: z.array(z.string()).default([]),
  
  // Notification preferences
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(false),
  notificationFrequency: z.enum([
    NOTIFICATION_FREQUENCIES.IMMEDIATE,
    NOTIFICATION_FREQUENCIES.DAILY,
    NOTIFICATION_FREQUENCIES.WEEKLY,
  ]).default(NOTIFICATION_FREQUENCIES.DAILY),
  
  // AI matching preferences
  minimumMatchScore: z.number()
    .min(MATCH_SCORE.MIN)
    .max(MATCH_SCORE.MAX)
    .default(MATCH_SCORE.DEFAULT),
  enableAutoApplication: z.boolean().default(false),
  
  // Application preferences
  applicationStyle: z.enum([
    APPLICATION_STYLES.FORMAL,
    APPLICATION_STYLES.CASUAL, 
    APPLICATION_STYLES.ARTISTIC,
  ]).default(APPLICATION_STYLES.FORMAL),
  includePortfolioLinks: z.boolean().default(true),
  
  // AI Configuration
  aiProvider: z.enum([
    AI_PROVIDERS.OPENAI,
    AI_PROVIDERS.ANTHROPIC,
  ]).default(AI_PROVIDERS.OPENAI),
  aiModel: z.string().default(USER_AI_MODELS.OPENAI.GPT_4),
  aiTemperature: z.number()
    .min(AI_SETTINGS.TEMPERATURE.MIN)
    .max(AI_SETTINGS.TEMPERATURE.MAX)
    .default(AI_SETTINGS.TEMPERATURE.DEFAULT),
  aiMaxTokens: z.number()
    .min(AI_SETTINGS.MAX_TOKENS.MIN)
    .max(AI_SETTINGS.MAX_TOKENS.MAX)
    .default(AI_SETTINGS.MAX_TOKENS.DEFAULT),
  enableQueryCache: z.boolean().default(true),
  enableAnalysisCache: z.boolean().default(true),
  queryGenerationStyle: z.enum([
    QUERY_GENERATION_STYLES.FOCUSED,
    QUERY_GENERATION_STYLES.DIVERSE,
    QUERY_GENERATION_STYLES.CREATIVE,
  ]).default(QUERY_GENERATION_STYLES.DIVERSE),
  
  // API settings
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  webhookUrl: z.string().url().optional(),
})
.refine(
  (data) => !data.maxFundingAmount || !data.minFundingAmount || data.maxFundingAmount >= data.minFundingAmount,
  {
    message: "Maximum funding amount must be greater than or equal to minimum funding amount",
    path: ["maxFundingAmount"],
  }
);

// User settings schema
export const userSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('light'),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  compactMode: z.boolean().default(false),
  showWelcomeTour: z.boolean().default(true),
  analyticsEnabled: z.boolean().default(true),
});

// Complete user with preferences schema
export const userWithPreferencesSchema = z.object({
  user: userBaseSchema,
  preferences: userPreferencesSchema,
  settings: userSettingsSchema,
});

// Update schemas for API endpoints  
export const updatePreferencesSchema = z.object({
  // Opportunity matching preferences
  minFundingAmount: z.number().int().positive().optional(),
  maxFundingAmount: z.number().int().positive().optional(),
  preferredLocations: z.array(z.string()).optional(),
  opportunityTypes: z.array(z.string()).optional(),
  
  // Notification preferences
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  notificationFrequency: z.enum([
    NOTIFICATION_FREQUENCIES.IMMEDIATE,
    NOTIFICATION_FREQUENCIES.DAILY,
    NOTIFICATION_FREQUENCIES.WEEKLY,
  ]).optional(),
  
  // AI matching preferences
  minimumMatchScore: z.number()
    .min(MATCH_SCORE.MIN)
    .max(MATCH_SCORE.MAX)
    .optional(),
  enableAutoApplication: z.boolean().optional(),
  
  // Application preferences
  applicationStyle: z.enum([
    APPLICATION_STYLES.FORMAL,
    APPLICATION_STYLES.CASUAL, 
    APPLICATION_STYLES.ARTISTIC,
  ]).optional(),
  includePortfolioLinks: z.boolean().optional(),
  
  // AI Configuration
  aiProvider: z.enum([
    AI_PROVIDERS.OPENAI,
    AI_PROVIDERS.ANTHROPIC,
  ]).optional(),
  aiModel: z.string().optional(),
  aiTemperature: z.number()
    .min(AI_SETTINGS.TEMPERATURE.MIN)
    .max(AI_SETTINGS.TEMPERATURE.MAX)
    .optional(),
  aiMaxTokens: z.number()
    .min(AI_SETTINGS.MAX_TOKENS.MIN)
    .max(AI_SETTINGS.MAX_TOKENS.MAX)
    .optional(),
  enableQueryCache: z.boolean().optional(),
  enableAnalysisCache: z.boolean().optional(),
  queryGenerationStyle: z.enum([
    QUERY_GENERATION_STYLES.FOCUSED,
    QUERY_GENERATION_STYLES.DIVERSE,
    QUERY_GENERATION_STYLES.CREATIVE,
  ]).optional(),
  
  // API settings
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  webhookUrl: z.string().url().optional(),
});

export const updateSettingsSchema = userSettingsSchema.partial();

// Profile information for users
export const userProfileSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  mediums: z.array(z.string()),
});

export const userWithProfilesSchema = userBaseSchema.extend({
  profiles: z.array(userProfileSummarySchema).optional(),
});

// API key validation schemas
export const apiKeySchema = z.object({
  openaiApiKey: z.string().regex(/^sk-[a-zA-Z0-9]{20,}$/, "Invalid OpenAI API key format").optional(),
  anthropicApiKey: z.string().regex(/^sk-ant-[a-zA-Z0-9_-]{20,}$/, "Invalid Anthropic API key format").optional(),
});

// Funding range validation schema
export const fundingRangeSchema = z.object({
  minFunding: z.string()
    .transform((val) => val === '' ? undefined : parseInt(val))
    .refine((val) => val === undefined || val >= 0, "Minimum funding must be non-negative")
    .optional(),
  maxFunding: z.string()
    .transform((val) => val === '' ? undefined : parseInt(val))
    .refine((val) => val === undefined || val >= 0, "Maximum funding must be non-negative")
    .optional(),
}).refine(
  (data) => !data.maxFunding || !data.minFunding || data.maxFunding >= data.minFunding,
  {
    message: "Maximum funding must be greater than or equal to minimum funding",
    path: ["maxFunding"],
  }
);

// Location preferences schema
export const locationPreferencesSchema = z.object({
  locations: z.array(z.string()).max(20, "Too many locations selected"),
});

// Opportunity type preferences schema
export const opportunityTypePreferencesSchema = z.object({
  types: z.array(z.string()).max(15, "Too many opportunity types selected"),
});

// Export type definitions
export type UserBase = z.infer<typeof userBaseSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type UserWithPreferences = z.infer<typeof userWithPreferencesSchema>;
export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type UserProfileSummary = z.infer<typeof userProfileSummarySchema>;
export type UserWithProfiles = z.infer<typeof userWithProfilesSchema>;
export type FundingRange = z.infer<typeof fundingRangeSchema>;
export type LocationPreferences = z.infer<typeof locationPreferencesSchema>;
export type OpportunityTypePreferences = z.infer<typeof opportunityTypePreferencesSchema>;