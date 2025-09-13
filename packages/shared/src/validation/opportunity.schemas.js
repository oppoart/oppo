"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opportunityStatsSchema = exports.opportunityImportSchema = exports.bulkOpportunityOperationSchema = exports.opportunityAnalysisSchema = exports.opportunityApplicationSchema = exports.opportunitySearchSchema = exports.updateOpportunitySchema = exports.createOpportunitySchema = exports.scrapedOpportunitySchema = exports.opportunityBaseSchema = void 0;
const zod_1 = require("zod");
const opportunity_constants_1 = require("../constants/opportunity.constants");
const scraper_constants_1 = require("../constants/scraper.constants");
exports.opportunityBaseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(1).max(scraper_constants_1.CONTENT_LIMITS.TITLE_MAX_LENGTH),
    description: zod_1.z.string().min(1).max(scraper_constants_1.CONTENT_LIMITS.DESCRIPTION_MAX_LENGTH),
    url: zod_1.z.string().url(),
    organization: zod_1.z.string().max(scraper_constants_1.CONTENT_LIMITS.ORGANIZATION_MAX_LENGTH).optional(),
    deadline: zod_1.z.date().optional(),
    amount: zod_1.z.string().optional(),
    location: zod_1.z.string().max(scraper_constants_1.CONTENT_LIMITS.LOCATION_MAX_LENGTH).optional(),
    type: zod_1.z.enum(Object.values(opportunity_constants_1.OPPORTUNITY_TYPES)).optional(),
    category: zod_1.z.enum(Object.values(opportunity_constants_1.OPPORTUNITY_CATEGORIES)).optional(),
    geographicScope: zod_1.z.enum(Object.values(opportunity_constants_1.GEOGRAPHIC_SCOPE)).optional(),
    durationType: zod_1.z.enum(Object.values(opportunity_constants_1.DURATION_TYPES)).optional(),
    targetDemographic: zod_1.z.enum(Object.values(opportunity_constants_1.TARGET_DEMOGRAPHICS)).optional(),
    artDisciplines: zod_1.z.array(zod_1.z.enum(Object.values(opportunity_constants_1.ART_DISCIPLINES))).optional(),
    requirements: zod_1.z.array(zod_1.z.string().max(scraper_constants_1.CONTENT_LIMITS.REQUIREMENT_MAX_LENGTH)).max(scraper_constants_1.CONTENT_LIMITS.MAX_REQUIREMENTS).optional(),
    tags: zod_1.z.array(zod_1.z.string()).max(scraper_constants_1.CONTENT_LIMITS.MAX_TAGS).optional(),
    applicationUrl: zod_1.z.string().url().optional(),
    contactEmail: zod_1.z.string().email().optional(),
    discoverySource: zod_1.z.enum(Object.values(opportunity_constants_1.DISCOVERY_SOURCES)).optional(),
    scrapingMethod: zod_1.z.enum(Object.values(scraper_constants_1.SCRAPING_METHODS)).optional(),
    rawContent: zod_1.z.string().max(scraper_constants_1.CONTENT_LIMITS.RAW_CONTENT_MAX_LENGTH).optional(),
    relevanceScore: zod_1.z.number().min(0).max(1).optional(),
    validationStatus: zod_1.z.enum(Object.values(opportunity_constants_1.VALIDATION_STATUSES)).default(opportunity_constants_1.VALIDATION_STATUSES.UNVALIDATED),
    scrapedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
    publishedAt: zod_1.z.date().optional(),
});
exports.scrapedOpportunitySchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    url: zod_1.z.string().url(),
    organization: zod_1.z.string().optional(),
    deadline: zod_1.z.date().optional(),
    amount: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    requirements: zod_1.z.array(zod_1.z.string()).optional(),
    category: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    applicationUrl: zod_1.z.string().url().optional(),
    contactEmail: zod_1.z.string().email().optional(),
    rawContent: zod_1.z.string(),
    scrapingMethod: zod_1.z.enum([
        scraper_constants_1.SCRAPING_METHODS.FIRECRAWL,
        scraper_constants_1.SCRAPING_METHODS.PLAYWRIGHT,
        scraper_constants_1.SCRAPING_METHODS.CHEERIO,
    ]),
    scrapedAt: zod_1.z.date(),
    success: zod_1.z.boolean(),
    error: zod_1.z.string().optional(),
});
exports.createOpportunitySchema = exports.opportunityBaseSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.updateOpportunitySchema = exports.opportunityBaseSchema.partial().omit({
    id: true,
    createdAt: true,
});
exports.opportunitySearchSchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    organization: zod_1.z.string().optional(),
    type: zod_1.z.enum(Object.values(opportunity_constants_1.OPPORTUNITY_TYPES)).optional(),
    category: zod_1.z.enum(Object.values(opportunity_constants_1.OPPORTUNITY_CATEGORIES)).optional(),
    location: zod_1.z.string().optional(),
    geographicScope: zod_1.z.enum(Object.values(opportunity_constants_1.GEOGRAPHIC_SCOPE)).optional(),
    artDisciplines: zod_1.z.array(zod_1.z.enum(Object.values(opportunity_constants_1.ART_DISCIPLINES))).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    minAmount: zod_1.z.number().positive().optional(),
    maxAmount: zod_1.z.number().positive().optional(),
    deadlineAfter: zod_1.z.date().optional(),
    deadlineBefore: zod_1.z.date().optional(),
    minRelevanceScore: zod_1.z.number().min(0).max(1).optional(),
    maxRelevanceScore: zod_1.z.number().min(0).max(1).optional(),
    validationStatus: zod_1.z.enum(Object.values(opportunity_constants_1.VALIDATION_STATUSES)).optional(),
    discoverySource: zod_1.z.enum(Object.values(opportunity_constants_1.DISCOVERY_SOURCES)).optional(),
    createdAfter: zod_1.z.date().optional(),
    createdBefore: zod_1.z.date().optional(),
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().positive().max(100).default(20),
    sortBy: zod_1.z.enum(['createdAt', 'deadline', 'relevanceScore', 'title', 'amount']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
exports.opportunityApplicationSchema = zod_1.z.object({
    opportunityId: zod_1.z.string().uuid(),
    profileId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(Object.values(opportunity_constants_1.APPLICATION_STATUSES)),
    appliedAt: zod_1.z.date().optional(),
    submittedAt: zod_1.z.date().optional(),
    responseAt: zod_1.z.date().optional(),
    notes: zod_1.z.string().optional(),
    applicationData: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.opportunityAnalysisSchema = zod_1.z.object({
    opportunityId: zod_1.z.string().uuid(),
    profileId: zod_1.z.string().uuid(),
    relevanceScore: zod_1.z.number().min(0).max(1),
    matchingCriteria: zod_1.z.array(zod_1.z.string()),
    strengthsAlignment: zod_1.z.array(zod_1.z.string()),
    gapsIdentified: zod_1.z.array(zod_1.z.string()),
    recommendedActions: zod_1.z.array(zod_1.z.string()),
    confidenceLevel: zod_1.z.number().min(0).max(1),
    analysisDate: zod_1.z.date(),
    aiModel: zod_1.z.string().optional(),
});
exports.bulkOpportunityOperationSchema = zod_1.z.object({
    opportunityIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(100),
    operation: zod_1.z.enum(['validate', 'archive', 'delete', 'reprocess']),
    options: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.opportunityImportSchema = zod_1.z.object({
    source: zod_1.z.string(),
    format: zod_1.z.enum(['json', 'csv', 'xml']),
    data: zod_1.z.array(zod_1.z.record(zod_1.z.any())).min(1).max(1000),
    options: zod_1.z.object({
        skipDuplicates: zod_1.z.boolean().default(true),
        validateFirst: zod_1.z.boolean().default(true),
        assignToProfile: zod_1.z.string().uuid().optional(),
    }).optional(),
});
exports.opportunityStatsSchema = zod_1.z.object({
    total: zod_1.z.number().int().nonnegative(),
    byType: zod_1.z.record(zod_1.z.number().int().nonnegative()),
    byCategory: zod_1.z.record(zod_1.z.number().int().nonnegative()),
    byValidationStatus: zod_1.z.record(zod_1.z.number().int().nonnegative()),
    byRelevanceRange: zod_1.z.record(zod_1.z.number().int().nonnegative()),
    averageRelevanceScore: zod_1.z.number().min(0).max(1),
    recentlyAdded: zod_1.z.number().int().nonnegative(),
    upcomingDeadlines: zod_1.z.number().int().nonnegative(),
});
//# sourceMappingURL=opportunity.schemas.js.map