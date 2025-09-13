"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESEARCH_DEFAULTS = exports.RESULT_PAGINATION = exports.DEFAULT_RESEARCH_OPTIONS = exports.RESEARCH_EXPORT_FORMATS = exports.SOURCE_TYPES = exports.RESEARCH_PRIORITIES = exports.RESEARCH_SERVICES = exports.RESEARCH_SESSION_STATUSES = void 0;
exports.RESEARCH_SESSION_STATUSES = {
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    STOPPED: 'STOPPED',
    ERROR: 'ERROR'
};
exports.RESEARCH_SERVICES = {
    WEB_SEARCH: 'WEB_SEARCH',
    SOCIAL_MEDIA: 'SOCIAL_MEDIA',
    LLM_SEARCH: 'LLM_SEARCH',
    NEWSLETTERS: 'NEWSLETTERS',
    QUERY_GENERATION: 'QUERY_GENERATION',
    BOOKMARKS: 'BOOKMARKS'
};
exports.RESEARCH_PRIORITIES = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};
exports.SOURCE_TYPES = {
    WEBSEARCH: 'websearch',
    SOCIAL: 'social',
    BOOKMARK: 'bookmark',
    NEWSLETTER: 'newsletter',
    MANUAL: 'manual'
};
exports.RESEARCH_EXPORT_FORMATS = {
    JSON: 'json',
    CSV: 'csv',
    PDF: 'pdf'
};
exports.DEFAULT_RESEARCH_OPTIONS = {
    maxResults: 50,
    timeout: 30000,
    retryAttempts: 3,
    concurrentLimit: 3,
    MAX_QUERIES: 50,
    SEARCH_LIMIT: 100
};
exports.RESULT_PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    DEFAULT_PAGE: 1,
    MAX_LIMIT: 100,
    DEFAULT_LIMIT: 20,
    DEFAULT_OFFSET: 0
};
exports.RESEARCH_DEFAULTS = {
    MAX_RESULTS_PER_SERVICE: 50,
    TIMEOUT_MS: 30000,
    RETRY_ATTEMPTS: 3,
    CONCURRENT_LIMIT: 3
};
//# sourceMappingURL=research.constants.js.map