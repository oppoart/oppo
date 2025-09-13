"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkResearchSchema = exports.webSearchResultSchema = exports.newsletterSchema = exports.bookmarkSchema = exports.socialMentionSchema = exports.llmInsightSchema = exports.sessionMetadataSchema = exports.resultPaginationSchema = exports.sessionStatusSchema = exports.searchOptionsSchema = exports.queryGenerationOptionsSchema = exports.fetchOpportunitiesSchema = exports.exportSchema = exports.stopServiceSchema = exports.startServiceSchema = void 0;
const zod_1 = require("zod");
const research_constants_1 = require("../constants/research.constants");
exports.startServiceSchema = zod_1.z.object({
    serviceId: zod_1.z.enum([
        research_constants_1.RESEARCH_SERVICES.QUERY_GENERATION,
        research_constants_1.RESEARCH_SERVICES.WEB_SEARCH,
        research_constants_1.RESEARCH_SERVICES.LLM_SEARCH,
        research_constants_1.RESEARCH_SERVICES.SOCIAL_MEDIA,
        research_constants_1.RESEARCH_SERVICES.BOOKMARKS,
        research_constants_1.RESEARCH_SERVICES.NEWSLETTERS,
    ]),
    profileId: zod_1.z.string().uuid(),
    options: zod_1.z.object({
        maxQueries: zod_1.z.number().int().positive().max(50).default(research_constants_1.DEFAULT_RESEARCH_OPTIONS.MAX_QUERIES),
        sources: zod_1.z.array(zod_1.z.string()).optional(),
        priority: zod_1.z.enum([
            research_constants_1.RESEARCH_PRIORITIES.LOW,
            research_constants_1.RESEARCH_PRIORITIES.MEDIUM,
            research_constants_1.RESEARCH_PRIORITIES.HIGH,
        ]).default(research_constants_1.RESEARCH_PRIORITIES.MEDIUM),
        query: zod_1.z.string().optional(),
        limit: zod_1.z.number().int().positive().max(100).default(research_constants_1.DEFAULT_RESEARCH_OPTIONS.SEARCH_LIMIT),
    }).optional(),
});
exports.stopServiceSchema = zod_1.z.object({
    serviceId: zod_1.z.string(),
    sessionId: zod_1.z.string(),
});
exports.exportSchema = zod_1.z.object({
    profileId: zod_1.z.string().uuid(),
    serviceIds: zod_1.z.array(zod_1.z.string()).optional(),
    format: zod_1.z.enum([
        research_constants_1.RESEARCH_EXPORT_FORMATS.JSON,
        research_constants_1.RESEARCH_EXPORT_FORMATS.CSV,
    ]).default(research_constants_1.RESEARCH_EXPORT_FORMATS.JSON),
});
exports.fetchOpportunitiesSchema = zod_1.z.object({
    searchTerms: zod_1.z.string().optional(),
    types: zod_1.z.array(zod_1.z.string()).optional(),
    minRelevanceScore: zod_1.z.number().min(0).max(1).optional(),
});
exports.queryGenerationOptionsSchema = zod_1.z.object({
    maxQueries: zod_1.z.number().int().positive().max(50).default(research_constants_1.DEFAULT_RESEARCH_OPTIONS.MAX_QUERIES),
    sourceTypes: zod_1.z.array(zod_1.z.enum([
        research_constants_1.SOURCE_TYPES.WEBSEARCH,
        research_constants_1.SOURCE_TYPES.SOCIAL,
        research_constants_1.SOURCE_TYPES.BOOKMARK,
        research_constants_1.SOURCE_TYPES.NEWSLETTER,
    ])).default([research_constants_1.SOURCE_TYPES.WEBSEARCH, research_constants_1.SOURCE_TYPES.SOCIAL]),
    profileId: zod_1.z.string().uuid(),
    style: zod_1.z.enum(['focused', 'diverse', 'creative']).default('diverse'),
});
exports.searchOptionsSchema = zod_1.z.object({
    query: zod_1.z.string().min(1, "Search query is required"),
    limit: zod_1.z.number().int().positive().max(100).default(research_constants_1.DEFAULT_RESEARCH_OPTIONS.SEARCH_LIMIT),
    offset: zod_1.z.number().int().nonnegative().default(0),
    source: zod_1.z.string().optional(),
});
exports.sessionStatusSchema = zod_1.z.object({
    sessionId: zod_1.z.string(),
    serviceId: zod_1.z.string(),
    status: zod_1.z.enum([
        research_constants_1.RESEARCH_SESSION_STATUSES.RUNNING,
        research_constants_1.RESEARCH_SESSION_STATUSES.COMPLETED,
        research_constants_1.RESEARCH_SESSION_STATUSES.ERROR,
        research_constants_1.RESEARCH_SESSION_STATUSES.STOPPED,
    ]),
    progress: zod_1.z.number().min(0).max(100),
    resultsCount: zod_1.z.number().int().nonnegative(),
    error: zod_1.z.string().optional(),
    startedAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.resultPaginationSchema = zod_1.z.object({
    limit: zod_1.z.string()
        .transform((val) => parseInt(val))
        .refine((val) => !isNaN(val) && val > 0 && val <= research_constants_1.RESULT_PAGINATION.MAX_LIMIT)
        .default(String(research_constants_1.RESULT_PAGINATION.DEFAULT_LIMIT)),
    offset: zod_1.z.string()
        .transform((val) => parseInt(val))
        .refine((val) => !isNaN(val) && val >= 0)
        .default(String(research_constants_1.RESULT_PAGINATION.DEFAULT_OFFSET)),
});
exports.sessionMetadataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    serviceId: zod_1.z.string(),
    profileId: zod_1.z.string().uuid(),
    status: zod_1.z.enum([
        research_constants_1.RESEARCH_SESSION_STATUSES.RUNNING,
        research_constants_1.RESEARCH_SESSION_STATUSES.COMPLETED,
        research_constants_1.RESEARCH_SESSION_STATUSES.ERROR,
        research_constants_1.RESEARCH_SESSION_STATUSES.STOPPED,
    ]),
    progress: zod_1.z.number().min(0).max(100),
    results: zod_1.z.array(zod_1.z.any()),
    error: zod_1.z.string().optional(),
    startedAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.llmInsightSchema = zod_1.z.object({
    insight: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    sources: zod_1.z.array(zod_1.z.string()),
    relevantOpportunities: zod_1.z.number().int().nonnegative(),
    type: zod_1.z.enum(['trend', 'opportunity', 'analysis', 'prediction']).optional(),
});
exports.socialMentionSchema = zod_1.z.object({
    platform: zod_1.z.string(),
    content: zod_1.z.string(),
    engagement: zod_1.z.number().int().nonnegative(),
    url: zod_1.z.string().url(),
    author: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    relevanceScore: zod_1.z.number().min(0).max(1).optional(),
});
exports.bookmarkSchema = zod_1.z.object({
    title: zod_1.z.string(),
    url: zod_1.z.string().url(),
    category: zod_1.z.string(),
    savedDate: zod_1.z.string().date(),
    tags: zod_1.z.array(zod_1.z.string()),
    description: zod_1.z.string(),
    relevanceScore: zod_1.z.number().min(0).max(1).optional(),
});
exports.newsletterSchema = zod_1.z.object({
    subject: zod_1.z.string(),
    sender: zod_1.z.string(),
    date: zod_1.z.string().date(),
    content: zod_1.z.string(),
    opportunities: zod_1.z.number().int().nonnegative(),
    relevanceScore: zod_1.z.number().min(0).max(1),
});
exports.webSearchResultSchema = zod_1.z.object({
    title: zod_1.z.string(),
    url: zod_1.z.string().url(),
    snippet: zod_1.z.string(),
    source: zod_1.z.string(),
    relevance: zod_1.z.number().min(0).max(1),
    publishedDate: zod_1.z.string().datetime().optional(),
});
exports.bulkResearchSchema = zod_1.z.object({
    services: zod_1.z.array(zod_1.z.string()).min(1, "At least one service must be specified"),
    profileIds: zod_1.z.array(zod_1.z.string().uuid()).min(1, "At least one profile must be specified"),
    options: zod_1.z.object({
        maxQueries: zod_1.z.number().int().positive().max(50).default(research_constants_1.DEFAULT_RESEARCH_OPTIONS.MAX_QUERIES),
        priority: zod_1.z.enum([
            research_constants_1.RESEARCH_PRIORITIES.LOW,
            research_constants_1.RESEARCH_PRIORITIES.MEDIUM,
            research_constants_1.RESEARCH_PRIORITIES.HIGH,
        ]).default(research_constants_1.RESEARCH_PRIORITIES.MEDIUM),
    }).optional(),
});
//# sourceMappingURL=research.schemas.js.map