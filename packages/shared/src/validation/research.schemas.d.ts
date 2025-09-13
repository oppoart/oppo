import { z } from 'zod';
export declare const startServiceSchema: z.ZodObject<{
    serviceId: z.ZodEnum<["query-generation", "web-search", "llm-search", "social-media", "bookmarks", "newsletters"]>;
    profileId: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        maxQueries: z.ZodDefault<z.ZodNumber>;
        sources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
        query: z.ZodOptional<z.ZodString>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        priority: "low" | "medium" | "high";
        limit: number;
        maxQueries: number;
        query?: string | undefined;
        sources?: string[] | undefined;
    }, {
        query?: string | undefined;
        priority?: "low" | "medium" | "high" | undefined;
        limit?: number | undefined;
        maxQueries?: number | undefined;
        sources?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    profileId: string;
    serviceId: "social-media" | "query-generation" | "web-search" | "llm-search" | "bookmarks" | "newsletters";
    options?: {
        priority: "low" | "medium" | "high";
        limit: number;
        maxQueries: number;
        query?: string | undefined;
        sources?: string[] | undefined;
    } | undefined;
}, {
    profileId: string;
    serviceId: "social-media" | "query-generation" | "web-search" | "llm-search" | "bookmarks" | "newsletters";
    options?: {
        query?: string | undefined;
        priority?: "low" | "medium" | "high" | undefined;
        limit?: number | undefined;
        maxQueries?: number | undefined;
        sources?: string[] | undefined;
    } | undefined;
}>;
export declare const stopServiceSchema: z.ZodObject<{
    serviceId: z.ZodString;
    sessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    serviceId: string;
    sessionId: string;
}, {
    serviceId: string;
    sessionId: string;
}>;
export declare const exportSchema: z.ZodObject<{
    profileId: z.ZodString;
    serviceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    format: z.ZodDefault<z.ZodEnum<["json", "csv"]>>;
}, "strip", z.ZodTypeAny, {
    profileId: string;
    format: "json" | "csv";
    serviceIds?: string[] | undefined;
}, {
    profileId: string;
    format?: "json" | "csv" | undefined;
    serviceIds?: string[] | undefined;
}>;
export declare const fetchOpportunitiesSchema: z.ZodObject<{
    searchTerms: z.ZodOptional<z.ZodString>;
    types: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    minRelevanceScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    types?: string[] | undefined;
    minRelevanceScore?: number | undefined;
    searchTerms?: string | undefined;
}, {
    types?: string[] | undefined;
    minRelevanceScore?: number | undefined;
    searchTerms?: string | undefined;
}>;
export declare const queryGenerationOptionsSchema: z.ZodObject<{
    maxQueries: z.ZodDefault<z.ZodNumber>;
    sourceTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["websearch", "social", "bookmark", "newsletter"]>, "many">>;
    profileId: z.ZodString;
    style: z.ZodDefault<z.ZodEnum<["focused", "diverse", "creative"]>>;
}, "strip", z.ZodTypeAny, {
    style: "focused" | "diverse" | "creative";
    profileId: string;
    maxQueries: number;
    sourceTypes: ("websearch" | "social" | "bookmark" | "newsletter")[];
}, {
    profileId: string;
    style?: "focused" | "diverse" | "creative" | undefined;
    maxQueries?: number | undefined;
    sourceTypes?: ("websearch" | "social" | "bookmark" | "newsletter")[] | undefined;
}>;
export declare const searchOptionsSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    offset: number;
    source?: string | undefined;
}, {
    query: string;
    limit?: number | undefined;
    source?: string | undefined;
    offset?: number | undefined;
}>;
export declare const sessionStatusSchema: z.ZodObject<{
    sessionId: z.ZodString;
    serviceId: z.ZodString;
    status: z.ZodEnum<["running", "completed", "error", "stopped"]>;
    progress: z.ZodNumber;
    resultsCount: z.ZodNumber;
    error: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "error" | "completed" | "running" | "stopped";
    updatedAt: string;
    serviceId: string;
    sessionId: string;
    progress: number;
    resultsCount: number;
    startedAt: string;
    error?: string | undefined;
}, {
    status: "error" | "completed" | "running" | "stopped";
    updatedAt: string;
    serviceId: string;
    sessionId: string;
    progress: number;
    resultsCount: number;
    startedAt: string;
    error?: string | undefined;
}>;
export declare const resultPaginationSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    offset: z.ZodDefault<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
}, {
    limit?: string | undefined;
    offset?: string | undefined;
}>;
export declare const sessionMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    serviceId: z.ZodString;
    profileId: z.ZodString;
    status: z.ZodEnum<["running", "completed", "error", "stopped"]>;
    progress: z.ZodNumber;
    results: z.ZodArray<z.ZodAny, "many">;
    error: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "error" | "completed" | "running" | "stopped";
    id: string;
    updatedAt: Date;
    profileId: string;
    serviceId: string;
    progress: number;
    startedAt: Date;
    results: any[];
    error?: string | undefined;
}, {
    status: "error" | "completed" | "running" | "stopped";
    id: string;
    updatedAt: Date;
    profileId: string;
    serviceId: string;
    progress: number;
    startedAt: Date;
    results: any[];
    error?: string | undefined;
}>;
export declare const llmInsightSchema: z.ZodObject<{
    insight: z.ZodString;
    confidence: z.ZodNumber;
    sources: z.ZodArray<z.ZodString, "many">;
    relevantOpportunities: z.ZodNumber;
    type: z.ZodOptional<z.ZodEnum<["trend", "opportunity", "analysis", "prediction"]>>;
}, "strip", z.ZodTypeAny, {
    insight: string;
    sources: string[];
    confidence: number;
    relevantOpportunities: number;
    type?: "opportunity" | "trend" | "analysis" | "prediction" | undefined;
}, {
    insight: string;
    sources: string[];
    confidence: number;
    relevantOpportunities: number;
    type?: "opportunity" | "trend" | "analysis" | "prediction" | undefined;
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
    url: string;
    timestamp: string;
    platform: string;
    content: string;
    engagement: number;
    author: string;
    relevanceScore?: number | undefined;
}, {
    url: string;
    timestamp: string;
    platform: string;
    content: string;
    engagement: number;
    author: string;
    relevanceScore?: number | undefined;
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
    url: string;
    title: string;
    description: string;
    tags: string[];
    category: string;
    savedDate: string;
    relevanceScore?: number | undefined;
}, {
    url: string;
    title: string;
    description: string;
    tags: string[];
    category: string;
    savedDate: string;
    relevanceScore?: number | undefined;
}>;
export declare const newsletterSchema: z.ZodObject<{
    subject: z.ZodString;
    sender: z.ZodString;
    date: z.ZodString;
    content: z.ZodString;
    opportunities: z.ZodNumber;
    relevanceScore: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    date: string;
    opportunities: number;
    relevanceScore: number;
    content: string;
    subject: string;
    sender: string;
}, {
    date: string;
    opportunities: number;
    relevanceScore: number;
    content: string;
    subject: string;
    sender: string;
}>;
export declare const webSearchResultSchema: z.ZodObject<{
    title: z.ZodString;
    url: z.ZodString;
    snippet: z.ZodString;
    source: z.ZodString;
    relevance: z.ZodNumber;
    publishedDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    title: string;
    source: string;
    snippet: string;
    relevance: number;
    publishedDate?: string | undefined;
}, {
    url: string;
    title: string;
    source: string;
    snippet: string;
    relevance: number;
    publishedDate?: string | undefined;
}>;
export declare const bulkResearchSchema: z.ZodObject<{
    services: z.ZodArray<z.ZodString, "many">;
    profileIds: z.ZodArray<z.ZodString, "many">;
    options: z.ZodOptional<z.ZodObject<{
        maxQueries: z.ZodDefault<z.ZodNumber>;
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
    }, "strip", z.ZodTypeAny, {
        priority: "low" | "medium" | "high";
        maxQueries: number;
    }, {
        priority?: "low" | "medium" | "high" | undefined;
        maxQueries?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    services: string[];
    profileIds: string[];
    options?: {
        priority: "low" | "medium" | "high";
        maxQueries: number;
    } | undefined;
}, {
    services: string[];
    profileIds: string[];
    options?: {
        priority?: "low" | "medium" | "high" | undefined;
        maxQueries?: number | undefined;
    } | undefined;
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
//# sourceMappingURL=research.schemas.d.ts.map