import { z } from 'zod';
export declare const sourceTypes: readonly ["websearch", "social", "bookmark", "newsletter", "manual"];
export type SourceType = typeof sourceTypes[number];
export declare const opportunityStatuses: readonly ["new", "reviewing", "applying", "submitted", "rejected", "archived"];
export type OpportunityStatus = typeof opportunityStatuses[number];
export declare const jobStatuses: readonly ["pending", "running", "completed", "failed", "cancelled"];
export type JobStatus = typeof jobStatuses[number];
export declare const opportunityDataSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    organization: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    url: z.ZodString;
    deadline: z.ZodOptional<z.ZodDate>;
    amount: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    sourceType: z.ZodEnum<["websearch", "social", "bookmark", "newsletter", "manual"]>;
    sourceUrl: z.ZodOptional<z.ZodString>;
    sourceMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    relevanceScore: z.ZodOptional<z.ZodNumber>;
    semanticScore: z.ZodOptional<z.ZodNumber>;
    keywordScore: z.ZodOptional<z.ZodNumber>;
    categoryScore: z.ZodOptional<z.ZodNumber>;
    aiServiceUsed: z.ZodOptional<z.ZodString>;
    processingTimeMs: z.ZodOptional<z.ZodNumber>;
    processed: z.ZodDefault<z.ZodBoolean>;
    status: z.ZodDefault<z.ZodEnum<["new", "reviewing", "applying", "submitted", "rejected", "archived"]>>;
    applied: z.ZodDefault<z.ZodBoolean>;
    notes: z.ZodOptional<z.ZodString>;
    starred: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    location?: string;
    id?: string;
    url?: string;
    title?: string;
    organization?: string;
    description?: string;
    status?: "new" | "rejected" | "reviewing" | "applying" | "submitted" | "archived";
    processingTimeMs?: number;
    aiServiceUsed?: string;
    sourceType?: "manual" | "social" | "websearch" | "bookmark" | "newsletter";
    deadline?: Date;
    amount?: string;
    tags?: string[];
    sourceUrl?: string;
    sourceMetadata?: Record<string, any>;
    relevanceScore?: number;
    semanticScore?: number;
    keywordScore?: number;
    categoryScore?: number;
    processed?: boolean;
    applied?: boolean;
    notes?: string;
    starred?: boolean;
}, {
    location?: string;
    id?: string;
    url?: string;
    title?: string;
    organization?: string;
    description?: string;
    status?: "new" | "rejected" | "reviewing" | "applying" | "submitted" | "archived";
    processingTimeMs?: number;
    aiServiceUsed?: string;
    sourceType?: "manual" | "social" | "websearch" | "bookmark" | "newsletter";
    deadline?: Date;
    amount?: string;
    tags?: string[];
    sourceUrl?: string;
    sourceMetadata?: Record<string, any>;
    relevanceScore?: number;
    semanticScore?: number;
    keywordScore?: number;
    categoryScore?: number;
    processed?: boolean;
    applied?: boolean;
    notes?: string;
    starred?: boolean;
}>;
export type OpportunityData = z.infer<typeof opportunityDataSchema>;
export declare const discoverySourceSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    type: z.ZodEnum<["websearch", "social", "bookmark", "newsletter", "manual"]>;
    url: z.ZodOptional<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    type?: "manual" | "social" | "websearch" | "bookmark" | "newsletter";
    id?: string;
    url?: string;
    enabled?: boolean;
    config?: Record<string, any>;
}, {
    name?: string;
    type?: "manual" | "social" | "websearch" | "bookmark" | "newsletter";
    id?: string;
    url?: string;
    enabled?: boolean;
    config?: Record<string, any>;
}>;
export type DiscoverySourceData = z.infer<typeof discoverySourceSchema>;
export declare const webSearchConfigSchema: z.ZodObject<{
    searchQueries: z.ZodArray<z.ZodString, "many">;
    providers: z.ZodArray<z.ZodEnum<["serpapi", "tavily", "bing", "perplexity"]>, "many">;
    maxResults: z.ZodDefault<z.ZodNumber>;
    language: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    language?: string;
    searchQueries?: string[];
    providers?: ("serpapi" | "tavily" | "bing" | "perplexity")[];
    maxResults?: number;
}, {
    language?: string;
    searchQueries?: string[];
    providers?: ("serpapi" | "tavily" | "bing" | "perplexity")[];
    maxResults?: number;
}>;
export declare const socialConfigSchema: z.ZodObject<{
    platform: z.ZodEnum<["twitter", "instagram", "linkedin", "threads"]>;
    hashtags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    accounts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    maxPosts: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    platform?: "twitter" | "instagram" | "linkedin" | "threads";
    keywords?: string[];
    hashtags?: string[];
    accounts?: string[];
    maxPosts?: number;
}, {
    platform?: "twitter" | "instagram" | "linkedin" | "threads";
    keywords?: string[];
    hashtags?: string[];
    accounts?: string[];
    maxPosts?: number;
}>;
export declare const bookmarkConfigSchema: z.ZodObject<{
    urls: z.ZodArray<z.ZodString, "many">;
    selectors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    frequency: z.ZodDefault<z.ZodEnum<["hourly", "daily", "weekly"]>>;
}, "strip", z.ZodTypeAny, {
    frequency?: "hourly" | "daily" | "weekly";
    urls?: string[];
    selectors?: Record<string, string>;
}, {
    frequency?: "hourly" | "daily" | "weekly";
    urls?: string[];
    selectors?: Record<string, string>;
}>;
export declare const newsletterConfigSchema: z.ZodObject<{
    senderEmails: z.ZodArray<z.ZodString, "many">;
    keywords: z.ZodArray<z.ZodString, "many">;
    processAttachments: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    keywords?: string[];
    senderEmails?: string[];
    processAttachments?: boolean;
}, {
    keywords?: string[];
    senderEmails?: string[];
    processAttachments?: boolean;
}>;
export declare const discoveryJobSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    sourceId: z.ZodOptional<z.ZodString>;
    sourceType: z.ZodEnum<["websearch", "social", "bookmark", "newsletter", "manual"]>;
    sourceName: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    metadata?: Record<string, any>;
    status?: "failed" | "completed" | "running" | "pending" | "cancelled";
    sourceType?: "manual" | "social" | "websearch" | "bookmark" | "newsletter";
    sourceId?: string;
    sourceName?: string;
}, {
    id?: string;
    metadata?: Record<string, any>;
    status?: "failed" | "completed" | "running" | "pending" | "cancelled";
    sourceType?: "manual" | "social" | "websearch" | "bookmark" | "newsletter";
    sourceId?: string;
    sourceName?: string;
}>;
export type DiscoveryJobData = z.infer<typeof discoveryJobSchema>;
export declare const aiServiceMetricsSchema: z.ZodObject<{
    serviceName: z.ZodEnum<["openai", "anthropic", "google", "huggingface", "local"]>;
    operation: z.ZodEnum<["embedding", "analysis", "search", "classification"]>;
    responseTimeMs: z.ZodNumber;
    success: z.ZodBoolean;
    costUsd: z.ZodOptional<z.ZodNumber>;
    qualityScore: z.ZodOptional<z.ZodNumber>;
    errorMessage: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    metadata?: Record<string, any>;
    success?: boolean;
    serviceName?: "openai" | "anthropic" | "google" | "huggingface" | "local";
    operation?: "search" | "embedding" | "analysis" | "classification";
    responseTimeMs?: number;
    costUsd?: number;
    qualityScore?: number;
    errorMessage?: string;
}, {
    metadata?: Record<string, any>;
    success?: boolean;
    serviceName?: "openai" | "anthropic" | "google" | "huggingface" | "local";
    operation?: "search" | "embedding" | "analysis" | "classification";
    responseTimeMs?: number;
    costUsd?: number;
    qualityScore?: number;
    errorMessage?: string;
}>;
export type AIServiceMetrics = z.infer<typeof aiServiceMetricsSchema>;
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
export declare class DiscoveryError extends Error {
    sourceType: SourceType;
    sourceName: string;
    metadata?: Record<string, any>;
    constructor(message: string, sourceType: SourceType, sourceName: string, metadata?: Record<string, any>);
}
export declare class AIServiceError extends Error {
    serviceName: string;
    operation: string;
    metadata?: Record<string, any>;
    constructor(message: string, serviceName: string, operation: string, metadata?: Record<string, any>);
}
export declare const validateOpportunityData: (data: unknown) => OpportunityData;
export declare const validateDiscoverySource: (data: unknown) => DiscoverySourceData;
export declare const validateDiscoveryJob: (data: unknown) => DiscoveryJobData;
