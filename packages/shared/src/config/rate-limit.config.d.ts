import { RateLimitConfig } from './types';
export declare const RATE_LIMIT_WINDOWS: {
    readonly SECOND: 1000;
    readonly MINUTE: number;
    readonly FIVE_MINUTES: number;
    readonly FIFTEEN_MINUTES: number;
    readonly HOUR: number;
    readonly DAY: number;
};
export declare const RATE_LIMIT_TIERS: {
    readonly FREE: {
        readonly REQUESTS_PER_HOUR: 100;
        readonly REQUESTS_PER_DAY: 1000;
        readonly AI_REQUESTS_PER_DAY: 10;
        readonly SCRAPING_REQUESTS_PER_DAY: 5;
    };
    readonly BASIC: {
        readonly REQUESTS_PER_HOUR: 500;
        readonly REQUESTS_PER_DAY: 5000;
        readonly AI_REQUESTS_PER_DAY: 50;
        readonly SCRAPING_REQUESTS_PER_DAY: 20;
    };
    readonly PRO: {
        readonly REQUESTS_PER_HOUR: 2000;
        readonly REQUESTS_PER_DAY: 20000;
        readonly AI_REQUESTS_PER_DAY: 200;
        readonly SCRAPING_REQUESTS_PER_DAY: 100;
    };
    readonly ENTERPRISE: {
        readonly REQUESTS_PER_HOUR: 10000;
        readonly REQUESTS_PER_DAY: 100000;
        readonly AI_REQUESTS_PER_DAY: 1000;
        readonly SCRAPING_REQUESTS_PER_DAY: 500;
    };
};
export declare const ENDPOINT_RATE_LIMITS: {
    readonly '/api/auth/login': {
        readonly windowMs: number;
        readonly maxRequests: 5;
    };
    readonly '/api/auth/register': {
        readonly windowMs: number;
        readonly maxRequests: 3;
    };
    readonly '/api/auth/forgot-password': {
        readonly windowMs: number;
        readonly maxRequests: 3;
    };
    readonly '/api/auth/reset-password': {
        readonly windowMs: number;
        readonly maxRequests: 5;
    };
    readonly '/api/analysis/analyze': {
        readonly windowMs: number;
        readonly maxRequests: 10;
    };
    readonly '/api/research/start': {
        readonly windowMs: number;
        readonly maxRequests: 5;
    };
    readonly '/api/scraper/scrape': {
        readonly windowMs: number;
        readonly maxRequests: 10;
    };
    readonly '/api/discovery/search': {
        readonly windowMs: number;
        readonly maxRequests: 30;
    };
    readonly '/api/opportunities/search': {
        readonly windowMs: number;
        readonly maxRequests: 30;
    };
    readonly '/api/archivist/export': {
        readonly windowMs: number;
        readonly maxRequests: 10;
    };
    readonly '/api/research/export': {
        readonly windowMs: number;
        readonly maxRequests: 10;
    };
    readonly '/api/*': {
        readonly windowMs: number;
        readonly maxRequests: 100;
    };
};
export declare const RATE_LIMIT_HEADERS: {
    readonly LIMIT: "X-RateLimit-Limit";
    readonly REMAINING: "X-RateLimit-Remaining";
    readonly RESET: "X-RateLimit-Reset";
    readonly RETRY_AFTER: "Retry-After";
};
export declare const RATE_LIMIT_MESSAGES: {
    readonly TOO_MANY_REQUESTS: "Too many requests, please try again later";
    readonly AUTH_LIMIT_EXCEEDED: "Too many authentication attempts, please try again later";
    readonly API_LIMIT_EXCEEDED: "API rate limit exceeded";
    readonly SCRAPING_LIMIT_EXCEEDED: "Scraping rate limit exceeded";
    readonly AI_LIMIT_EXCEEDED: "AI service rate limit exceeded";
    readonly CUSTOM: (minutes: number) => string;
};
export declare const RATE_LIMIT_SKIP: {
    readonly SKIP_IPS: string[];
    readonly BYPASS_KEYS: string[];
    readonly ELEVATED_ROLES: readonly ["admin", "moderator", "enterprise"];
};
export declare const RATE_LIMIT_STORAGE: {
    readonly TYPE: string;
    readonly REDIS_URL: string | undefined;
    readonly KEY_PREFIX: "rate_limit:";
    readonly CLEANUP_INTERVAL: number;
};
export declare function createRateLimitConfig(): RateLimitConfig;
export declare function createRateLimiter(endpoint?: string): {
    windowMs: number;
    maxRequests: number;
} | undefined;
export declare const rateLimitConfig: RateLimitConfig;
//# sourceMappingURL=rate-limit.config.d.ts.map