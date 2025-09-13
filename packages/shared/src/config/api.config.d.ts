import { ApiConfig } from './types';
export declare const API_TIMEOUTS: {
    readonly DEFAULT: 30000;
    readonly UPLOAD: 120000;
    readonly SEARCH: 60000;
    readonly AI_PROCESSING: 90000;
    readonly SCRAPING: 180000;
};
export declare const API_RETRY: {
    readonly MAX_ATTEMPTS: 3;
    readonly INITIAL_DELAY: 1000;
    readonly MAX_DELAY: 10000;
    readonly BACKOFF_MULTIPLIER: 2;
};
export declare const API_ENDPOINTS: {
    readonly AUTH: {
        readonly LOGIN: "/api/auth/login";
        readonly LOGOUT: "/api/auth/logout";
        readonly REGISTER: "/api/auth/register";
        readonly REFRESH: "/api/auth/refresh";
        readonly VERIFY: "/api/auth/verify";
        readonly FORGOT_PASSWORD: "/api/auth/forgot-password";
        readonly RESET_PASSWORD: "/api/auth/reset-password";
    };
    readonly USER: {
        readonly PROFILE: "/api/users/profile";
        readonly UPDATE: "/api/users/update";
        readonly DELETE: "/api/users/delete";
        readonly PREFERENCES: "/api/users/preferences";
    };
    readonly ARTIST: {
        readonly PROFILES: "/api/artists/profiles";
        readonly CREATE: "/api/artists/create";
        readonly UPDATE: "/api/artists/update";
        readonly DELETE: "/api/artists/delete";
    };
    readonly OPPORTUNITY: {
        readonly LIST: "/api/opportunities";
        readonly DETAIL: "/api/opportunities/:id";
        readonly CREATE: "/api/opportunities/create";
        readonly UPDATE: "/api/opportunities/update";
        readonly DELETE: "/api/opportunities/delete";
        readonly SEARCH: "/api/opportunities/search";
        readonly HIGH_RELEVANCE: "/api/opportunities/high-relevance";
    };
    readonly RESEARCH: {
        readonly START: "/api/research/start";
        readonly STOP: "/api/research/stop";
        readonly STATUS: "/api/research/status/:serviceId/:sessionId";
        readonly RESULTS: "/api/research/results/:serviceId/:sessionId";
        readonly SESSIONS: "/api/research/sessions/:profileId";
        readonly FETCH: "/api/research/fetch-opportunities";
        readonly EXPORT: "/api/research/export";
    };
    readonly DISCOVERY: {
        readonly SEARCH: "/api/discovery/search";
        readonly OPPORTUNITIES: "/api/discovery/opportunities";
        readonly ANALYZE: "/api/discovery/analyze-profile";
    };
    readonly ARCHIVIST: {
        readonly OPPORTUNITIES: "/api/archivist/opportunities";
        readonly OPPORTUNITY_DETAIL: "/api/archivist/opportunities/:id";
        readonly ARCHIVE: "/api/archivist/archive";
        readonly HIGH_RELEVANCE: "/api/archivist/opportunities/high-relevance";
        readonly EXPORT: "/api/archivist/export";
        readonly STATS: "/api/archivist/stats";
    };
    readonly ANALYSIS: {
        readonly ANALYZE: "/api/analysis/analyze";
        readonly SCORE: "/api/analysis/score";
        readonly BATCH: "/api/analysis/batch";
    };
    readonly SCRAPER: {
        readonly SCRAPE: "/api/scraper/scrape";
        readonly STATUS: "/api/scraper/status/:jobId";
        readonly RESULTS: "/api/scraper/results/:jobId";
    };
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly ACCEPTED: 202;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const API_MESSAGES: {
    readonly SUCCESS: {
        readonly CREATED: "Resource created successfully";
        readonly UPDATED: "Resource updated successfully";
        readonly DELETED: "Resource deleted successfully";
        readonly FETCHED: "Data fetched successfully";
    };
    readonly ERROR: {
        readonly NOT_FOUND: "Resource not found";
        readonly UNAUTHORIZED: "Unauthorized access";
        readonly FORBIDDEN: "Access forbidden";
        readonly INVALID_INPUT: "Invalid input provided";
        readonly SERVER_ERROR: "Internal server error";
        readonly RATE_LIMITED: "Too many requests, please try again later";
        readonly SERVICE_UNAVAILABLE: "Service temporarily unavailable";
    };
};
export declare function createApiConfig(env?: string): ApiConfig;
export declare const apiConfig: ApiConfig;
