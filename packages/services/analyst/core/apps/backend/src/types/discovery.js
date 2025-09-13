"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDiscoveryJob = exports.validateDiscoverySource = exports.validateOpportunityData = exports.AIServiceError = exports.DiscoveryError = exports.aiServiceMetricsSchema = exports.discoveryJobSchema = exports.newsletterConfigSchema = exports.bookmarkConfigSchema = exports.socialConfigSchema = exports.webSearchConfigSchema = exports.discoverySourceSchema = exports.opportunityDataSchema = exports.jobStatuses = exports.opportunityStatuses = exports.sourceTypes = void 0;
const zod_1 = require("zod");
// =====================================
// Discovery System Types & Schemas
// =====================================
// Source Types
exports.sourceTypes = ['websearch', 'social', 'bookmark', 'newsletter', 'manual'];
// Opportunity Status Types
exports.opportunityStatuses = ['new', 'reviewing', 'applying', 'submitted', 'rejected', 'archived'];
// Job Status Types
exports.jobStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
// =====================================
// Core Opportunity Schema
// =====================================
exports.opportunityDataSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1, 'Title is required'),
    organization: zod_1.z.string().optional(),
    description: zod_1.z.string().min(1, 'Description is required'),
    url: zod_1.z.string().url('Invalid URL'),
    deadline: zod_1.z.date().optional(),
    amount: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    // Discovery metadata
    sourceType: zod_1.z.enum(exports.sourceTypes),
    sourceUrl: zod_1.z.string().url().optional(),
    sourceMetadata: zod_1.z.record(zod_1.z.any()).optional(),
    // Processing metadata
    relevanceScore: zod_1.z.number().min(0).max(1).optional(),
    semanticScore: zod_1.z.number().min(0).max(1).optional(),
    keywordScore: zod_1.z.number().min(0).max(1).optional(),
    categoryScore: zod_1.z.number().min(0).max(1).optional(),
    aiServiceUsed: zod_1.z.string().optional(),
    processingTimeMs: zod_1.z.number().optional(),
    processed: zod_1.z.boolean().default(false),
    // User interaction
    status: zod_1.z.enum(exports.opportunityStatuses).default('new'),
    applied: zod_1.z.boolean().default(false),
    notes: zod_1.z.string().optional(),
    starred: zod_1.z.boolean().default(false),
});
// =====================================
// Discovery Source Schema
// =====================================
exports.discoverySourceSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1, 'Source name is required'),
    type: zod_1.z.enum(exports.sourceTypes),
    url: zod_1.z.string().url().optional(),
    enabled: zod_1.z.boolean().default(true),
    config: zod_1.z.record(zod_1.z.any()).optional(),
});
// Source-specific configurations
exports.webSearchConfigSchema = zod_1.z.object({
    searchQueries: zod_1.z.array(zod_1.z.string()),
    providers: zod_1.z.array(zod_1.z.enum(['serpapi', 'tavily', 'bing', 'perplexity'])),
    maxResults: zod_1.z.number().default(20),
    language: zod_1.z.string().default('en'),
});
exports.socialConfigSchema = zod_1.z.object({
    platform: zod_1.z.enum(['twitter', 'instagram', 'linkedin', 'threads']),
    hashtags: zod_1.z.array(zod_1.z.string()).optional(),
    accounts: zod_1.z.array(zod_1.z.string()).optional(),
    keywords: zod_1.z.array(zod_1.z.string()).optional(),
    maxPosts: zod_1.z.number().default(50),
});
exports.bookmarkConfigSchema = zod_1.z.object({
    urls: zod_1.z.array(zod_1.z.string().url()),
    selectors: zod_1.z.record(zod_1.z.string()).optional(), // CSS selectors for data extraction
    frequency: zod_1.z.enum(['hourly', 'daily', 'weekly']).default('daily'),
});
exports.newsletterConfigSchema = zod_1.z.object({
    senderEmails: zod_1.z.array(zod_1.z.string().email()),
    keywords: zod_1.z.array(zod_1.z.string()),
    processAttachments: zod_1.z.boolean().default(false),
});
// =====================================
// Discovery Job Schema
// =====================================
exports.discoveryJobSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    sourceId: zod_1.z.string().optional(),
    sourceType: zod_1.z.enum(exports.sourceTypes),
    sourceName: zod_1.z.string().optional(),
    status: zod_1.z.enum(exports.jobStatuses).default('pending'),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// =====================================
// AI Service Metrics Schema
// =====================================
exports.aiServiceMetricsSchema = zod_1.z.object({
    serviceName: zod_1.z.enum(['openai', 'anthropic', 'google', 'huggingface', 'local']),
    operation: zod_1.z.enum(['embedding', 'analysis', 'search', 'classification']),
    responseTimeMs: zod_1.z.number(),
    success: zod_1.z.boolean(),
    costUsd: zod_1.z.number().optional(),
    qualityScore: zod_1.z.number().min(0).max(1).optional(),
    errorMessage: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// =====================================
// Error Types
// =====================================
class DiscoveryError extends Error {
    constructor(message, sourceType, sourceName, metadata) {
        super(message);
        this.sourceType = sourceType;
        this.sourceName = sourceName;
        this.metadata = metadata;
        this.name = 'DiscoveryError';
    }
}
exports.DiscoveryError = DiscoveryError;
class AIServiceError extends Error {
    constructor(message, serviceName, operation, metadata) {
        super(message);
        this.serviceName = serviceName;
        this.operation = operation;
        this.metadata = metadata;
        this.name = 'AIServiceError';
    }
}
exports.AIServiceError = AIServiceError;
// =====================================
// Validation Helpers
// =====================================
const validateOpportunityData = (data) => {
    return exports.opportunityDataSchema.parse(data);
};
exports.validateOpportunityData = validateOpportunityData;
const validateDiscoverySource = (data) => {
    return exports.discoverySourceSchema.parse(data);
};
exports.validateDiscoverySource = validateDiscoverySource;
const validateDiscoveryJob = (data) => {
    return exports.discoveryJobSchema.parse(data);
};
exports.validateDiscoveryJob = validateDiscoveryJob;
