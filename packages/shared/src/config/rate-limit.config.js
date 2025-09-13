"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitConfig = exports.RATE_LIMIT_STORAGE = exports.RATE_LIMIT_SKIP = exports.RATE_LIMIT_MESSAGES = exports.RATE_LIMIT_HEADERS = exports.ENDPOINT_RATE_LIMITS = exports.RATE_LIMIT_TIERS = exports.RATE_LIMIT_WINDOWS = void 0;
exports.createRateLimitConfig = createRateLimitConfig;
exports.createRateLimiter = createRateLimiter;
exports.RATE_LIMIT_WINDOWS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    FIVE_MINUTES: 5 * 60 * 1000,
    FIFTEEN_MINUTES: 15 * 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
};
exports.RATE_LIMIT_TIERS = {
    FREE: {
        REQUESTS_PER_HOUR: 100,
        REQUESTS_PER_DAY: 1000,
        AI_REQUESTS_PER_DAY: 10,
        SCRAPING_REQUESTS_PER_DAY: 5,
    },
    BASIC: {
        REQUESTS_PER_HOUR: 500,
        REQUESTS_PER_DAY: 5000,
        AI_REQUESTS_PER_DAY: 50,
        SCRAPING_REQUESTS_PER_DAY: 20,
    },
    PRO: {
        REQUESTS_PER_HOUR: 2000,
        REQUESTS_PER_DAY: 20000,
        AI_REQUESTS_PER_DAY: 200,
        SCRAPING_REQUESTS_PER_DAY: 100,
    },
    ENTERPRISE: {
        REQUESTS_PER_HOUR: 10000,
        REQUESTS_PER_DAY: 100000,
        AI_REQUESTS_PER_DAY: 1000,
        SCRAPING_REQUESTS_PER_DAY: 500,
    },
};
exports.ENDPOINT_RATE_LIMITS = {
    '/api/auth/login': {
        windowMs: exports.RATE_LIMIT_WINDOWS.FIFTEEN_MINUTES,
        maxRequests: 5,
    },
    '/api/auth/register': {
        windowMs: exports.RATE_LIMIT_WINDOWS.HOUR,
        maxRequests: 3,
    },
    '/api/auth/forgot-password': {
        windowMs: exports.RATE_LIMIT_WINDOWS.HOUR,
        maxRequests: 3,
    },
    '/api/auth/reset-password': {
        windowMs: exports.RATE_LIMIT_WINDOWS.HOUR,
        maxRequests: 5,
    },
    '/api/analysis/analyze': {
        windowMs: exports.RATE_LIMIT_WINDOWS.MINUTE,
        maxRequests: 10,
    },
    '/api/research/start': {
        windowMs: exports.RATE_LIMIT_WINDOWS.MINUTE,
        maxRequests: 5,
    },
    '/api/scraper/scrape': {
        windowMs: exports.RATE_LIMIT_WINDOWS.HOUR,
        maxRequests: 10,
    },
    '/api/discovery/search': {
        windowMs: exports.RATE_LIMIT_WINDOWS.MINUTE,
        maxRequests: 30,
    },
    '/api/opportunities/search': {
        windowMs: exports.RATE_LIMIT_WINDOWS.MINUTE,
        maxRequests: 30,
    },
    '/api/archivist/export': {
        windowMs: exports.RATE_LIMIT_WINDOWS.HOUR,
        maxRequests: 10,
    },
    '/api/research/export': {
        windowMs: exports.RATE_LIMIT_WINDOWS.HOUR,
        maxRequests: 10,
    },
    '/api/*': {
        windowMs: exports.RATE_LIMIT_WINDOWS.FIFTEEN_MINUTES,
        maxRequests: 100,
    },
};
exports.RATE_LIMIT_HEADERS = {
    LIMIT: 'X-RateLimit-Limit',
    REMAINING: 'X-RateLimit-Remaining',
    RESET: 'X-RateLimit-Reset',
    RETRY_AFTER: 'Retry-After',
};
exports.RATE_LIMIT_MESSAGES = {
    TOO_MANY_REQUESTS: 'Too many requests, please try again later',
    AUTH_LIMIT_EXCEEDED: 'Too many authentication attempts, please try again later',
    API_LIMIT_EXCEEDED: 'API rate limit exceeded',
    SCRAPING_LIMIT_EXCEEDED: 'Scraping rate limit exceeded',
    AI_LIMIT_EXCEEDED: 'AI service rate limit exceeded',
    CUSTOM: (minutes) => `Rate limit exceeded. Please try again in ${minutes} minutes`,
};
exports.RATE_LIMIT_SKIP = {
    SKIP_IPS: process.env.RATE_LIMIT_SKIP_IPS?.split(',') || [],
    BYPASS_KEYS: process.env.RATE_LIMIT_BYPASS_KEYS?.split(',') || [],
    ELEVATED_ROLES: ['admin', 'moderator', 'enterprise'],
};
exports.RATE_LIMIT_STORAGE = {
    TYPE: process.env.RATE_LIMIT_STORAGE || 'memory',
    REDIS_URL: process.env.REDIS_URL,
    KEY_PREFIX: 'rate_limit:',
    CLEANUP_INTERVAL: exports.RATE_LIMIT_WINDOWS.HOUR,
};
function createRateLimitConfig() {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(exports.RATE_LIMIT_WINDOWS.FIFTEEN_MINUTES));
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
    const authWindowMs = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(exports.RATE_LIMIT_WINDOWS.FIFTEEN_MINUTES));
    const authMaxAttempts = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5');
    return {
        windowMs,
        maxRequests,
        authRateLimit: {
            windowMs: authWindowMs,
            maxAttempts: authMaxAttempts,
        },
        apiEndpoints: exports.ENDPOINT_RATE_LIMITS,
    };
}
function createRateLimiter(endpoint) {
    const config = createRateLimitConfig();
    if (endpoint && config.apiEndpoints[endpoint]) {
        return config.apiEndpoints[endpoint];
    }
    const wildcardKey = Object.keys(config.apiEndpoints).find(key => {
        if (key.includes('*') && endpoint) {
            const pattern = key.replace('*', '.*');
            return new RegExp(pattern).test(endpoint);
        }
        return false;
    });
    if (wildcardKey) {
        return config.apiEndpoints[wildcardKey];
    }
    return {
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
    };
}
exports.rateLimitConfig = createRateLimitConfig();
//# sourceMappingURL=rate-limit.config.js.map