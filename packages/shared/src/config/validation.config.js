"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationConfig = exports.PASSWORD_REQUIREMENTS = exports.FORM_RULES = exports.FILE_LIMITS = exports.VALIDATION_MESSAGES = exports.FIELD_LIMITS = exports.VALIDATION_PATTERNS = void 0;
exports.createValidationConfig = createValidationConfig;
exports.VALIDATION_PATTERNS = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
    PHONE: /^\+?[1-9]\d{1,14}$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};
exports.FIELD_LIMITS = {
    USERNAME: { MIN: 3, MAX: 30 },
    EMAIL: { MIN: 5, MAX: 255 },
    PASSWORD: { MIN: 8, MAX: 128 },
    NAME: { MIN: 1, MAX: 100 },
    BIO: { MIN: 0, MAX: 1000 },
    HEADLINE: { MIN: 0, MAX: 200 },
    LOCATION: { MIN: 0, MAX: 100 },
    WEBSITE: { MIN: 0, MAX: 255 },
    TITLE: { MIN: 1, MAX: 200 },
    DESCRIPTION: { MIN: 0, MAX: 5000 },
    SHORT_DESCRIPTION: { MIN: 0, MAX: 500 },
    TAGS: { MIN: 0, MAX: 10 },
    TAG_LENGTH: { MIN: 2, MAX: 30 },
    SEARCH_QUERY: { MIN: 1, MAX: 200 },
    SEARCH_RESULTS: { MIN: 1, MAX: 100 },
};
exports.VALIDATION_MESSAGES = {
    REQUIRED: 'This field is required',
    REQUIRED_FIELD: (field) => `${field} is required`,
    MIN_LENGTH: (field, min) => `${field} must be at least ${min} characters`,
    MAX_LENGTH: (field, max) => `${field} must be no more than ${max} characters`,
    EXACT_LENGTH: (field, length) => `${field} must be exactly ${length} characters`,
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_URL: 'Please enter a valid URL',
    INVALID_PHONE: 'Please enter a valid phone number',
    INVALID_USERNAME: 'Username can only contain letters, numbers, underscores, and hyphens',
    INVALID_FORMAT: (field) => `${field} has an invalid format`,
    PASSWORD_TOO_WEAK: 'Password is too weak',
    PASSWORD_NO_UPPERCASE: 'Password must contain at least one uppercase letter',
    PASSWORD_NO_LOWERCASE: 'Password must contain at least one lowercase letter',
    PASSWORD_NO_NUMBER: 'Password must contain at least one number',
    PASSWORD_NO_SPECIAL: 'Password must contain at least one special character',
    PASSWORDS_NOT_MATCH: 'Passwords do not match',
    MIN_VALUE: (field, min) => `${field} must be at least ${min}`,
    MAX_VALUE: (field, max) => `${field} must be no more than ${max}`,
    MUST_BE_NUMBER: 'Must be a valid number',
    MUST_BE_INTEGER: 'Must be a whole number',
    MUST_BE_POSITIVE: 'Must be a positive number',
    INVALID_DATE: 'Please enter a valid date',
    DATE_IN_PAST: 'Date cannot be in the past',
    DATE_IN_FUTURE: 'Date cannot be in the future',
    DATE_BEFORE: (date) => `Date must be before ${date}`,
    DATE_AFTER: (date) => `Date must be after ${date}`,
    MIN_ITEMS: (field, min) => `Please select at least ${min} ${field}`,
    MAX_ITEMS: (field, max) => `Please select no more than ${max} ${field}`,
    DUPLICATE_ITEMS: 'Duplicate items are not allowed',
    FILE_TOO_LARGE: (maxSize) => `File size must not exceed ${maxSize}`,
    INVALID_FILE_TYPE: (types) => `File type must be one of: ${types}`,
    NO_FILE_SELECTED: 'Please select a file',
    ALREADY_EXISTS: (field) => `${field} already exists`,
    NOT_FOUND: (field) => `${field} not found`,
    INVALID_SELECTION: 'Please make a valid selection',
    OPERATION_FAILED: 'Operation failed. Please try again',
};
exports.FILE_LIMITS = {
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,
    MAX_DOCUMENT_SIZE: 20 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
exports.FORM_RULES = {
    DEBOUNCE_DELAY: 300,
    AUTOCOMPLETE_DELAY: 500,
    PREVENT_DOUBLE_SUBMIT: true,
    SHOW_VALIDATION_ON_BLUR: true,
    SHOW_VALIDATION_ON_SUBMIT: true,
    TRIM_WHITESPACE: true,
    NORMALIZE_EMAIL: true,
    AUTO_FORMAT_PHONE: true,
};
function createValidationConfig() {
    return {
        password: {
            minLength: exports.FIELD_LIMITS.PASSWORD.MIN,
            maxLength: exports.FIELD_LIMITS.PASSWORD.MAX,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
        },
        username: {
            minLength: exports.FIELD_LIMITS.USERNAME.MIN,
            maxLength: exports.FIELD_LIMITS.USERNAME.MAX,
            pattern: exports.VALIDATION_PATTERNS.USERNAME,
        },
        email: {
            pattern: exports.VALIDATION_PATTERNS.EMAIL,
            maxLength: exports.FIELD_LIMITS.EMAIL.MAX,
        },
        profile: {
            maxBioLength: exports.FIELD_LIMITS.BIO.MAX,
            maxSkillsCount: 20,
            maxTagsCount: exports.FIELD_LIMITS.TAGS.MAX,
        },
    };
}
var auth_config_1 = require("../config/auth.config");
Object.defineProperty(exports, "PASSWORD_REQUIREMENTS", { enumerable: true, get: function () { return auth_config_1.PASSWORD_REQUIREMENTS; } });
exports.validationConfig = createValidationConfig();
//# sourceMappingURL=validation.config.js.map