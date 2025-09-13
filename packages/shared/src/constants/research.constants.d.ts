export declare const RESEARCH_SESSION_STATUSES: {
    readonly RUNNING: "RUNNING";
    readonly COMPLETED: "COMPLETED";
    readonly STOPPED: "STOPPED";
    readonly ERROR: "ERROR";
};
export type ResearchSessionStatus = typeof RESEARCH_SESSION_STATUSES[keyof typeof RESEARCH_SESSION_STATUSES];
export declare const RESEARCH_SERVICES: {
    readonly WEB_SEARCH: "WEB_SEARCH";
    readonly SOCIAL_MEDIA: "SOCIAL_MEDIA";
    readonly LLM_SEARCH: "LLM_SEARCH";
    readonly NEWSLETTERS: "NEWSLETTERS";
    readonly QUERY_GENERATION: "QUERY_GENERATION";
    readonly BOOKMARKS: "BOOKMARKS";
};
export type ResearchService = typeof RESEARCH_SERVICES[keyof typeof RESEARCH_SERVICES];
export declare const RESEARCH_PRIORITIES: {
    readonly HIGH: "high";
    readonly MEDIUM: "medium";
    readonly LOW: "low";
};
export declare const SOURCE_TYPES: {
    readonly WEBSEARCH: "websearch";
    readonly SOCIAL: "social";
    readonly BOOKMARK: "bookmark";
    readonly NEWSLETTER: "newsletter";
    readonly MANUAL: "manual";
};
export declare const RESEARCH_EXPORT_FORMATS: {
    readonly JSON: "json";
    readonly CSV: "csv";
    readonly PDF: "pdf";
};
export declare const DEFAULT_RESEARCH_OPTIONS: {
    readonly maxResults: 50;
    readonly timeout: 30000;
    readonly retryAttempts: 3;
    readonly concurrentLimit: 3;
    readonly MAX_QUERIES: 50;
    readonly SEARCH_LIMIT: 100;
};
export declare const RESULT_PAGINATION: {
    readonly DEFAULT_PAGE_SIZE: 20;
    readonly MAX_PAGE_SIZE: 100;
    readonly DEFAULT_PAGE: 1;
    readonly MAX_LIMIT: 100;
    readonly DEFAULT_LIMIT: 20;
    readonly DEFAULT_OFFSET: 0;
};
export declare const RESEARCH_DEFAULTS: {
    readonly MAX_RESULTS_PER_SERVICE: 50;
    readonly TIMEOUT_MS: 30000;
    readonly RETRY_ATTEMPTS: 3;
    readonly CONCURRENT_LIMIT: 3;
};
