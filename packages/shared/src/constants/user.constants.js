"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TYPES = exports.EXPORT_FORMATS = exports.UI_STATES = exports.SETTINGS_TABS = exports.USER_VALIDATION_MESSAGES = exports.USER_PREFERENCE_DEFAULTS = exports.COMMON_LOCATIONS = exports.MATCH_SCORE = exports.AI_SETTINGS = exports.QUERY_GENERATION_STYLES = exports.USER_AI_MODELS = exports.AI_PROVIDERS = exports.APPLICATION_STYLES = exports.NOTIFICATION_FREQUENCIES = void 0;
exports.NOTIFICATION_FREQUENCIES = {
    IMMEDIATE: 'immediate',
    DAILY: 'daily',
    WEEKLY: 'weekly',
};
exports.APPLICATION_STYLES = {
    FORMAL: 'formal',
    CASUAL: 'casual',
    ARTISTIC: 'artistic',
};
exports.AI_PROVIDERS = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
};
exports.USER_AI_MODELS = {
    OPENAI: {
        GPT_4: 'gpt-4',
        GPT_3_5_TURBO: 'gpt-3.5-turbo',
    },
    ANTHROPIC: {
        CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
        CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
    },
};
exports.QUERY_GENERATION_STYLES = {
    FOCUSED: 'focused',
    DIVERSE: 'diverse',
    CREATIVE: 'creative',
};
exports.AI_SETTINGS = {
    TEMPERATURE: {
        MIN: 0,
        MAX: 1,
        DEFAULT: 0.7,
        STEP: 0.1,
    },
    MAX_TOKENS: {
        MIN: 500,
        MAX: 4000,
        DEFAULT: 2000,
        STEP: 500,
    },
};
exports.MATCH_SCORE = {
    MIN: 0.3,
    MAX: 0.95,
    DEFAULT: 0.7,
    STEP: 0.05,
    AUTO_APPLICATION_THRESHOLD: 0.95,
};
exports.COMMON_LOCATIONS = [
    'New York, NY',
    'Los Angeles, CA',
    'San Francisco, CA',
    'Chicago, IL',
    'Boston, MA',
    'Washington, DC',
    'Seattle, WA',
    'Portland, OR',
    'Austin, TX',
    'Denver, CO',
    'Miami, FL',
    'Atlanta, GA',
    'Remote/Virtual',
    'International',
    'Europe',
    'Asia',
    'North America',
    'South America',
    'Australia',
    'Canada',
    'United Kingdom',
];
exports.USER_PREFERENCE_DEFAULTS = {
    EMAIL_NOTIFICATIONS: true,
    PUSH_NOTIFICATIONS: false,
    NOTIFICATION_FREQUENCY: exports.NOTIFICATION_FREQUENCIES.DAILY,
    MINIMUM_MATCH_SCORE: 0.7,
    ENABLE_AUTO_APPLICATION: false,
    APPLICATION_STYLE: exports.APPLICATION_STYLES.FORMAL,
    INCLUDE_PORTFOLIO_LINKS: true,
    AI_PROVIDER: exports.AI_PROVIDERS.OPENAI,
    AI_MODEL: exports.USER_AI_MODELS.OPENAI.GPT_4,
    AI_TEMPERATURE: 0.7,
    AI_MAX_TOKENS: 2000,
    ENABLE_QUERY_CACHE: true,
    ENABLE_ANALYSIS_CACHE: true,
    QUERY_GENERATION_STYLE: exports.QUERY_GENERATION_STYLES.DIVERSE,
};
exports.USER_VALIDATION_MESSAGES = {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_URL: 'Please enter a valid URL',
    MIN_FUNDING_AMOUNT: 'Minimum amount must be positive',
    MAX_FUNDING_LESS_THAN_MIN: 'Maximum amount must be greater than minimum',
    API_KEY_FORMAT: 'API key format is invalid',
    WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
};
exports.SETTINGS_TABS = {
    OPPORTUNITIES: 'opportunities',
    AI: 'ai',
    API: 'api',
    NOTIFICATIONS: 'notifications',
    DATA: 'data',
    APPEARANCE: 'appearance',
};
exports.UI_STATES = {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error',
};
exports.EXPORT_FORMATS = {
    JSON: 'json',
    CSV: 'csv',
    PDF: 'pdf',
};
exports.CACHE_TYPES = {
    OPPORTUNITIES: 'opportunities',
    PROFILES: 'profiles',
    SEARCHES: 'searches',
    AI_RESPONSES: 'ai_responses',
    ALL: 'all',
};
//# sourceMappingURL=user.constants.js.map