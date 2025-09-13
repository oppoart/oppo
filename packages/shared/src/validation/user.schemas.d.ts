import { z } from 'zod';
export declare const userBaseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    emailVerified: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    id: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    name?: string | undefined;
}, {
    email: string;
    id: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    name?: string | undefined;
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
    preferredLocations: string[];
    opportunityTypes: string[];
    emailNotifications: boolean;
    pushNotifications: boolean;
    notificationFrequency: "immediate" | "daily" | "weekly";
    minimumMatchScore: number;
    enableAutoApplication: boolean;
    applicationStyle: "formal" | "casual" | "artistic";
    includePortfolioLinks: boolean;
    aiProvider: "openai" | "anthropic";
    aiModel: string;
    aiTemperature: number;
    aiMaxTokens: number;
    enableQueryCache: boolean;
    enableAnalysisCache: boolean;
    queryGenerationStyle: "focused" | "diverse" | "creative";
    minFundingAmount?: number | undefined;
    maxFundingAmount?: number | undefined;
    openaiApiKey?: string | undefined;
    anthropicApiKey?: string | undefined;
    webhookUrl?: string | undefined;
}, {
    minFundingAmount?: number | undefined;
    maxFundingAmount?: number | undefined;
    preferredLocations?: string[] | undefined;
    opportunityTypes?: string[] | undefined;
    emailNotifications?: boolean | undefined;
    pushNotifications?: boolean | undefined;
    notificationFrequency?: "immediate" | "daily" | "weekly" | undefined;
    minimumMatchScore?: number | undefined;
    enableAutoApplication?: boolean | undefined;
    applicationStyle?: "formal" | "casual" | "artistic" | undefined;
    includePortfolioLinks?: boolean | undefined;
    aiProvider?: "openai" | "anthropic" | undefined;
    aiModel?: string | undefined;
    aiTemperature?: number | undefined;
    aiMaxTokens?: number | undefined;
    enableQueryCache?: boolean | undefined;
    enableAnalysisCache?: boolean | undefined;
    queryGenerationStyle?: "focused" | "diverse" | "creative" | undefined;
    openaiApiKey?: string | undefined;
    anthropicApiKey?: string | undefined;
    webhookUrl?: string | undefined;
}>, {
    preferredLocations: string[];
    opportunityTypes: string[];
    emailNotifications: boolean;
    pushNotifications: boolean;
    notificationFrequency: "immediate" | "daily" | "weekly";
    minimumMatchScore: number;
    enableAutoApplication: boolean;
    applicationStyle: "formal" | "casual" | "artistic";
    includePortfolioLinks: boolean;
    aiProvider: "openai" | "anthropic";
    aiModel: string;
    aiTemperature: number;
    aiMaxTokens: number;
    enableQueryCache: boolean;
    enableAnalysisCache: boolean;
    queryGenerationStyle: "focused" | "diverse" | "creative";
    minFundingAmount?: number | undefined;
    maxFundingAmount?: number | undefined;
    openaiApiKey?: string | undefined;
    anthropicApiKey?: string | undefined;
    webhookUrl?: string | undefined;
}, {
    minFundingAmount?: number | undefined;
    maxFundingAmount?: number | undefined;
    preferredLocations?: string[] | undefined;
    opportunityTypes?: string[] | undefined;
    emailNotifications?: boolean | undefined;
    pushNotifications?: boolean | undefined;
    notificationFrequency?: "immediate" | "daily" | "weekly" | undefined;
    minimumMatchScore?: number | undefined;
    enableAutoApplication?: boolean | undefined;
    applicationStyle?: "formal" | "casual" | "artistic" | undefined;
    includePortfolioLinks?: boolean | undefined;
    aiProvider?: "openai" | "anthropic" | undefined;
    aiModel?: string | undefined;
    aiTemperature?: number | undefined;
    aiMaxTokens?: number | undefined;
    enableQueryCache?: boolean | undefined;
    enableAnalysisCache?: boolean | undefined;
    queryGenerationStyle?: "focused" | "diverse" | "creative" | undefined;
    openaiApiKey?: string | undefined;
    anthropicApiKey?: string | undefined;
    webhookUrl?: string | undefined;
}>;
export declare const userSettingsSchema: z.ZodObject<{
    theme: z.ZodDefault<z.ZodEnum<["light", "dark", "system"]>>;
    language: z.ZodDefault<z.ZodString>;
    timezone: z.ZodDefault<z.ZodString>;
    compactMode: z.ZodDefault<z.ZodBoolean>;
    showWelcomeTour: z.ZodDefault<z.ZodBoolean>;
    analyticsEnabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    theme: "light" | "dark" | "system";
    language: string;
    timezone: string;
    compactMode: boolean;
    showWelcomeTour: boolean;
    analyticsEnabled: boolean;
}, {
    theme?: "light" | "dark" | "system" | undefined;
    language?: string | undefined;
    timezone?: string | undefined;
    compactMode?: boolean | undefined;
    showWelcomeTour?: boolean | undefined;
    analyticsEnabled?: boolean | undefined;
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
        email: string;
        id: string;
        emailVerified: boolean;
        createdAt: string;
        updatedAt: string;
        name?: string | undefined;
    }, {
        email: string;
        id: string;
        emailVerified: boolean;
        createdAt: string;
        updatedAt: string;
        name?: string | undefined;
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
        preferredLocations: string[];
        opportunityTypes: string[];
        emailNotifications: boolean;
        pushNotifications: boolean;
        notificationFrequency: "immediate" | "daily" | "weekly";
        minimumMatchScore: number;
        enableAutoApplication: boolean;
        applicationStyle: "formal" | "casual" | "artistic";
        includePortfolioLinks: boolean;
        aiProvider: "openai" | "anthropic";
        aiModel: string;
        aiTemperature: number;
        aiMaxTokens: number;
        enableQueryCache: boolean;
        enableAnalysisCache: boolean;
        queryGenerationStyle: "focused" | "diverse" | "creative";
        minFundingAmount?: number | undefined;
        maxFundingAmount?: number | undefined;
        openaiApiKey?: string | undefined;
        anthropicApiKey?: string | undefined;
        webhookUrl?: string | undefined;
    }, {
        minFundingAmount?: number | undefined;
        maxFundingAmount?: number | undefined;
        preferredLocations?: string[] | undefined;
        opportunityTypes?: string[] | undefined;
        emailNotifications?: boolean | undefined;
        pushNotifications?: boolean | undefined;
        notificationFrequency?: "immediate" | "daily" | "weekly" | undefined;
        minimumMatchScore?: number | undefined;
        enableAutoApplication?: boolean | undefined;
        applicationStyle?: "formal" | "casual" | "artistic" | undefined;
        includePortfolioLinks?: boolean | undefined;
        aiProvider?: "openai" | "anthropic" | undefined;
        aiModel?: string | undefined;
        aiTemperature?: number | undefined;
        aiMaxTokens?: number | undefined;
        enableQueryCache?: boolean | undefined;
        enableAnalysisCache?: boolean | undefined;
        queryGenerationStyle?: "focused" | "diverse" | "creative" | undefined;
        openaiApiKey?: string | undefined;
        anthropicApiKey?: string | undefined;
        webhookUrl?: string | undefined;
    }>, {
        preferredLocations: string[];
        opportunityTypes: string[];
        emailNotifications: boolean;
        pushNotifications: boolean;
        notificationFrequency: "immediate" | "daily" | "weekly";
        minimumMatchScore: number;
        enableAutoApplication: boolean;
        applicationStyle: "formal" | "casual" | "artistic";
        includePortfolioLinks: boolean;
        aiProvider: "openai" | "anthropic";
        aiModel: string;
        aiTemperature: number;
        aiMaxTokens: number;
        enableQueryCache: boolean;
        enableAnalysisCache: boolean;
        queryGenerationStyle: "focused" | "diverse" | "creative";
        minFundingAmount?: number | undefined;
        maxFundingAmount?: number | undefined;
        openaiApiKey?: string | undefined;
        anthropicApiKey?: string | undefined;
        webhookUrl?: string | undefined;
    }, {
        minFundingAmount?: number | undefined;
        maxFundingAmount?: number | undefined;
        preferredLocations?: string[] | undefined;
        opportunityTypes?: string[] | undefined;
        emailNotifications?: boolean | undefined;
        pushNotifications?: boolean | undefined;
        notificationFrequency?: "immediate" | "daily" | "weekly" | undefined;
        minimumMatchScore?: number | undefined;
        enableAutoApplication?: boolean | undefined;
        applicationStyle?: "formal" | "casual" | "artistic" | undefined;
        includePortfolioLinks?: boolean | undefined;
        aiProvider?: "openai" | "anthropic" | undefined;
        aiModel?: string | undefined;
        aiTemperature?: number | undefined;
        aiMaxTokens?: number | undefined;
        enableQueryCache?: boolean | undefined;
        enableAnalysisCache?: boolean | undefined;
        queryGenerationStyle?: "focused" | "diverse" | "creative" | undefined;
        openaiApiKey?: string | undefined;
        anthropicApiKey?: string | undefined;
        webhookUrl?: string | undefined;
    }>;
    settings: z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<["light", "dark", "system"]>>;
        language: z.ZodDefault<z.ZodString>;
        timezone: z.ZodDefault<z.ZodString>;
        compactMode: z.ZodDefault<z.ZodBoolean>;
        showWelcomeTour: z.ZodDefault<z.ZodBoolean>;
        analyticsEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        theme: "light" | "dark" | "system";
        language: string;
        timezone: string;
        compactMode: boolean;
        showWelcomeTour: boolean;
        analyticsEnabled: boolean;
    }, {
        theme?: "light" | "dark" | "system" | undefined;
        language?: string | undefined;
        timezone?: string | undefined;
        compactMode?: boolean | undefined;
        showWelcomeTour?: boolean | undefined;
        analyticsEnabled?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    user: {
        email: string;
        id: string;
        emailVerified: boolean;
        createdAt: string;
        updatedAt: string;
        name?: string | undefined;
    };
    preferences: {
        preferredLocations: string[];
        opportunityTypes: string[];
        emailNotifications: boolean;
        pushNotifications: boolean;
        notificationFrequency: "immediate" | "daily" | "weekly";
        minimumMatchScore: number;
        enableAutoApplication: boolean;
        applicationStyle: "formal" | "casual" | "artistic";
        includePortfolioLinks: boolean;
        aiProvider: "openai" | "anthropic";
        aiModel: string;
        aiTemperature: number;
        aiMaxTokens: number;
        enableQueryCache: boolean;
        enableAnalysisCache: boolean;
        queryGenerationStyle: "focused" | "diverse" | "creative";
        minFundingAmount?: number | undefined;
        maxFundingAmount?: number | undefined;
        openaiApiKey?: string | undefined;
        anthropicApiKey?: string | undefined;
        webhookUrl?: string | undefined;
    };
    settings: {
        theme: "light" | "dark" | "system";
        language: string;
        timezone: string;
        compactMode: boolean;
        showWelcomeTour: boolean;
        analyticsEnabled: boolean;
    };
}, {
    user: {
        email: string;
        id: string;
        emailVerified: boolean;
        createdAt: string;
        updatedAt: string;
        name?: string | undefined;
    };
    preferences: {
        minFundingAmount?: number | undefined;
        maxFundingAmount?: number | undefined;
        preferredLocations?: string[] | undefined;
        opportunityTypes?: string[] | undefined;
        emailNotifications?: boolean | undefined;
        pushNotifications?: boolean | undefined;
        notificationFrequency?: "immediate" | "daily" | "weekly" | undefined;
        minimumMatchScore?: number | undefined;
        enableAutoApplication?: boolean | undefined;
        applicationStyle?: "formal" | "casual" | "artistic" | undefined;
        includePortfolioLinks?: boolean | undefined;
        aiProvider?: "openai" | "anthropic" | undefined;
        aiModel?: string | undefined;
        aiTemperature?: number | undefined;
        aiMaxTokens?: number | undefined;
        enableQueryCache?: boolean | undefined;
        enableAnalysisCache?: boolean | undefined;
        queryGenerationStyle?: "focused" | "diverse" | "creative" | undefined;
        openaiApiKey?: string | undefined;
        anthropicApiKey?: string | undefined;
        webhookUrl?: string | undefined;
    };
    settings: {
        theme?: "light" | "dark" | "system" | undefined;
        language?: string | undefined;
        timezone?: string | undefined;
        compactMode?: boolean | undefined;
        showWelcomeTour?: boolean | undefined;
        analyticsEnabled?: boolean | undefined;
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
    minFundingAmount?: number | undefined;
    maxFundingAmount?: number | undefined;
    preferredLocations?: string[] | undefined;
    opportunityTypes?: string[] | undefined;
    emailNotifications?: boolean | undefined;
    pushNotifications?: boolean | undefined;
    notificationFrequency?: "immediate" | "daily" | "weekly" | undefined;
    minimumMatchScore?: number | undefined;
    enableAutoApplication?: boolean | undefined;
    applicationStyle?: "formal" | "casual" | "artistic" | undefined;
    includePortfolioLinks?: boolean | undefined;
    aiProvider?: "openai" | "anthropic" | undefined;
    aiModel?: string | undefined;
    aiTemperature?: number | undefined;
    aiMaxTokens?: number | undefined;
    enableQueryCache?: boolean | undefined;
    enableAnalysisCache?: boolean | undefined;
    queryGenerationStyle?: "focused" | "diverse" | "creative" | undefined;
    openaiApiKey?: string | undefined;
    anthropicApiKey?: string | undefined;
    webhookUrl?: string | undefined;
}, {
    minFundingAmount?: number | undefined;
    maxFundingAmount?: number | undefined;
    preferredLocations?: string[] | undefined;
    opportunityTypes?: string[] | undefined;
    emailNotifications?: boolean | undefined;
    pushNotifications?: boolean | undefined;
    notificationFrequency?: "immediate" | "daily" | "weekly" | undefined;
    minimumMatchScore?: number | undefined;
    enableAutoApplication?: boolean | undefined;
    applicationStyle?: "formal" | "casual" | "artistic" | undefined;
    includePortfolioLinks?: boolean | undefined;
    aiProvider?: "openai" | "anthropic" | undefined;
    aiModel?: string | undefined;
    aiTemperature?: number | undefined;
    aiMaxTokens?: number | undefined;
    enableQueryCache?: boolean | undefined;
    enableAnalysisCache?: boolean | undefined;
    queryGenerationStyle?: "focused" | "diverse" | "creative" | undefined;
    openaiApiKey?: string | undefined;
    anthropicApiKey?: string | undefined;
    webhookUrl?: string | undefined;
}>;
export declare const updateSettingsSchema: z.ZodObject<{
    theme: z.ZodOptional<z.ZodDefault<z.ZodEnum<["light", "dark", "system"]>>>;
    language: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    timezone: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    compactMode: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    showWelcomeTour: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    analyticsEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    theme?: "light" | "dark" | "system" | undefined;
    language?: string | undefined;
    timezone?: string | undefined;
    compactMode?: boolean | undefined;
    showWelcomeTour?: boolean | undefined;
    analyticsEnabled?: boolean | undefined;
}, {
    theme?: "light" | "dark" | "system" | undefined;
    language?: string | undefined;
    timezone?: string | undefined;
    compactMode?: boolean | undefined;
    showWelcomeTour?: boolean | undefined;
    analyticsEnabled?: boolean | undefined;
}>;
export declare const userProfileSummarySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    mediums: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    mediums: string[];
}, {
    id: string;
    name: string;
    mediums: string[];
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
        id: string;
        name: string;
        mediums: string[];
    }, {
        id: string;
        name: string;
        mediums: string[];
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    email: string;
    id: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    name?: string | undefined;
    profiles?: {
        id: string;
        name: string;
        mediums: string[];
    }[] | undefined;
}, {
    email: string;
    id: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    name?: string | undefined;
    profiles?: {
        id: string;
        name: string;
        mediums: string[];
    }[] | undefined;
}>;
export declare const apiKeySchema: z.ZodObject<{
    openaiApiKey: z.ZodOptional<z.ZodString>;
    anthropicApiKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    openaiApiKey?: string | undefined;
    anthropicApiKey?: string | undefined;
}, {
    openaiApiKey?: string | undefined;
    anthropicApiKey?: string | undefined;
}>;
export declare const fundingRangeSchema: z.ZodEffects<z.ZodObject<{
    minFunding: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number | undefined, string>, number | undefined, string>>;
    maxFunding: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number | undefined, string>, number | undefined, string>>;
}, "strip", z.ZodTypeAny, {
    minFunding?: number | undefined;
    maxFunding?: number | undefined;
}, {
    minFunding?: string | undefined;
    maxFunding?: string | undefined;
}>, {
    minFunding?: number | undefined;
    maxFunding?: number | undefined;
}, {
    minFunding?: string | undefined;
    maxFunding?: string | undefined;
}>;
export declare const locationPreferencesSchema: z.ZodObject<{
    locations: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    locations: string[];
}, {
    locations: string[];
}>;
export declare const opportunityTypePreferencesSchema: z.ZodObject<{
    types: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    types: string[];
}, {
    types: string[];
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
//# sourceMappingURL=user.schemas.d.ts.map