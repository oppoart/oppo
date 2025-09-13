export declare const NOTIFICATION_FREQUENCIES: {
    readonly IMMEDIATE: "immediate";
    readonly DAILY: "daily";
    readonly WEEKLY: "weekly";
};
export declare const APPLICATION_STYLES: {
    readonly FORMAL: "formal";
    readonly CASUAL: "casual";
    readonly ARTISTIC: "artistic";
};
export declare const AI_PROVIDERS: {
    readonly OPENAI: "openai";
    readonly ANTHROPIC: "anthropic";
};
export declare const USER_AI_MODELS: {
    readonly OPENAI: {
        readonly GPT_4: "gpt-4";
        readonly GPT_3_5_TURBO: "gpt-3.5-turbo";
    };
    readonly ANTHROPIC: {
        readonly CLAUDE_3_SONNET: "claude-3-sonnet-20240229";
        readonly CLAUDE_3_HAIKU: "claude-3-haiku-20240307";
    };
};
export declare const QUERY_GENERATION_STYLES: {
    readonly FOCUSED: "focused";
    readonly DIVERSE: "diverse";
    readonly CREATIVE: "creative";
};
export declare const AI_SETTINGS: {
    readonly TEMPERATURE: {
        readonly MIN: 0;
        readonly MAX: 1;
        readonly DEFAULT: 0.7;
        readonly STEP: 0.1;
    };
    readonly MAX_TOKENS: {
        readonly MIN: 500;
        readonly MAX: 4000;
        readonly DEFAULT: 2000;
        readonly STEP: 500;
    };
};
export declare const MATCH_SCORE: {
    readonly MIN: 0.3;
    readonly MAX: 0.95;
    readonly DEFAULT: 0.7;
    readonly STEP: 0.05;
    readonly AUTO_APPLICATION_THRESHOLD: 0.95;
};
export declare const COMMON_LOCATIONS: readonly ["New York, NY", "Los Angeles, CA", "San Francisco, CA", "Chicago, IL", "Boston, MA", "Washington, DC", "Seattle, WA", "Portland, OR", "Austin, TX", "Denver, CO", "Miami, FL", "Atlanta, GA", "Remote/Virtual", "International", "Europe", "Asia", "North America", "South America", "Australia", "Canada", "United Kingdom"];
export declare const USER_PREFERENCE_DEFAULTS: {
    readonly EMAIL_NOTIFICATIONS: true;
    readonly PUSH_NOTIFICATIONS: false;
    readonly NOTIFICATION_FREQUENCY: "daily";
    readonly MINIMUM_MATCH_SCORE: 0.7;
    readonly ENABLE_AUTO_APPLICATION: false;
    readonly APPLICATION_STYLE: "formal";
    readonly INCLUDE_PORTFOLIO_LINKS: true;
    readonly AI_PROVIDER: "openai";
    readonly AI_MODEL: "gpt-4";
    readonly AI_TEMPERATURE: 0.7;
    readonly AI_MAX_TOKENS: 2000;
    readonly ENABLE_QUERY_CACHE: true;
    readonly ENABLE_ANALYSIS_CACHE: true;
    readonly QUERY_GENERATION_STYLE: "diverse";
};
export declare const USER_VALIDATION_MESSAGES: {
    readonly REQUIRED_FIELD: "This field is required";
    readonly INVALID_EMAIL: "Please enter a valid email address";
    readonly INVALID_URL: "Please enter a valid URL";
    readonly MIN_FUNDING_AMOUNT: "Minimum amount must be positive";
    readonly MAX_FUNDING_LESS_THAN_MIN: "Maximum amount must be greater than minimum";
    readonly API_KEY_FORMAT: "API key format is invalid";
    readonly WEAK_PASSWORD: "Password must be at least 8 characters with uppercase, lowercase, and numbers";
};
export declare const SETTINGS_TABS: {
    readonly OPPORTUNITIES: "opportunities";
    readonly AI: "ai";
    readonly API: "api";
    readonly NOTIFICATIONS: "notifications";
    readonly DATA: "data";
    readonly APPEARANCE: "appearance";
};
export declare const UI_STATES: {
    readonly IDLE: "idle";
    readonly LOADING: "loading";
    readonly SUCCESS: "success";
    readonly ERROR: "error";
};
export declare const EXPORT_FORMATS: {
    readonly JSON: "json";
    readonly CSV: "csv";
    readonly PDF: "pdf";
};
export declare const CACHE_TYPES: {
    readonly OPPORTUNITIES: "opportunities";
    readonly PROFILES: "profiles";
    readonly SEARCHES: "searches";
    readonly AI_RESPONSES: "ai_responses";
    readonly ALL: "all";
};
