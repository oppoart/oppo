export declare const APP_INFO: {
    readonly NAME: "OPPO";
    readonly FULL_NAME: "Opportunity Discovery Platform";
    readonly VERSION: "1.0.0";
    readonly DESCRIPTION: "AI-powered opportunity discovery platform for artists";
    readonly AUTHOR: "OPPO Team";
    readonly HOMEPAGE: "https://oppo.app";
    readonly SUPPORT_EMAIL: "support@oppo.app";
};
export declare const PAGINATION_DEFAULTS: {
    readonly PAGE: 1;
    readonly LIMIT: 20;
    readonly MAX_LIMIT: 100;
    readonly OFFSET: 0;
};
export declare const DATE_FORMATS: {
    readonly ISO: "YYYY-MM-DDTHH:mm:ss.SSSZ";
    readonly DATE: "YYYY-MM-DD";
    readonly TIME: "HH:mm:ss";
    readonly DISPLAY: "MMM DD, YYYY";
    readonly DISPLAY_WITH_TIME: "MMM DD, YYYY h:mm A";
    readonly RELATIVE_THRESHOLD_DAYS: 7;
};
export declare const FILE_SIZE_LIMITS: {
    readonly AVATAR_MAX_SIZE: number;
    readonly DOCUMENT_MAX_SIZE: number;
    readonly IMAGE_MAX_SIZE: number;
    readonly PORTFOLIO_MAX_SIZE: number;
};
export declare const SUPPORTED_FILE_TYPES: {
    readonly IMAGES: readonly ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    readonly DOCUMENTS: readonly ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    readonly PORTFOLIOS: readonly ["application/pdf", "application/zip"];
};
export declare const CACHE_DURATIONS: {
    readonly ONE_MINUTE: number;
    readonly FIVE_MINUTES: number;
    readonly FIFTEEN_MINUTES: number;
    readonly ONE_HOUR: number;
    readonly ONE_DAY: number;
    readonly ONE_WEEK: number;
};
export declare const RETRY_CONFIGS: {
    readonly DEFAULT: {
        readonly MAX_ATTEMPTS: 3;
        readonly INITIAL_DELAY: 1000;
        readonly MAX_DELAY: 10000;
        readonly BACKOFF_MULTIPLIER: 2;
    };
    readonly API_CALLS: {
        readonly MAX_ATTEMPTS: 3;
        readonly INITIAL_DELAY: 500;
        readonly MAX_DELAY: 5000;
        readonly BACKOFF_MULTIPLIER: 1.5;
    };
    readonly FILE_UPLOAD: {
        readonly MAX_ATTEMPTS: 5;
        readonly INITIAL_DELAY: 2000;
        readonly MAX_DELAY: 20000;
        readonly BACKOFF_MULTIPLIER: 2;
    };
};
export declare const URLS: {
    readonly DEVELOPMENT: {
        readonly FRONTEND: "http://localhost:3000";
        readonly BACKEND: "http://localhost:3001";
        readonly API: "http://localhost:3001/api";
    };
    readonly PRODUCTION: {
        readonly FRONTEND: "https://app.oppo.com";
        readonly BACKEND: "https://api.oppo.com";
        readonly API: "https://api.oppo.com/api";
    };
};
export declare const EXTERNAL_SERVICES: {
    readonly OPENAI: {
        readonly BASE_URL: "https://api.openai.com/v1";
        readonly MODELS_URL: "/models";
        readonly CHAT_URL: "/chat/completions";
        readonly EMBEDDINGS_URL: "/embeddings";
    };
    readonly ANTHROPIC: {
        readonly BASE_URL: "https://api.anthropic.com/v1";
        readonly MESSAGES_URL: "/messages";
    };
    readonly SERPAPI: {
        readonly BASE_URL: "https://serpapi.com/search";
    };
    readonly FIRECRAWL: {
        readonly BASE_URL: "https://api.firecrawl.dev";
        readonly SCRAPE_URL: "/v0/scrape";
    };
};
export declare const REGEX_PATTERNS: {
    readonly EMAIL: RegExp;
    readonly USERNAME: RegExp;
    readonly URL: RegExp;
    readonly PHONE: RegExp;
    readonly UUID: RegExp;
    readonly STRONG_PASSWORD: RegExp;
    readonly SLUG: RegExp;
};
export declare const STATUSES: {
    readonly ACTIVE: "active";
    readonly INACTIVE: "inactive";
    readonly PENDING: "pending";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly CANCELLED: "cancelled";
    readonly PROCESSING: "processing";
    readonly DRAFT: "draft";
    readonly PUBLISHED: "published";
    readonly ARCHIVED: "archived";
};
export declare const PRIORITIES: {
    readonly LOW: 1;
    readonly MEDIUM: 2;
    readonly HIGH: 3;
    readonly URGENT: 4;
    readonly CRITICAL: 5;
};
export declare const SEVERITY_LEVELS: {
    readonly INFO: "info";
    readonly WARNING: "warning";
    readonly ERROR: "error";
    readonly CRITICAL: "critical";
};
//# sourceMappingURL=app.constants.d.ts.map