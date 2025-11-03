import { z } from 'zod';
export declare const startServiceSchema: z.ZodObject<{
    serviceId: z.ZodEnum<["QUERY_GENERATION", "WEB_SEARCH", "LLM_SEARCH", "SOCIAL_MEDIA", "BOOKMARKS", "NEWSLETTERS"]>;
    profileId: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        maxQueries: z.ZodDefault<z.ZodNumber>;
        sources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
        query: z.ZodOptional<z.ZodString>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        query?: string;
        maxQueries?: number;
        priority?: "high" | "medium" | "low";
        sources?: string[];
        limit?: number;
    }, {
        query?: string;
        maxQueries?: number;
        priority?: "high" | "medium" | "low";
        sources?: string[];
        limit?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    profileId?: string;
    options?: {
        query?: string;
        maxQueries?: number;
        priority?: "high" | "medium" | "low";
        sources?: string[];
        limit?: number;
    };
    serviceId?: "SOCIAL_MEDIA" | "WEB_SEARCH" | "LLM_SEARCH" | "NEWSLETTERS" | "QUERY_GENERATION" | "BOOKMARKS";
}, {
    profileId?: string;
    options?: {
        query?: string;
        maxQueries?: number;
        priority?: "high" | "medium" | "low";
        sources?: string[];
        limit?: number;
    };
    serviceId?: "SOCIAL_MEDIA" | "WEB_SEARCH" | "LLM_SEARCH" | "NEWSLETTERS" | "QUERY_GENERATION" | "BOOKMARKS";
}>;
export declare const stopServiceSchema: z.ZodObject<{
    serviceId: z.ZodString;
    sessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionId?: string;
    serviceId?: string;
}, {
    sessionId?: string;
    serviceId?: string;
}>;
export declare const exportSchema: z.ZodObject<{
    profileId: z.ZodString;
    serviceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    format: z.ZodDefault<z.ZodEnum<["json", "csv"]>>;
}, "strip", z.ZodTypeAny, {
    format?: "json" | "csv";
    profileId?: string;
    serviceIds?: string[];
}, {
    format?: "json" | "csv";
    profileId?: string;
    serviceIds?: string[];
}>;
export declare const fetchOpportunitiesSchema: z.ZodObject<{
    searchTerms: z.ZodOptional<z.ZodString>;
    types: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    minRelevanceScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    types?: string[];
    minRelevanceScore?: number;
    searchTerms?: string;
}, {
    types?: string[];
    minRelevanceScore?: number;
    searchTerms?: string;
}>;
export declare const queryGenerationOptionsSchema: z.ZodObject<{
    maxQueries: z.ZodDefault<z.ZodNumber>;
    sourceTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["websearch", "social", "bookmark", "newsletter"]>, "many">>;
    profileId: z.ZodString;
    style: z.ZodDefault<z.ZodEnum<["focused", "diverse", "creative"]>>;
}, "strip", z.ZodTypeAny, {
    profileId?: string;
    maxQueries?: number;
    style?: "focused" | "diverse" | "creative";
    sourceTypes?: ("bookmark" | "social" | "websearch" | "newsletter")[];
}, {
    profileId?: string;
    maxQueries?: number;
    style?: "focused" | "diverse" | "creative";
    sourceTypes?: ("bookmark" | "social" | "websearch" | "newsletter")[];
}>;
export declare const searchOptionsSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    source?: string;
    limit?: number;
    offset?: number;
}, {
    query?: string;
    source?: string;
    limit?: number;
    offset?: number;
}>;
export declare const sessionStatusSchema: z.ZodObject<{
    sessionId: z.ZodString;
    serviceId: z.ZodString;
    status: z.ZodEnum<["RUNNING", "COMPLETED", "ERROR", "STOPPED"]>;
    progress: z.ZodNumber;
    resultsCount: z.ZodNumber;
    error: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error?: string;
    updatedAt?: string;
    status?: "RUNNING" | "COMPLETED" | "STOPPED" | "ERROR";
    sessionId?: string;
    progress?: number;
    resultsCount?: number;
    serviceId?: string;
    startedAt?: string;
}, {
    error?: string;
    updatedAt?: string;
    status?: "RUNNING" | "COMPLETED" | "STOPPED" | "ERROR";
    sessionId?: string;
    progress?: number;
    resultsCount?: number;
    serviceId?: string;
    startedAt?: string;
}>;
export declare const resultPaginationSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    offset: z.ZodDefault<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    offset?: number;
}, {
    limit?: string;
    offset?: string;
}>;
export declare const sessionMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    serviceId: z.ZodString;
    profileId: z.ZodString;
    status: z.ZodEnum<["RUNNING", "COMPLETED", "ERROR", "STOPPED"]>;
    progress: z.ZodNumber;
    results: z.ZodArray<z.ZodAny, "many">;
    error: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    error?: string;
    id?: string;
    updatedAt?: Date;
    profileId?: string;
    status?: "RUNNING" | "COMPLETED" | "STOPPED" | "ERROR";
    results?: any[];
    progress?: number;
    serviceId?: string;
    startedAt?: Date;
}, {
    error?: string;
    id?: string;
    updatedAt?: Date;
    profileId?: string;
    status?: "RUNNING" | "COMPLETED" | "STOPPED" | "ERROR";
    results?: any[];
    progress?: number;
    serviceId?: string;
    startedAt?: Date;
}>;
export declare const llmInsightSchema: z.ZodObject<{
    insight: z.ZodString;
    confidence: z.ZodNumber;
    sources: z.ZodArray<z.ZodString, "many">;
    relevantOpportunities: z.ZodNumber;
    type: z.ZodOptional<z.ZodEnum<["trend", "opportunity", "analysis", "prediction"]>>;
}, "strip", z.ZodTypeAny, {
    type?: "opportunity" | "analysis" | "trend" | "prediction";
    confidence?: number;
    sources?: string[];
    insight?: string;
    relevantOpportunities?: number;
}, {
    type?: "opportunity" | "analysis" | "trend" | "prediction";
    confidence?: number;
    sources?: string[];
    insight?: string;
    relevantOpportunities?: number;
}>;
export declare const socialMentionSchema: z.ZodObject<{
    platform: z.ZodString;
    content: z.ZodString;
    engagement: z.ZodNumber;
    url: z.ZodString;
    author: z.ZodString;
    timestamp: z.ZodString;
    relevanceScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    content?: string;
    relevanceScore?: number;
    url?: string;
    timestamp?: string;
    platform?: string;
    engagement?: number;
    author?: string;
}, {
    content?: string;
    relevanceScore?: number;
    url?: string;
    timestamp?: string;
    platform?: string;
    engagement?: number;
    author?: string;
}>;
export declare const bookmarkSchema: z.ZodObject<{
    title: z.ZodString;
    url: z.ZodString;
    category: z.ZodString;
    savedDate: z.ZodString;
    tags: z.ZodArray<z.ZodString, "many">;
    description: z.ZodString;
    relevanceScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    tags?: string[];
    description?: string;
    title?: string;
    relevanceScore?: number;
    url?: string;
    category?: string;
    savedDate?: string;
}, {
    tags?: string[];
    description?: string;
    title?: string;
    relevanceScore?: number;
    url?: string;
    category?: string;
    savedDate?: string;
}>;
export declare const newsletterSchema: z.ZodObject<{
    subject: z.ZodString;
    sender: z.ZodString;
    date: z.ZodString;
    content: z.ZodString;
    opportunities: z.ZodNumber;
    relevanceScore: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    content?: string;
    date?: string;
    opportunities?: number;
    relevanceScore?: number;
    subject?: string;
    sender?: string;
}, {
    content?: string;
    date?: string;
    opportunities?: number;
    relevanceScore?: number;
    subject?: string;
    sender?: string;
}>;
export declare const webSearchResultSchema: z.ZodObject<{
    title: z.ZodString;
    url: z.ZodString;
    snippet: z.ZodString;
    source: z.ZodString;
    relevance: z.ZodNumber;
    publishedDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title?: string;
    url?: string;
    source?: string;
    snippet?: string;
    relevance?: number;
    publishedDate?: string;
}, {
    title?: string;
    url?: string;
    source?: string;
    snippet?: string;
    relevance?: number;
    publishedDate?: string;
}>;
export declare const bulkResearchSchema: z.ZodObject<{
    services: z.ZodArray<z.ZodString, "many">;
    profileIds: z.ZodArray<z.ZodString, "many">;
    options: z.ZodOptional<z.ZodObject<{
        maxQueries: z.ZodDefault<z.ZodNumber>;
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
    }, "strip", z.ZodTypeAny, {
        maxQueries?: number;
        priority?: "high" | "medium" | "low";
    }, {
        maxQueries?: number;
        priority?: "high" | "medium" | "low";
    }>>;
}, "strip", z.ZodTypeAny, {
    options?: {
        maxQueries?: number;
        priority?: "high" | "medium" | "low";
    };
    services?: string[];
    profileIds?: string[];
}, {
    options?: {
        maxQueries?: number;
        priority?: "high" | "medium" | "low";
    };
    services?: string[];
    profileIds?: string[];
}>;
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
