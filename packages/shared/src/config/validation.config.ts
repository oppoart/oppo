/**
 * Validation Configuration
 * Centralized validation rules and messages
 */

import { ValidationConfig } from './types';

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// Field length limits
export const FIELD_LIMITS = {
  // User fields
  USERNAME: { MIN: 3, MAX: 30 },
  EMAIL: { MIN: 5, MAX: 255 },
  PASSWORD: { MIN: 8, MAX: 128 },
  NAME: { MIN: 1, MAX: 100 },
  
  // Profile fields
  BIO: { MIN: 0, MAX: 1000 },
  HEADLINE: { MIN: 0, MAX: 200 },
  LOCATION: { MIN: 0, MAX: 100 },
  WEBSITE: { MIN: 0, MAX: 255 },
  
  // Content fields
  TITLE: { MIN: 1, MAX: 200 },
  DESCRIPTION: { MIN: 0, MAX: 5000 },
  SHORT_DESCRIPTION: { MIN: 0, MAX: 500 },
  TAGS: { MIN: 0, MAX: 10 },
  TAG_LENGTH: { MIN: 2, MAX: 30 },
  
  // Search fields
  SEARCH_QUERY: { MIN: 1, MAX: 200 },
  SEARCH_RESULTS: { MIN: 1, MAX: 100 },
} as const;

// Validation error messages
export const VALIDATION_MESSAGES = {
  // Required fields
  REQUIRED: 'This field is required',
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  
  // Length validation
  MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field: string, max: number) => `${field} must be no more than ${max} characters`,
  EXACT_LENGTH: (field: string, length: number) => `${field} must be exactly ${length} characters`,
  
  // Format validation
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_URL: 'Please enter a valid URL',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_USERNAME: 'Username can only contain letters, numbers, underscores, and hyphens',
  INVALID_FORMAT: (field: string) => `${field} has an invalid format`,
  
  // Password validation
  PASSWORD_TOO_WEAK: 'Password is too weak',
  PASSWORD_NO_UPPERCASE: 'Password must contain at least one uppercase letter',
  PASSWORD_NO_LOWERCASE: 'Password must contain at least one lowercase letter',
  PASSWORD_NO_NUMBER: 'Password must contain at least one number',
  PASSWORD_NO_SPECIAL: 'Password must contain at least one special character',
  PASSWORDS_NOT_MATCH: 'Passwords do not match',
  
  // Numeric validation
  MIN_VALUE: (field: string, min: number) => `${field} must be at least ${min}`,
  MAX_VALUE: (field: string, max: number) => `${field} must be no more than ${max}`,
  MUST_BE_NUMBER: 'Must be a valid number',
  MUST_BE_INTEGER: 'Must be a whole number',
  MUST_BE_POSITIVE: 'Must be a positive number',
  
  // Date validation
  INVALID_DATE: 'Please enter a valid date',
  DATE_IN_PAST: 'Date cannot be in the past',
  DATE_IN_FUTURE: 'Date cannot be in the future',
  DATE_BEFORE: (date: string) => `Date must be before ${date}`,
  DATE_AFTER: (date: string) => `Date must be after ${date}`,
  
  // Array validation
  MIN_ITEMS: (field: string, min: number) => `Please select at least ${min} ${field}`,
  MAX_ITEMS: (field: string, max: number) => `Please select no more than ${max} ${field}`,
  DUPLICATE_ITEMS: 'Duplicate items are not allowed',
  
  // File validation
  FILE_TOO_LARGE: (maxSize: string) => `File size must not exceed ${maxSize}`,
  INVALID_FILE_TYPE: (types: string) => `File type must be one of: ${types}`,
  NO_FILE_SELECTED: 'Please select a file',
  
  // Custom validation
  ALREADY_EXISTS: (field: string) => `${field} already exists`,
  NOT_FOUND: (field: string) => `${field} not found`,
  INVALID_SELECTION: 'Please make a valid selection',
  OPERATION_FAILED: 'Operation failed. Please try again',
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE: 20 * 1024 * 1024, // 20MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// Form validation rules
export const FORM_RULES = {
  // Debounce delays (in milliseconds)
  DEBOUNCE_DELAY: 300,
  AUTOCOMPLETE_DELAY: 500,
  
  // Submission rules
  PREVENT_DOUBLE_SUBMIT: true,
  SHOW_VALIDATION_ON_BLUR: true,
  SHOW_VALIDATION_ON_SUBMIT: true,
  
  // Field rules
  TRIM_WHITESPACE: true,
  NORMALIZE_EMAIL: true,
  AUTO_FORMAT_PHONE: true,
} as const;

// Create validation configuration
export function createValidationConfig(): ValidationConfig {
  return {
    password: {
      minLength: FIELD_LIMITS.PASSWORD.MIN,
      maxLength: FIELD_LIMITS.PASSWORD.MAX,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    username: {
      minLength: FIELD_LIMITS.USERNAME.MIN,
      maxLength: FIELD_LIMITS.USERNAME.MAX,
      pattern: VALIDATION_PATTERNS.USERNAME,
    },
    email: {
      pattern: VALIDATION_PATTERNS.EMAIL,
      maxLength: FIELD_LIMITS.EMAIL.MAX,
    },
    profile: {
      maxBioLength: FIELD_LIMITS.BIO.MAX,
      maxSkillsCount: 20,
      maxTagsCount: FIELD_LIMITS.TAGS.MAX,
    },
  };
}

// Re-export PASSWORD_REQUIREMENTS for compatibility
export { PASSWORD_REQUIREMENTS } from '../config/auth.config';

// Export default configuration
export const validationConfig = createValidationConfig();