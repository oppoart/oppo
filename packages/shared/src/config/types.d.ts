export interface DatabaseConfig {
    url: string;
    maxConnections?: number;
    connectionTimeout?: number;
    ssl?: boolean;
}
export interface ApiConfig {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    rateLimitWindow: number;
    maxRequestsPerWindow: number;
}
export interface AuthConfig {
    jwtSecret: string;
    bcryptRounds: number;
    sessionTimeoutHours: number;
    tokenExpiresIn: string;
    refreshTokenExpiresIn: string;
}
export interface AiConfig {
    openai: {
        apiKey: string;
        model: string;
        maxTokens: number;
        temperature: number;
    };
    anthropic?: {
        apiKey: string;
        model: string;
        maxTokens: number;
    };
    fallbackModel?: string;
    rateLimit: number;
}
export interface ScraperConfig {
    defaultTimeout: number;
    retryAttempts: number;
    userAgent: string;
    headless: boolean;
    viewport: {
        width: number;
        height: number;
    };
    selectors: {
        [key: string]: string;
    };
    waitConditions: {
        [key: string]: number;
    };
}
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    authRateLimit: {
        windowMs: number;
        maxAttempts: number;
    };
    apiEndpoints: {
        [endpoint: string]: {
            windowMs: number;
            maxRequests: number;
        };
    };
}
export interface UiConfig {
    pagination: {
        defaultPageSize: number;
        maxPageSize: number;
    };
    formDefaults: {
        debounceMs: number;
        maxFileSize: number;
        allowedFileTypes: string[];
    };
    animations: {
        duration: number;
        easing: string;
    };
    theme: {
        primaryColor: string;
        secondaryColor: string;
        errorColor: string;
        successColor: string;
        warningColor: string;
    };
}
export interface ValidationConfig {
    password: {
        minLength: number;
        maxLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
    };
    username: {
        minLength: number;
        maxLength: number;
        pattern: RegExp;
    };
    email: {
        pattern: RegExp;
        maxLength: number;
    };
    profile: {
        maxBioLength: number;
        maxSkillsCount: number;
        maxTagsCount: number;
    };
}
export interface SearchEngineConfig {
    google: {
        apiKey?: string;
        searchEngineId?: string;
        maxResults: number;
    };
    bing: {
        apiKey?: string;
        maxResults: number;
    };
    serpApi: {
        apiKey?: string;
        engine: string;
        maxResults: number;
    };
}
export type Environment = 'development' | 'test' | 'staging' | 'production';
export interface EnvironmentConfig {
    env: Environment;
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
    port: number;
    host: string;
    corsOrigins: string[];
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
export interface AppConfig {
    environment: EnvironmentConfig;
    database: DatabaseConfig;
    api: ApiConfig;
    auth: AuthConfig;
    ai: AiConfig;
    scrapers: {
        linkedin: ScraperConfig;
        twitter: ScraperConfig;
        bing: ScraperConfig;
        default: ScraperConfig;
    };
    rateLimit: RateLimitConfig;
    ui: UiConfig;
    validation: ValidationConfig;
    searchEngines: SearchEngineConfig;
}
//# sourceMappingURL=types.d.ts.map