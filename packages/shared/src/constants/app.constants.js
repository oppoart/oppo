"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEVERITY_LEVELS = exports.PRIORITIES = exports.STATUSES = exports.REGEX_PATTERNS = exports.EXTERNAL_SERVICES = exports.URLS = exports.RETRY_CONFIGS = exports.CACHE_DURATIONS = exports.SUPPORTED_FILE_TYPES = exports.FILE_SIZE_LIMITS = exports.DATE_FORMATS = exports.PAGINATION_DEFAULTS = exports.APP_INFO = void 0;
exports.APP_INFO = {
    NAME: 'OPPO',
    FULL_NAME: 'Opportunity Discovery Platform',
    VERSION: '1.0.0',
    DESCRIPTION: 'AI-powered opportunity discovery platform for artists',
    AUTHOR: 'OPPO Team',
    HOMEPAGE: 'https://oppo.app',
    SUPPORT_EMAIL: 'support@oppo.app',
};
exports.PAGINATION_DEFAULTS = {
    PAGE: 1,
    LIMIT: 20,
    MAX_LIMIT: 100,
    OFFSET: 0,
};
exports.DATE_FORMATS = {
    ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    DATE: 'YYYY-MM-DD',
    TIME: 'HH:mm:ss',
    DISPLAY: 'MMM DD, YYYY',
    DISPLAY_WITH_TIME: 'MMM DD, YYYY h:mm A',
    RELATIVE_THRESHOLD_DAYS: 7,
};
exports.FILE_SIZE_LIMITS = {
    AVATAR_MAX_SIZE: 2 * 1024 * 1024,
    DOCUMENT_MAX_SIZE: 10 * 1024 * 1024,
    IMAGE_MAX_SIZE: 5 * 1024 * 1024,
    PORTFOLIO_MAX_SIZE: 20 * 1024 * 1024,
};
exports.SUPPORTED_FILE_TYPES = {
    IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    PORTFOLIOS: ['application/pdf', 'application/zip'],
};
exports.CACHE_DURATIONS = {
    ONE_MINUTE: 60 * 1000,
    FIVE_MINUTES: 5 * 60 * 1000,
    FIFTEEN_MINUTES: 15 * 60 * 1000,
    ONE_HOUR: 60 * 60 * 1000,
    ONE_DAY: 24 * 60 * 60 * 1000,
    ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
};
exports.RETRY_CONFIGS = {
    DEFAULT: {
        MAX_ATTEMPTS: 3,
        INITIAL_DELAY: 1000,
        MAX_DELAY: 10000,
        BACKOFF_MULTIPLIER: 2,
    },
    API_CALLS: {
        MAX_ATTEMPTS: 3,
        INITIAL_DELAY: 500,
        MAX_DELAY: 5000,
        BACKOFF_MULTIPLIER: 1.5,
    },
    FILE_UPLOAD: {
        MAX_ATTEMPTS: 5,
        INITIAL_DELAY: 2000,
        MAX_DELAY: 20000,
        BACKOFF_MULTIPLIER: 2,
    },
};
exports.URLS = {
    DEVELOPMENT: {
        FRONTEND: 'http://localhost:3000',
        BACKEND: 'http://localhost:3001',
        API: 'http://localhost:3001/api',
    },
    PRODUCTION: {
        FRONTEND: 'https://app.oppo.com',
        BACKEND: 'https://api.oppo.com',
        API: 'https://api.oppo.com/api',
    },
};
exports.EXTERNAL_SERVICES = {
    OPENAI: {
        BASE_URL: 'https://api.openai.com/v1',
        MODELS_URL: '/models',
        CHAT_URL: '/chat/completions',
        EMBEDDINGS_URL: '/embeddings',
    },
    ANTHROPIC: {
        BASE_URL: 'https://api.anthropic.com/v1',
        MESSAGES_URL: '/messages',
    },
    SERPAPI: {
        BASE_URL: 'https://serpapi.com/search',
    },
    FIRECRAWL: {
        BASE_URL: 'https://api.firecrawl.dev',
        SCRAPE_URL: '/v0/scrape',
    },
};
exports.REGEX_PATTERNS = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    PHONE: /^\+?[1-9]\d{1,14}$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};
exports.STATUSES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    PROCESSING: 'processing',
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
};
exports.PRIORITIES = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    URGENT: 4,
    CRITICAL: 5,
};
exports.SEVERITY_LEVELS = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical',
};
//# sourceMappingURL=app.constants.js.map