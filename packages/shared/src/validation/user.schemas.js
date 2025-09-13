"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opportunityTypePreferencesSchema = exports.locationPreferencesSchema = exports.fundingRangeSchema = exports.apiKeySchema = exports.userWithProfilesSchema = exports.userProfileSummarySchema = exports.updateSettingsSchema = exports.updatePreferencesSchema = exports.userWithPreferencesSchema = exports.userSettingsSchema = exports.userPreferencesSchema = exports.userBaseSchema = void 0;
const zod_1 = require("zod");
const user_constants_1 = require("../constants/user.constants");
exports.userBaseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string().optional(),
    emailVerified: zod_1.z.boolean(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.userPreferencesSchema = zod_1.z.object({
    minFundingAmount: zod_1.z.number().int().positive().optional(),
    maxFundingAmount: zod_1.z.number().int().positive().optional(),
    preferredLocations: zod_1.z.array(zod_1.z.string()).default([]),
    opportunityTypes: zod_1.z.array(zod_1.z.string()).default([]),
    emailNotifications: zod_1.z.boolean().default(true),
    pushNotifications: zod_1.z.boolean().default(false),
    notificationFrequency: zod_1.z.enum([
        user_constants_1.NOTIFICATION_FREQUENCIES.IMMEDIATE,
        user_constants_1.NOTIFICATION_FREQUENCIES.DAILY,
        user_constants_1.NOTIFICATION_FREQUENCIES.WEEKLY,
    ]).default(user_constants_1.NOTIFICATION_FREQUENCIES.DAILY),
    minimumMatchScore: zod_1.z.number()
        .min(user_constants_1.MATCH_SCORE.MIN)
        .max(user_constants_1.MATCH_SCORE.MAX)
        .default(user_constants_1.MATCH_SCORE.DEFAULT),
    enableAutoApplication: zod_1.z.boolean().default(false),
    applicationStyle: zod_1.z.enum([
        user_constants_1.APPLICATION_STYLES.FORMAL,
        user_constants_1.APPLICATION_STYLES.CASUAL,
        user_constants_1.APPLICATION_STYLES.ARTISTIC,
    ]).default(user_constants_1.APPLICATION_STYLES.FORMAL),
    includePortfolioLinks: zod_1.z.boolean().default(true),
    aiProvider: zod_1.z.enum([
        user_constants_1.AI_PROVIDERS.OPENAI,
        user_constants_1.AI_PROVIDERS.ANTHROPIC,
    ]).default(user_constants_1.AI_PROVIDERS.OPENAI),
    aiModel: zod_1.z.string().default(user_constants_1.USER_AI_MODELS.OPENAI.GPT_4),
    aiTemperature: zod_1.z.number()
        .min(user_constants_1.AI_SETTINGS.TEMPERATURE.MIN)
        .max(user_constants_1.AI_SETTINGS.TEMPERATURE.MAX)
        .default(user_constants_1.AI_SETTINGS.TEMPERATURE.DEFAULT),
    aiMaxTokens: zod_1.z.number()
        .min(user_constants_1.AI_SETTINGS.MAX_TOKENS.MIN)
        .max(user_constants_1.AI_SETTINGS.MAX_TOKENS.MAX)
        .default(user_constants_1.AI_SETTINGS.MAX_TOKENS.DEFAULT),
    enableQueryCache: zod_1.z.boolean().default(true),
    enableAnalysisCache: zod_1.z.boolean().default(true),
    queryGenerationStyle: zod_1.z.enum([
        user_constants_1.QUERY_GENERATION_STYLES.FOCUSED,
        user_constants_1.QUERY_GENERATION_STYLES.DIVERSE,
        user_constants_1.QUERY_GENERATION_STYLES.CREATIVE,
    ]).default(user_constants_1.QUERY_GENERATION_STYLES.DIVERSE),
    openaiApiKey: zod_1.z.string().optional(),
    anthropicApiKey: zod_1.z.string().optional(),
    webhookUrl: zod_1.z.string().url().optional(),
})
    .refine((data) => !data.maxFundingAmount || !data.minFundingAmount || data.maxFundingAmount >= data.minFundingAmount, {
    message: "Maximum funding amount must be greater than or equal to minimum funding amount",
    path: ["maxFundingAmount"],
});
exports.userSettingsSchema = zod_1.z.object({
    theme: zod_1.z.enum(['light', 'dark', 'system']).default('light'),
    language: zod_1.z.string().default('en'),
    timezone: zod_1.z.string().default('UTC'),
    compactMode: zod_1.z.boolean().default(false),
    showWelcomeTour: zod_1.z.boolean().default(true),
    analyticsEnabled: zod_1.z.boolean().default(true),
});
exports.userWithPreferencesSchema = zod_1.z.object({
    user: exports.userBaseSchema,
    preferences: exports.userPreferencesSchema,
    settings: exports.userSettingsSchema,
});
exports.updatePreferencesSchema = zod_1.z.object({
    minFundingAmount: zod_1.z.number().int().positive().optional(),
    maxFundingAmount: zod_1.z.number().int().positive().optional(),
    preferredLocations: zod_1.z.array(zod_1.z.string()).optional(),
    opportunityTypes: zod_1.z.array(zod_1.z.string()).optional(),
    emailNotifications: zod_1.z.boolean().optional(),
    pushNotifications: zod_1.z.boolean().optional(),
    notificationFrequency: zod_1.z.enum([
        user_constants_1.NOTIFICATION_FREQUENCIES.IMMEDIATE,
        user_constants_1.NOTIFICATION_FREQUENCIES.DAILY,
        user_constants_1.NOTIFICATION_FREQUENCIES.WEEKLY,
    ]).optional(),
    minimumMatchScore: zod_1.z.number()
        .min(user_constants_1.MATCH_SCORE.MIN)
        .max(user_constants_1.MATCH_SCORE.MAX)
        .optional(),
    enableAutoApplication: zod_1.z.boolean().optional(),
    applicationStyle: zod_1.z.enum([
        user_constants_1.APPLICATION_STYLES.FORMAL,
        user_constants_1.APPLICATION_STYLES.CASUAL,
        user_constants_1.APPLICATION_STYLES.ARTISTIC,
    ]).optional(),
    includePortfolioLinks: zod_1.z.boolean().optional(),
    aiProvider: zod_1.z.enum([
        user_constants_1.AI_PROVIDERS.OPENAI,
        user_constants_1.AI_PROVIDERS.ANTHROPIC,
    ]).optional(),
    aiModel: zod_1.z.string().optional(),
    aiTemperature: zod_1.z.number()
        .min(user_constants_1.AI_SETTINGS.TEMPERATURE.MIN)
        .max(user_constants_1.AI_SETTINGS.TEMPERATURE.MAX)
        .optional(),
    aiMaxTokens: zod_1.z.number()
        .min(user_constants_1.AI_SETTINGS.MAX_TOKENS.MIN)
        .max(user_constants_1.AI_SETTINGS.MAX_TOKENS.MAX)
        .optional(),
    enableQueryCache: zod_1.z.boolean().optional(),
    enableAnalysisCache: zod_1.z.boolean().optional(),
    queryGenerationStyle: zod_1.z.enum([
        user_constants_1.QUERY_GENERATION_STYLES.FOCUSED,
        user_constants_1.QUERY_GENERATION_STYLES.DIVERSE,
        user_constants_1.QUERY_GENERATION_STYLES.CREATIVE,
    ]).optional(),
    openaiApiKey: zod_1.z.string().optional(),
    anthropicApiKey: zod_1.z.string().optional(),
    webhookUrl: zod_1.z.string().url().optional(),
});
exports.updateSettingsSchema = exports.userSettingsSchema.partial();
exports.userProfileSummarySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    mediums: zod_1.z.array(zod_1.z.string()),
});
exports.userWithProfilesSchema = exports.userBaseSchema.extend({
    profiles: zod_1.z.array(exports.userProfileSummarySchema).optional(),
});
exports.apiKeySchema = zod_1.z.object({
    openaiApiKey: zod_1.z.string().regex(/^sk-[a-zA-Z0-9]{20,}$/, "Invalid OpenAI API key format").optional(),
    anthropicApiKey: zod_1.z.string().regex(/^sk-ant-[a-zA-Z0-9_-]{20,}$/, "Invalid Anthropic API key format").optional(),
});
exports.fundingRangeSchema = zod_1.z.object({
    minFunding: zod_1.z.string()
        .transform((val) => val === '' ? undefined : parseInt(val))
        .refine((val) => val === undefined || val >= 0, "Minimum funding must be non-negative")
        .optional(),
    maxFunding: zod_1.z.string()
        .transform((val) => val === '' ? undefined : parseInt(val))
        .refine((val) => val === undefined || val >= 0, "Maximum funding must be non-negative")
        .optional(),
}).refine((data) => !data.maxFunding || !data.minFunding || data.maxFunding >= data.minFunding, {
    message: "Maximum funding must be greater than or equal to minimum funding",
    path: ["maxFunding"],
});
exports.locationPreferencesSchema = zod_1.z.object({
    locations: zod_1.z.array(zod_1.z.string()).max(20, "Too many locations selected"),
});
exports.opportunityTypePreferencesSchema = zod_1.z.object({
    types: zod_1.z.array(zod_1.z.string()).max(15, "Too many opportunity types selected"),
});
//# sourceMappingURL=user.schemas.js.map