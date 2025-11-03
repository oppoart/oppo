import { z } from 'zod';
export declare const userBaseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    emailVerified: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
    id?: string;
    createdAt?: string;
    updatedAt?: string;
    name?: string;
    emailVerified?: boolean;
}, {
    email?: string;
    id?: string;
    createdAt?: string;
    updatedAt?: string;
    name?: string;
    emailVerified?: boolean;
}>;
export declare const userPreferencesSchema: z.ZodEffects<z.ZodObject<{
    minFundingAmount: z.ZodOptional<z.ZodNumber>;
    maxFundingAmount: z.ZodOptional<z.ZodNumber>;
    preferredLocations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    opportunityTypes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    emailNotifications: z.ZodDefault<z.ZodBoolean>;
    pushNotifications: z.ZodDefault<z.ZodBoolean>;
    notificationFrequency: z.ZodDefault<z.ZodEnum<["immediate", "daily", "weekly"]>>;
    minimumMatchScore: z.ZodDefault<z.ZodNumber>;
    enableAutoApplication: z.ZodDefault<z.ZodBoolean>;
    applicationStyle: z.ZodDefault<z.ZodEnum<["formal", "casual", "artistic"]>>;
    includePortfolioLinks: z.ZodDefault<z.ZodBoolean>;
    aiProvider: z.ZodDefault<z.ZodEnum<["openai", "anthropic"]>>;
    aiModel: z.ZodDefault<z.ZodString>;
    aiTemperature: z.ZodDefault<z.ZodNumber>;
    aiMaxTokens: z.ZodDefault<z.ZodNumber>;
    enableQueryCache: z.ZodDefault<z.ZodBoolean>;
    enableAnalysisCache: z.ZodDefault<z.ZodBoolean>;
    queryGenerationStyle: z.ZodDefault<z.ZodEnum<["focused", "diverse", "creative"]>>;
    openaiApiKey: z.ZodOptional<z.ZodString>;
    anthropicApiKey: z.ZodOptional<z.ZodString>;
    webhookUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    minFundingAmount?: number;
    maxFundingAmount?: number;
    preferredLocations?: string[];
    opportunityTypes?: string[];
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    notificationFrequency?: "daily" | "immediate" | "weekly";
    minimumMatchScore?: number;
    enableAutoApplication?: boolean;
    applicationStyle?: "formal" | "casual" | "artistic";
    includePortfolioLinks?: boolean;
    aiProvider?: "openai" | "anthropic";
    aiModel?: string;
    aiTemperature?: number;
    aiMaxTokens?: number;
    enableQueryCache?: boolean;
    enableAnalysisCache?: boolean;
    queryGenerationStyle?: "focused" | "diverse" | "creative";
    openaiApiKey?: string;
    anthropicApiKey?: string;
    webhookUrl?: string;
}, {
    minFundingAmount?: number;
    maxFundingAmount?: number;
    preferredLocations?: string[];
    opportunityTypes?: string[];
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    notificationFrequency?: "daily" | "immediate" | "weekly";
    minimumMatchScore?: number;
    enableAutoApplication?: boolean;
    applicationStyle?: "formal" | "casual" | "artistic";
    includePortfolioLinks?: boolean;
    aiProvider?: "openai" | "anthropic";
    aiModel?: string;
    aiTemperature?: number;
    aiMaxTokens?: number;
    enableQueryCache?: boolean;
    enableAnalysisCache?: boolean;
    queryGenerationStyle?: "focused" | "diverse" | "creative";
    openaiApiKey?: string;
    anthropicApiKey?: string;
    webhookUrl?: string;
}>, {
    minFundingAmount?: number;
    maxFundingAmount?: number;
    preferredLocations?: string[];
    opportunityTypes?: string[];
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    notificationFrequency?: "daily" | "immediate" | "weekly";
    minimumMatchScore?: number;
    enableAutoApplication?: boolean;
    applicationStyle?: "formal" | "casual" | "artistic";
    includePortfolioLinks?: boolean;
    aiProvider?: "openai" | "anthropic";
    aiModel?: string;
    aiTemperature?: number;
    aiMaxTokens?: number;
    enableQueryCache?: boolean;
    enableAnalysisCache?: boolean;
    queryGenerationStyle?: "focused" | "diverse" | "creative";
    openaiApiKey?: string;
    anthropicApiKey?: string;
    webhookUrl?: string;
}, {
    minFundingAmount?: number;
    maxFundingAmount?: number;
    preferredLocations?: string[];
    opportunityTypes?: string[];
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    notificationFrequency?: "daily" | "immediate" | "weekly";
    minimumMatchScore?: number;
    enableAutoApplication?: boolean;
    applicationStyle?: "formal" | "casual" | "artistic";
    includePortfolioLinks?: boolean;
    aiProvider?: "openai" | "anthropic";
    aiModel?: string;
    aiTemperature?: number;
    aiMaxTokens?: number;
    enableQueryCache?: boolean;
    enableAnalysisCache?: boolean;
    queryGenerationStyle?: "focused" | "diverse" | "creative";
    openaiApiKey?: string;
    anthropicApiKey?: string;
    webhookUrl?: string;
}>;
export declare const userSettingsSchema: z.ZodObject<{
    theme: z.ZodDefault<z.ZodEnum<["light", "dark", "system"]>>;
    language: z.ZodDefault<z.ZodString>;
    timezone: z.ZodDefault<z.ZodString>;
    compactMode: z.ZodDefault<z.ZodBoolean>;
    showWelcomeTour: z.ZodDefault<z.ZodBoolean>;
    analyticsEnabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    theme?: "system" | "light" | "dark";
    language?: string;
    timezone?: string;
    compactMode?: boolean;
    showWelcomeTour?: boolean;
    analyticsEnabled?: boolean;
}, {
    theme?: "system" | "light" | "dark";
    language?: string;
    timezone?: string;
    compactMode?: boolean;
    showWelcomeTour?: boolean;
    analyticsEnabled?: boolean;
}>;
export declare const userWithPreferencesSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        emailVerified: z.ZodBoolean;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email?: string;
        id?: string;
        createdAt?: string;
        updatedAt?: string;
        name?: string;
        emailVerified?: boolean;
    }, {
        email?: string;
        id?: string;
        createdAt?: string;
        updatedAt?: string;
        name?: string;
        emailVerified?: boolean;
    }>;
    preferences: z.ZodEffects<z.ZodObject<{
        minFundingAmount: z.ZodOptional<z.ZodNumber>;
        maxFundingAmount: z.ZodOptional<z.ZodNumber>;
        preferredLocations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        opportunityTypes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        emailNotifications: z.ZodDefault<z.ZodBoolean>;
        pushNotifications: z.ZodDefault<z.ZodBoolean>;
        notificationFrequency: z.ZodDefault<z.ZodEnum<["immediate", "daily", "weekly"]>>;
        minimumMatchScore: z.ZodDefault<z.ZodNumber>;
        enableAutoApplication: z.ZodDefault<z.ZodBoolean>;
        applicationStyle: z.ZodDefault<z.ZodEnum<["formal", "casual", "artistic"]>>;
        includePortfolioLinks: z.ZodDefault<z.ZodBoolean>;
        aiProvider: z.ZodDefault<z.ZodEnum<["openai", "anthropic"]>>;
        aiModel: z.ZodDefault<z.ZodString>;
        aiTemperature: z.ZodDefault<z.ZodNumber>;
        aiMaxTokens: z.ZodDefault<z.ZodNumber>;
        enableQueryCache: z.ZodDefault<z.ZodBoolean>;
        enableAnalysisCache: z.ZodDefault<z.ZodBoolean>;
        queryGenerationStyle: z.ZodDefault<z.ZodEnum<["focused", "diverse", "creative"]>>;
        openaiApiKey: z.ZodOptional<z.ZodString>;
        anthropicApiKey: z.ZodOptional<z.ZodString>;
        webhookUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        minFundingAmount?: number;
        maxFundingAmount?: number;
        preferredLocations?: string[];
        opportunityTypes?: string[];
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        notificationFrequency?: "daily" | "immediate" | "weekly";
        minimumMatchScore?: number;
        enableAutoApplication?: boolean;
        applicationStyle?: "formal" | "casual" | "artistic";
        includePortfolioLinks?: boolean;
        aiProvider?: "openai" | "anthropic";
        aiModel?: string;
        aiTemperature?: number;
        aiMaxTokens?: number;
        enableQueryCache?: boolean;
        enableAnalysisCache?: boolean;
        queryGenerationStyle?: "focused" | "diverse" | "creative";
        openaiApiKey?: string;
        anthropicApiKey?: string;
        webhookUrl?: string;
    }, {
        minFundingAmount?: number;
        maxFundingAmount?: number;
        preferredLocations?: string[];
        opportunityTypes?: string[];
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        notificationFrequency?: "daily" | "immediate" | "weekly";
        minimumMatchScore?: number;
        enableAutoApplication?: boolean;
        applicationStyle?: "formal" | "casual" | "artistic";
        includePortfolioLinks?: boolean;
        aiProvider?: "openai" | "anthropic";
        aiModel?: string;
        aiTemperature?: number;
        aiMaxTokens?: number;
        enableQueryCache?: boolean;
        enableAnalysisCache?: boolean;
        queryGenerationStyle?: "focused" | "diverse" | "creative";
        openaiApiKey?: string;
        anthropicApiKey?: string;
        webhookUrl?: string;
    }>, {
        minFundingAmount?: number;
        maxFundingAmount?: number;
        preferredLocations?: string[];
        opportunityTypes?: string[];
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        notificationFrequency?: "daily" | "immediate" | "weekly";
        minimumMatchScore?: number;
        enableAutoApplication?: boolean;
        applicationStyle?: "formal" | "casual" | "artistic";
        includePortfolioLinks?: boolean;
        aiProvider?: "openai" | "anthropic";
        aiModel?: string;
        aiTemperature?: number;
        aiMaxTokens?: number;
        enableQueryCache?: boolean;
        enableAnalysisCache?: boolean;
        queryGenerationStyle?: "focused" | "diverse" | "creative";
        openaiApiKey?: string;
        anthropicApiKey?: string;
        webhookUrl?: string;
    }, {
        minFundingAmount?: number;
        maxFundingAmount?: number;
        preferredLocations?: string[];
        opportunityTypes?: string[];
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        notificationFrequency?: "daily" | "immediate" | "weekly";
        minimumMatchScore?: number;
        enableAutoApplication?: boolean;
        applicationStyle?: "formal" | "casual" | "artistic";
        includePortfolioLinks?: boolean;
        aiProvider?: "openai" | "anthropic";
        aiModel?: string;
        aiTemperature?: number;
        aiMaxTokens?: number;
        enableQueryCache?: boolean;
        enableAnalysisCache?: boolean;
        queryGenerationStyle?: "focused" | "diverse" | "creative";
        openaiApiKey?: string;
        anthropicApiKey?: string;
        webhookUrl?: string;
    }>;
    settings: z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<["light", "dark", "system"]>>;
        language: z.ZodDefault<z.ZodString>;
        timezone: z.ZodDefault<z.ZodString>;
        compactMode: z.ZodDefault<z.ZodBoolean>;
        showWelcomeTour: z.ZodDefault<z.ZodBoolean>;
        analyticsEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        theme?: "system" | "light" | "dark";
        language?: string;
        timezone?: string;
        compactMode?: boolean;
        showWelcomeTour?: boolean;
        analyticsEnabled?: boolean;
    }, {
        theme?: "system" | "light" | "dark";
        language?: string;
        timezone?: string;
        compactMode?: boolean;
        showWelcomeTour?: boolean;
        analyticsEnabled?: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    user?: {
        email?: string;
        id?: string;
        createdAt?: string;
        updatedAt?: string;
        name?: string;
        emailVerified?: boolean;
    };
    preferences?: {
        minFundingAmount?: number;
        maxFundingAmount?: number;
        preferredLocations?: string[];
        opportunityTypes?: string[];
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        notificationFrequency?: "daily" | "immediate" | "weekly";
        minimumMatchScore?: number;
        enableAutoApplication?: boolean;
        applicationStyle?: "formal" | "casual" | "artistic";
        includePortfolioLinks?: boolean;
        aiProvider?: "openai" | "anthropic";
        aiModel?: string;
        aiTemperature?: number;
        aiMaxTokens?: number;
        enableQueryCache?: boolean;
        enableAnalysisCache?: boolean;
        queryGenerationStyle?: "focused" | "diverse" | "creative";
        openaiApiKey?: string;
        anthropicApiKey?: string;
        webhookUrl?: string;
    };
    settings?: {
        theme?: "system" | "light" | "dark";
        language?: string;
        timezone?: string;
        compactMode?: boolean;
        showWelcomeTour?: boolean;
        analyticsEnabled?: boolean;
    };
}, {
    user?: {
        email?: string;
        id?: string;
        createdAt?: string;
        updatedAt?: string;
        name?: string;
        emailVerified?: boolean;
    };
    preferences?: {
        minFundingAmount?: number;
        maxFundingAmount?: number;
        preferredLocations?: string[];
        opportunityTypes?: string[];
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        notificationFrequency?: "daily" | "immediate" | "weekly";
        minimumMatchScore?: number;
        enableAutoApplication?: boolean;
        applicationStyle?: "formal" | "casual" | "artistic";
        includePortfolioLinks?: boolean;
        aiProvider?: "openai" | "anthropic";
        aiModel?: string;
        aiTemperature?: number;
        aiMaxTokens?: number;
        enableQueryCache?: boolean;
        enableAnalysisCache?: boolean;
        queryGenerationStyle?: "focused" | "diverse" | "creative";
        openaiApiKey?: string;
        anthropicApiKey?: string;
        webhookUrl?: string;
    };
    settings?: {
        theme?: "system" | "light" | "dark";
        language?: string;
        timezone?: string;
        compactMode?: boolean;
        showWelcomeTour?: boolean;
        analyticsEnabled?: boolean;
    };
}>;
export declare const updatePreferencesSchema: z.ZodObject<{
    minFundingAmount: z.ZodOptional<z.ZodNumber>;
    maxFundingAmount: z.ZodOptional<z.ZodNumber>;
    preferredLocations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    opportunityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    emailNotifications: z.ZodOptional<z.ZodBoolean>;
    pushNotifications: z.ZodOptional<z.ZodBoolean>;
    notificationFrequency: z.ZodOptional<z.ZodEnum<["immediate", "daily", "weekly"]>>;
    minimumMatchScore: z.ZodOptional<z.ZodNumber>;
    enableAutoApplication: z.ZodOptional<z.ZodBoolean>;
    applicationStyle: z.ZodOptional<z.ZodEnum<["formal", "casual", "artistic"]>>;
    includePortfolioLinks: z.ZodOptional<z.ZodBoolean>;
    aiProvider: z.ZodOptional<z.ZodEnum<["openai", "anthropic"]>>;
    aiModel: z.ZodOptional<z.ZodString>;
    aiTemperature: z.ZodOptional<z.ZodNumber>;
    aiMaxTokens: z.ZodOptional<z.ZodNumber>;
    enableQueryCache: z.ZodOptional<z.ZodBoolean>;
    enableAnalysisCache: z.ZodOptional<z.ZodBoolean>;
    queryGenerationStyle: z.ZodOptional<z.ZodEnum<["focused", "diverse", "creative"]>>;
    openaiApiKey: z.ZodOptional<z.ZodString>;
    anthropicApiKey: z.ZodOptional<z.ZodString>;
    webhookUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    minFundingAmount?: number;
    maxFundingAmount?: number;
    preferredLocations?: string[];
    opportunityTypes?: string[];
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    notificationFrequency?: "daily" | "immediate" | "weekly";
    minimumMatchScore?: number;
    enableAutoApplication?: boolean;
    applicationStyle?: "formal" | "casual" | "artistic";
    includePortfolioLinks?: boolean;
    aiProvider?: "openai" | "anthropic";
    aiModel?: string;
    aiTemperature?: number;
    aiMaxTokens?: number;
    enableQueryCache?: boolean;
    enableAnalysisCache?: boolean;
    queryGenerationStyle?: "focused" | "diverse" | "creative";
    openaiApiKey?: string;
    anthropicApiKey?: string;
    webhookUrl?: string;
}, {
    minFundingAmount?: number;
    maxFundingAmount?: number;
    preferredLocations?: string[];
    opportunityTypes?: string[];
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    notificationFrequency?: "daily" | "immediate" | "weekly";
    minimumMatchScore?: number;
    enableAutoApplication?: boolean;
    applicationStyle?: "formal" | "casual" | "artistic";
    includePortfolioLinks?: boolean;
    aiProvider?: "openai" | "anthropic";
    aiModel?: string;
    aiTemperature?: number;
    aiMaxTokens?: number;
    enableQueryCache?: boolean;
    enableAnalysisCache?: boolean;
    queryGenerationStyle?: "focused" | "diverse" | "creative";
    openaiApiKey?: string;
    anthropicApiKey?: string;
    webhookUrl?: string;
}>;
export declare const updateSettingsSchema: z.ZodObject<{
    theme: z.ZodOptional<z.ZodDefault<z.ZodEnum<["light", "dark", "system"]>>>;
    language: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    timezone: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    compactMode: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    showWelcomeTour: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    analyticsEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    theme?: "system" | "light" | "dark";
    language?: string;
    timezone?: string;
    compactMode?: boolean;
    showWelcomeTour?: boolean;
    analyticsEnabled?: boolean;
}, {
    theme?: "system" | "light" | "dark";
    language?: string;
    timezone?: string;
    compactMode?: boolean;
    showWelcomeTour?: boolean;
    analyticsEnabled?: boolean;
}>;
export declare const userProfileSummarySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    mediums: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    mediums?: string[];
}, {
    id?: string;
    name?: string;
    mediums?: string[];
}>;
export declare const userWithProfilesSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    emailVerified: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
} & {
    profiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        mediums: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        name?: string;
        mediums?: string[];
    }, {
        id?: string;
        name?: string;
        mediums?: string[];
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    id?: string;
    createdAt?: string;
    updatedAt?: string;
    name?: string;
    emailVerified?: boolean;
    profiles?: {
        id?: string;
        name?: string;
        mediums?: string[];
    }[];
}, {
    email?: string;
    id?: string;
    createdAt?: string;
    updatedAt?: string;
    name?: string;
    emailVerified?: boolean;
    profiles?: {
        id?: string;
        name?: string;
        mediums?: string[];
    }[];
}>;
export declare const apiKeySchema: z.ZodObject<{
    openaiApiKey: z.ZodOptional<z.ZodString>;
    anthropicApiKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    openaiApiKey?: string;
    anthropicApiKey?: string;
}, {
    openaiApiKey?: string;
    anthropicApiKey?: string;
}>;
export declare const fundingRangeSchema: z.ZodEffects<z.ZodObject<{
    minFunding: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    maxFunding: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
}, "strip", z.ZodTypeAny, {
    minFunding?: number;
    maxFunding?: number;
}, {
    minFunding?: string;
    maxFunding?: string;
}>, {
    minFunding?: number;
    maxFunding?: number;
}, {
    minFunding?: string;
    maxFunding?: string;
}>;
export declare const locationPreferencesSchema: z.ZodObject<{
    locations: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    locations?: string[];
}, {
    locations?: string[];
}>;
export declare const opportunityTypePreferencesSchema: z.ZodObject<{
    types: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    types?: string[];
}, {
    types?: string[];
}>;
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
