export declare const RESEARCH_SERVICES: {
    readonly QUERY_GENERATION: "query-generation";
    readonly WEB_SEARCH: "web-search";
    readonly LLM_SEARCH: "llm-search";
    readonly SOCIAL_MEDIA: "social-media";
    readonly BOOKMARKS: "bookmarks";
    readonly NEWSLETTERS: "newsletters";
};
export declare const RESEARCH_SESSION_STATUSES: {
    readonly RUNNING: "running";
    readonly COMPLETED: "completed";
    readonly ERROR: "error";
    readonly STOPPED: "stopped";
};
export declare const RESEARCH_PRIORITIES: {
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
};
export declare const DEFAULT_RESEARCH_OPTIONS: {
    readonly MAX_QUERIES: 10;
    readonly SEARCH_LIMIT: 10;
    readonly DEFAULT_QUERY: "art grants opportunities residencies exhibitions";
    readonly RELEVANCE_RANGE: {
        readonly MIN: 0.7;
        readonly MAX: 1;
    };
};
export declare const SOURCE_TYPES: {
    readonly WEBSEARCH: "websearch";
    readonly SOCIAL: "social";
    readonly BOOKMARK: "bookmark";
    readonly NEWSLETTER: "newsletter";
};
export declare const SOCIAL_PLATFORMS: {
    readonly TWITTER: "Twitter";
    readonly INSTAGRAM: "Instagram";
    readonly LINKEDIN: "LinkedIn";
    readonly FACEBOOK: "Facebook";
};
export declare const BOOKMARK_CATEGORIES: {
    readonly GRANTS: "grants";
    readonly RESOURCES: "resources";
    readonly NEWS: "news";
    readonly OPPORTUNITIES: "opportunities";
    readonly NETWORKING: "networking";
};
export declare const PROCESSING_DELAYS: {
    readonly INITIAL_DELAY: 1000;
    readonly PROGRESS_UPDATE_DELAY: 1500;
    readonly FINAL_DELAY: 500;
};
export declare const PROGRESS_MILESTONES: {
    readonly STARTED: 10;
    readonly PROCESSING: 30;
    readonly ANALYZING: 60;
    readonly FINALIZING: 90;
    readonly COMPLETED: 100;
};
export declare const RESULT_PAGINATION: {
    readonly DEFAULT_LIMIT: 50;
    readonly DEFAULT_OFFSET: 0;
    readonly MAX_LIMIT: 200;
};
export declare const INSIGHT_TYPES: {
    readonly TREND: "trend";
    readonly OPPORTUNITY: "opportunity";
    readonly ANALYSIS: "analysis";
    readonly PREDICTION: "prediction";
};
export declare const CONFIDENCE_RANGES: {
    readonly LOW: {
        readonly MIN: 0;
        readonly MAX: 0.4;
    };
    readonly MEDIUM: {
        readonly MIN: 0.4;
        readonly MAX: 0.7;
    };
    readonly HIGH: {
        readonly MIN: 0.7;
        readonly MAX: 0.9;
    };
    readonly VERY_HIGH: {
        readonly MIN: 0.9;
        readonly MAX: 1;
    };
};
export declare const SESSION_TIMEOUTS: {
    readonly DEFAULT_TIMEOUT_MS: number;
    readonly CLEANUP_INTERVAL_MS: number;
    readonly MAX_SESSIONS_PER_USER: 5;
};
export declare const RESEARCH_EXPORT_FORMATS: {
    readonly JSON: "json";
    readonly CSV: "csv";
};
export declare const MOCK_DATA_SOURCES: {
    readonly ART_ORGANIZATIONS: readonly ["ArtWorld Weekly", "Digital Arts Foundation", "Green Arts Initiative", "Environmental Art Fund", "Virtual Art Spaces", "Online Gallery Network", "Contemporary Art News", "Funding News", "Digital Arts Network", "Sustainability Arts Council"];
    readonly NEWS_SOURCES: readonly ["ArtWorld Weekly", "Contemporary Art News", "Art Forum", "Artsy", "Hyperallergic"];
    readonly FUNDING_SOURCES: readonly ["Creative Europe", "National Endowment for the Arts", "Andy Warhol Foundation", "Ford Foundation", "Rockefeller Foundation"];
};
export declare const RESULT_TYPES: {
    readonly SEARCH_RESULT: "search_result";
    readonly INSIGHT: "insight";
    readonly SOCIAL_MENTION: "social_mention";
    readonly BOOKMARK: "bookmark";
    readonly NEWSLETTER: "newsletter";
    readonly OPPORTUNITY: "opportunity";
};
export declare const QUALITY_THRESHOLDS: {
    readonly MINIMUM_RELEVANCE: 0.3;
    readonly GOOD_RELEVANCE: 0.6;
    readonly EXCELLENT_RELEVANCE: 0.8;
    readonly MINIMUM_CONFIDENCE: 0.5;
    readonly HIGH_CONFIDENCE: 0.8;
};
//# sourceMappingURL=research.constants.d.ts.map