"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUALITY_THRESHOLDS = exports.RESULT_TYPES = exports.MOCK_DATA_SOURCES = exports.RESEARCH_EXPORT_FORMATS = exports.SESSION_TIMEOUTS = exports.CONFIDENCE_RANGES = exports.INSIGHT_TYPES = exports.RESULT_PAGINATION = exports.PROGRESS_MILESTONES = exports.PROCESSING_DELAYS = exports.BOOKMARK_CATEGORIES = exports.SOCIAL_PLATFORMS = exports.SOURCE_TYPES = exports.DEFAULT_RESEARCH_OPTIONS = exports.RESEARCH_PRIORITIES = exports.RESEARCH_SESSION_STATUSES = exports.RESEARCH_SERVICES = void 0;
exports.RESEARCH_SERVICES = {
    QUERY_GENERATION: 'query-generation',
    WEB_SEARCH: 'web-search',
    LLM_SEARCH: 'llm-search',
    SOCIAL_MEDIA: 'social-media',
    BOOKMARKS: 'bookmarks',
    NEWSLETTERS: 'newsletters',
};
exports.RESEARCH_SESSION_STATUSES = {
    RUNNING: 'running',
    COMPLETED: 'completed',
    ERROR: 'error',
    STOPPED: 'stopped',
};
exports.RESEARCH_PRIORITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
};
exports.DEFAULT_RESEARCH_OPTIONS = {
    MAX_QUERIES: 10,
    SEARCH_LIMIT: 10,
    DEFAULT_QUERY: 'art grants opportunities residencies exhibitions',
    RELEVANCE_RANGE: { MIN: 0.7, MAX: 1.0 },
};
exports.SOURCE_TYPES = {
    WEBSEARCH: 'websearch',
    SOCIAL: 'social',
    BOOKMARK: 'bookmark',
    NEWSLETTER: 'newsletter',
};
exports.SOCIAL_PLATFORMS = {
    TWITTER: 'Twitter',
    INSTAGRAM: 'Instagram',
    LINKEDIN: 'LinkedIn',
    FACEBOOK: 'Facebook',
};
exports.BOOKMARK_CATEGORIES = {
    GRANTS: 'grants',
    RESOURCES: 'resources',
    NEWS: 'news',
    OPPORTUNITIES: 'opportunities',
    NETWORKING: 'networking',
};
exports.PROCESSING_DELAYS = {
    INITIAL_DELAY: 1000,
    PROGRESS_UPDATE_DELAY: 1500,
    FINAL_DELAY: 500,
};
exports.PROGRESS_MILESTONES = {
    STARTED: 10,
    PROCESSING: 30,
    ANALYZING: 60,
    FINALIZING: 90,
    COMPLETED: 100,
};
exports.RESULT_PAGINATION = {
    DEFAULT_LIMIT: 50,
    DEFAULT_OFFSET: 0,
    MAX_LIMIT: 200,
};
exports.INSIGHT_TYPES = {
    TREND: 'trend',
    OPPORTUNITY: 'opportunity',
    ANALYSIS: 'analysis',
    PREDICTION: 'prediction',
};
exports.CONFIDENCE_RANGES = {
    LOW: { MIN: 0.0, MAX: 0.4 },
    MEDIUM: { MIN: 0.4, MAX: 0.7 },
    HIGH: { MIN: 0.7, MAX: 0.9 },
    VERY_HIGH: { MIN: 0.9, MAX: 1.0 },
};
exports.SESSION_TIMEOUTS = {
    DEFAULT_TIMEOUT_MS: 5 * 60 * 1000,
    CLEANUP_INTERVAL_MS: 10 * 60 * 1000,
    MAX_SESSIONS_PER_USER: 5,
};
exports.RESEARCH_EXPORT_FORMATS = {
    JSON: 'json',
    CSV: 'csv',
};
exports.MOCK_DATA_SOURCES = {
    ART_ORGANIZATIONS: [
        'ArtWorld Weekly',
        'Digital Arts Foundation',
        'Green Arts Initiative',
        'Environmental Art Fund',
        'Virtual Art Spaces',
        'Online Gallery Network',
        'Contemporary Art News',
        'Funding News',
        'Digital Arts Network',
        'Sustainability Arts Council',
    ],
    NEWS_SOURCES: [
        'ArtWorld Weekly',
        'Contemporary Art News',
        'Art Forum',
        'Artsy',
        'Hyperallergic',
    ],
    FUNDING_SOURCES: [
        'Creative Europe',
        'National Endowment for the Arts',
        'Andy Warhol Foundation',
        'Ford Foundation',
        'Rockefeller Foundation',
    ],
};
exports.RESULT_TYPES = {
    SEARCH_RESULT: 'search_result',
    INSIGHT: 'insight',
    SOCIAL_MENTION: 'social_mention',
    BOOKMARK: 'bookmark',
    NEWSLETTER: 'newsletter',
    OPPORTUNITY: 'opportunity',
};
exports.QUALITY_THRESHOLDS = {
    MINIMUM_RELEVANCE: 0.3,
    GOOD_RELEVANCE: 0.6,
    EXCELLENT_RELEVANCE: 0.8,
    MINIMUM_CONFIDENCE: 0.5,
    HIGH_CONFIDENCE: 0.8,
};
//# sourceMappingURL=research.constants.js.map