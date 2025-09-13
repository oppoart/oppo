/**
 * Common Validation Schemas
 * Reusable validation schemas and helpers
 */

import { z } from 'zod';
import { VALIDATION_PATTERNS, FIELD_LIMITS, FILE_LIMITS } from '../config/validation.config';
import { VALIDATION_MESSAGES } from '../config/validation.config';
import { DB_QUERY_LIMITS } from '../config/database.config';

// UUID validation
export const uuidSchema = z.string()
  .regex(VALIDATION_PATTERNS.UUID, { message: 'Invalid UUID format' });

// Email validation
export const emailSchema = z.string()
  .email(VALIDATION_MESSAGES.INVALID_EMAIL)
  .max(FIELD_LIMITS.EMAIL.MAX, VALIDATION_MESSAGES.MAX_LENGTH('Email', FIELD_LIMITS.EMAIL.MAX));

// URL validation
export const urlSchema = z.string()
  .url(VALIDATION_MESSAGES.INVALID_URL)
  .max(FIELD_LIMITS.WEBSITE.MAX, VALIDATION_MESSAGES.MAX_LENGTH('URL', FIELD_LIMITS.WEBSITE.MAX));

// Phone validation
export const phoneSchema = z.string()
  .regex(VALIDATION_PATTERNS.PHONE, { message: VALIDATION_MESSAGES.INVALID_PHONE })
  .optional();

// Slug validation
export const slugSchema = z.string()
  .regex(VALIDATION_PATTERNS.SLUG, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
  .min(1)
  .max(100);

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start <= end;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate'],
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number()
    .int()
    .positive()
    .default(1),
  limit: z.coerce.number()
    .int()
    .positive()
    .max(DB_QUERY_LIMITS.MAX_PAGE_SIZE, VALIDATION_MESSAGES.MAX_VALUE('Page size', DB_QUERY_LIMITS.MAX_PAGE_SIZE))
    .default(DB_QUERY_LIMITS.DEFAULT_PAGE_SIZE),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Search schema
export const searchSchema = z.object({
  query: z.string()
    .min(FIELD_LIMITS.SEARCH_QUERY.MIN, VALIDATION_MESSAGES.MIN_LENGTH('Search query', FIELD_LIMITS.SEARCH_QUERY.MIN))
    .max(FIELD_LIMITS.SEARCH_QUERY.MAX, VALIDATION_MESSAGES.MAX_LENGTH('Search query', FIELD_LIMITS.SEARCH_QUERY.MAX)),
  filters: z.record(z.any()).optional(),
  ...paginationSchema.shape,
});

// File upload schema
export const fileUploadSchema = z.object({
  filename: z.string(),
  mimetype: z.string(),
  size: z.number()
    .max(FILE_LIMITS.MAX_FILE_SIZE, VALIDATION_MESSAGES.FILE_TOO_LARGE('10MB')),
}).refine((data) => {
  const allowedTypes = [...FILE_LIMITS.ALLOWED_IMAGE_TYPES, ...FILE_LIMITS.ALLOWED_DOCUMENT_TYPES] as string[];
  return allowedTypes.includes(data.mimetype);
}, {
  message: VALIDATION_MESSAGES.INVALID_FILE_TYPE('jpeg, png, gif, webp, pdf, doc, docx'),
});

// Image upload schema
export const imageUploadSchema = z.object({
  filename: z.string(),
  mimetype: z.string(),
  size: z.number()
    .max(FILE_LIMITS.MAX_IMAGE_SIZE, VALIDATION_MESSAGES.FILE_TOO_LARGE('5MB')),
}).refine((data) => {
  return (FILE_LIMITS.ALLOWED_IMAGE_TYPES as readonly string[]).includes(data.mimetype);
}, {
  message: VALIDATION_MESSAGES.INVALID_FILE_TYPE('jpeg, png, gif, webp'),
});

// Tags schema
export const tagsSchema = z.array(
  z.string()
    .min(FIELD_LIMITS.TAG_LENGTH.MIN, VALIDATION_MESSAGES.MIN_LENGTH('Tag', FIELD_LIMITS.TAG_LENGTH.MIN))
    .max(FIELD_LIMITS.TAG_LENGTH.MAX, VALIDATION_MESSAGES.MAX_LENGTH('Tag', FIELD_LIMITS.TAG_LENGTH.MAX))
)
  .max(FIELD_LIMITS.TAGS.MAX, VALIDATION_MESSAGES.MAX_ITEMS('tags', FIELD_LIMITS.TAGS.MAX))
  .optional()
  .default([]);

// ID array schema
export const idArraySchema = z.array(z.string().or(uuidSchema))
  .min(1, VALIDATION_MESSAGES.MIN_ITEMS('items', 1));

// Batch operation schema
export const batchOperationSchema = z.object({
  ids: idArraySchema,
  operation: z.enum(['delete', 'archive', 'restore', 'update']),
  data: z.record(z.any()).optional(),
});

// Coordinate schema
export const coordinateSchema = z.object({
  latitude: z.number()
    .min(-90, VALIDATION_MESSAGES.MIN_VALUE('Latitude', -90))
    .max(90, VALIDATION_MESSAGES.MAX_VALUE('Latitude', 90)),
  longitude: z.number()
    .min(-180, VALIDATION_MESSAGES.MIN_VALUE('Longitude', -180))
    .max(180, VALIDATION_MESSAGES.MAX_VALUE('Longitude', 180)),
});

// Address schema
export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  coordinates: coordinateSchema.optional(),
});

// Money/Amount schema
export const moneySchema = z.object({
  amount: z.number()
    .positive(VALIDATION_MESSAGES.MUST_BE_POSITIVE)
    .multipleOf(0.01), // Cents precision
  currency: z.string()
    .length(3, VALIDATION_MESSAGES.EXACT_LENGTH('Currency code', 3))
    .default('USD'),
});

// Percentage schema (0-100)
export const percentageSchema = z.number()
  .min(0, VALIDATION_MESSAGES.MIN_VALUE('Percentage', 0))
  .max(100, VALIDATION_MESSAGES.MAX_VALUE('Percentage', 100));

// Score schema (0-1)
export const scoreSchema = z.number()
  .min(0, VALIDATION_MESSAGES.MIN_VALUE('Score', 0))
  .max(1, VALIDATION_MESSAGES.MAX_VALUE('Score', 1));

// Export types
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
export type TagsInput = z.infer<typeof tagsSchema>;
export type BatchOperationInput = z.infer<typeof batchOperationSchema>;
export type CoordinateInput = z.infer<typeof coordinateSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type MoneyInput = z.infer<typeof moneySchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;