"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreSchema = exports.percentageSchema = exports.moneySchema = exports.addressSchema = exports.coordinateSchema = exports.batchOperationSchema = exports.idArraySchema = exports.tagsSchema = exports.imageUploadSchema = exports.fileUploadSchema = exports.searchSchema = exports.paginationSchema = exports.dateRangeSchema = exports.slugSchema = exports.phoneSchema = exports.urlSchema = exports.emailSchema = exports.uuidSchema = void 0;
const zod_1 = require("zod");
const validation_config_1 = require("../config/validation.config");
const validation_config_2 = require("../config/validation.config");
const database_config_1 = require("../config/database.config");
exports.uuidSchema = zod_1.z.string()
    .regex(validation_config_1.VALIDATION_PATTERNS.UUID, { message: 'Invalid UUID format' });
exports.emailSchema = zod_1.z.string()
    .email(validation_config_2.VALIDATION_MESSAGES.INVALID_EMAIL)
    .max(validation_config_1.FIELD_LIMITS.EMAIL.MAX, validation_config_2.VALIDATION_MESSAGES.MAX_LENGTH('Email', validation_config_1.FIELD_LIMITS.EMAIL.MAX));
exports.urlSchema = zod_1.z.string()
    .url(validation_config_2.VALIDATION_MESSAGES.INVALID_URL)
    .max(validation_config_1.FIELD_LIMITS.WEBSITE.MAX, validation_config_2.VALIDATION_MESSAGES.MAX_LENGTH('URL', validation_config_1.FIELD_LIMITS.WEBSITE.MAX));
exports.phoneSchema = zod_1.z.string()
    .regex(validation_config_1.VALIDATION_PATTERNS.PHONE, { message: validation_config_2.VALIDATION_MESSAGES.INVALID_PHONE })
    .optional();
exports.slugSchema = zod_1.z.string()
    .regex(validation_config_1.VALIDATION_PATTERNS.SLUG, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
    .min(1)
    .max(100);
exports.dateRangeSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().or(zod_1.z.date()),
    endDate: zod_1.z.string().datetime().or(zod_1.z.date()),
}).refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
}, {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
});
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number()
        .int()
        .positive()
        .default(1),
    limit: zod_1.z.coerce.number()
        .int()
        .positive()
        .max(database_config_1.DB_QUERY_LIMITS.MAX_PAGE_SIZE, validation_config_2.VALIDATION_MESSAGES.MAX_VALUE('Page size', database_config_1.DB_QUERY_LIMITS.MAX_PAGE_SIZE))
        .default(database_config_1.DB_QUERY_LIMITS.DEFAULT_PAGE_SIZE),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
exports.searchSchema = zod_1.z.object({
    query: zod_1.z.string()
        .min(validation_config_1.FIELD_LIMITS.SEARCH_QUERY.MIN, validation_config_2.VALIDATION_MESSAGES.MIN_LENGTH('Search query', validation_config_1.FIELD_LIMITS.SEARCH_QUERY.MIN))
        .max(validation_config_1.FIELD_LIMITS.SEARCH_QUERY.MAX, validation_config_2.VALIDATION_MESSAGES.MAX_LENGTH('Search query', validation_config_1.FIELD_LIMITS.SEARCH_QUERY.MAX)),
    filters: zod_1.z.record(zod_1.z.any()).optional(),
    ...exports.paginationSchema.shape,
});
exports.fileUploadSchema = zod_1.z.object({
    filename: zod_1.z.string(),
    mimetype: zod_1.z.string(),
    size: zod_1.z.number()
        .max(validation_config_1.FILE_LIMITS.MAX_FILE_SIZE, validation_config_2.VALIDATION_MESSAGES.FILE_TOO_LARGE('10MB')),
}).refine((data) => {
    const allowedTypes = [...validation_config_1.FILE_LIMITS.ALLOWED_IMAGE_TYPES, ...validation_config_1.FILE_LIMITS.ALLOWED_DOCUMENT_TYPES];
    return allowedTypes.includes(data.mimetype);
}, {
    message: validation_config_2.VALIDATION_MESSAGES.INVALID_FILE_TYPE('jpeg, png, gif, webp, pdf, doc, docx'),
});
exports.imageUploadSchema = zod_1.z.object({
    filename: zod_1.z.string(),
    mimetype: zod_1.z.string(),
    size: zod_1.z.number()
        .max(validation_config_1.FILE_LIMITS.MAX_IMAGE_SIZE, validation_config_2.VALIDATION_MESSAGES.FILE_TOO_LARGE('5MB')),
}).refine((data) => {
    return validation_config_1.FILE_LIMITS.ALLOWED_IMAGE_TYPES.includes(data.mimetype);
}, {
    message: validation_config_2.VALIDATION_MESSAGES.INVALID_FILE_TYPE('jpeg, png, gif, webp'),
});
exports.tagsSchema = zod_1.z.array(zod_1.z.string()
    .min(validation_config_1.FIELD_LIMITS.TAG_LENGTH.MIN, validation_config_2.VALIDATION_MESSAGES.MIN_LENGTH('Tag', validation_config_1.FIELD_LIMITS.TAG_LENGTH.MIN))
    .max(validation_config_1.FIELD_LIMITS.TAG_LENGTH.MAX, validation_config_2.VALIDATION_MESSAGES.MAX_LENGTH('Tag', validation_config_1.FIELD_LIMITS.TAG_LENGTH.MAX)))
    .max(validation_config_1.FIELD_LIMITS.TAGS.MAX, validation_config_2.VALIDATION_MESSAGES.MAX_ITEMS('tags', validation_config_1.FIELD_LIMITS.TAGS.MAX))
    .optional()
    .default([]);
exports.idArraySchema = zod_1.z.array(zod_1.z.string().or(exports.uuidSchema))
    .min(1, validation_config_2.VALIDATION_MESSAGES.MIN_ITEMS('items', 1));
exports.batchOperationSchema = zod_1.z.object({
    ids: exports.idArraySchema,
    operation: zod_1.z.enum(['delete', 'archive', 'restore', 'update']),
    data: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.coordinateSchema = zod_1.z.object({
    latitude: zod_1.z.number()
        .min(-90, validation_config_2.VALIDATION_MESSAGES.MIN_VALUE('Latitude', -90))
        .max(90, validation_config_2.VALIDATION_MESSAGES.MAX_VALUE('Latitude', 90)),
    longitude: zod_1.z.number()
        .min(-180, validation_config_2.VALIDATION_MESSAGES.MIN_VALUE('Longitude', -180))
        .max(180, validation_config_2.VALIDATION_MESSAGES.MAX_VALUE('Longitude', 180)),
});
exports.addressSchema = zod_1.z.object({
    street: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    postalCode: zod_1.z.string().optional(),
    coordinates: exports.coordinateSchema.optional(),
});
exports.moneySchema = zod_1.z.object({
    amount: zod_1.z.number()
        .positive(validation_config_2.VALIDATION_MESSAGES.MUST_BE_POSITIVE)
        .multipleOf(0.01),
    currency: zod_1.z.string()
        .length(3, validation_config_2.VALIDATION_MESSAGES.EXACT_LENGTH('Currency code', 3))
        .default('USD'),
});
exports.percentageSchema = zod_1.z.number()
    .min(0, validation_config_2.VALIDATION_MESSAGES.MIN_VALUE('Percentage', 0))
    .max(100, validation_config_2.VALIDATION_MESSAGES.MAX_VALUE('Percentage', 100));
exports.scoreSchema = zod_1.z.number()
    .min(0, validation_config_2.VALIDATION_MESSAGES.MIN_VALUE('Score', 0))
    .max(1, validation_config_2.VALIDATION_MESSAGES.MAX_VALUE('Score', 1));
//# sourceMappingURL=common.schemas.js.map