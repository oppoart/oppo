"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateEnvironment = validateEnvironment;
exports.validateConfig = validateConfig;
exports.getConfig = getConfig;
exports.resetConfig = resetConfig;
const api_config_1 = require("./api.config");
const database_config_1 = require("./database.config");
const auth_config_1 = require("./auth.config");
const ai_config_1 = require("./ai.config");
const rate_limit_config_1 = require("./rate-limit.config");
const ui_config_1 = require("./ui.config");
const validation_config_1 = require("./validation.config");
const scraper_config_1 = require("./scraper.config");
const REQUIRED_ENV_VARS = {
    PRODUCTION: [
        'NODE_ENV',
        'DATABASE_URL',
        'JWT_SECRET',
        'FRONTEND_URL',
        'CORS_ORIGIN',
    ],
    DEVELOPMENT: [
        'NODE_ENV',
        'DATABASE_URL',
        'JWT_SECRET',
    ],
    TEST: [
        'NODE_ENV',
    ],
};
const OPTIONAL_ENV_VARS = {
    PORT: '3001',
    HOST: 'localhost',
    DB_MAX_CONNECTIONS: '10',
    DB_CONNECTION_TIMEOUT: '20000',
    BCRYPT_ROUNDS: '12',
    SESSION_TIMEOUT_HOURS: '24',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    AUTH_RATE_LIMIT_MAX: '5',
    AUTH_RATE_LIMIT_WINDOW_MS: '900000',
    AI_MODEL_PRIMARY: 'gpt-4',
    AI_MODEL_FALLBACK: 'gpt-3.5-turbo',
    AI_MAX_TOKENS: '2000',
    AI_RATE_LIMIT: '100',
    AI_TEMPERATURE: '0.7',
    LOG_LEVEL: 'info',
    HEALTH_CHECK_ENABLED: 'true',
    GOOGLE_API_KEY: '',
    GOOGLE_SEARCH_ENGINE_ID: '',
    BING_API_KEY: '',
    SERPAPI_KEY: '',
    SCRAPER_HEADLESS: 'true',
    SCRAPER_MAX_CONCURRENT: '3',
    API_BASE_URL: '',
};
const WARNING_ENV_VARS = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'SERPAPI_KEY',
    'FIRECRAWL_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
];
function validateEnvironment() {
    const env = process.env.NODE_ENV || 'development';
    const errors = [];
    const warnings = [];
    const requiredVars = REQUIRED_ENV_VARS[env.toUpperCase()] || REQUIRED_ENV_VARS.DEVELOPMENT;
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            errors.push(`Missing required environment variable: ${varName}`);
        }
    }
    for (const varName of WARNING_ENV_VARS) {
        if (!process.env[varName]) {
            warnings.push(`Missing optional environment variable: ${varName} - Some features may be limited`);
        }
    }
    for (const [key, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
        if (!process.env[key]) {
            process.env[key] = defaultValue;
        }
    }
    if (process.env.DATABASE_URL && !isValidDatabaseUrl(process.env.DATABASE_URL)) {
        errors.push('DATABASE_URL is not a valid PostgreSQL connection string');
    }
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET should be at least 32 characters long');
    }
    if (process.env.BCRYPT_ROUNDS) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS);
        if (isNaN(rounds) || rounds < 10 || rounds > 15) {
            errors.push('BCRYPT_ROUNDS must be between 10 and 15');
        }
    }
    if (process.env.PORT) {
        const port = parseInt(process.env.PORT);
        if (isNaN(port) || port < 1 || port > 65535) {
            errors.push('PORT must be a valid port number (1-65535)');
        }
    }
    if (warnings.length > 0) {
        console.warn('Configuration warnings:');
        warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    if (errors.length > 0) {
        console.error('Configuration errors:');
        errors.forEach(error => console.error(`  - ${error}`));
        throw new Error('Invalid configuration. Please check environment variables.');
    }
    console.log(`✅ Configuration validated for ${env} environment`);
}
function isValidDatabaseUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
    }
    catch {
        return false;
    }
}
function validateConfig() {
    validateEnvironment();
    const env = process.env.NODE_ENV || 'development';
    try {
        const config = {
            environment: {
                env: env,
                isDevelopment: env === 'development',
                isProduction: env === 'production',
                isTest: env === 'test',
                port: parseInt(process.env.PORT || '3001'),
                host: process.env.HOST || 'localhost',
                corsOrigins: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
                logLevel: (process.env.LOG_LEVEL || 'info'),
            },
            database: (0, database_config_1.createDatabaseConfig)(env),
            api: (0, api_config_1.createApiConfig)(env),
            auth: (0, auth_config_1.createAuthConfig)(env),
            ai: (0, ai_config_1.createAiConfig)(),
            scrapers: {
                linkedin: (0, scraper_config_1.createLinkedInScraperConfig)(),
                twitter: (0, scraper_config_1.createTwitterScraperConfig)(),
                bing: (0, scraper_config_1.createBingScraperConfig)(),
                default: (0, scraper_config_1.createDefaultScraperConfig)(),
            },
            rateLimit: (0, rate_limit_config_1.createRateLimitConfig)(),
            ui: (0, ui_config_1.createUiConfig)(),
            validation: (0, validation_config_1.createValidationConfig)(),
            searchEngines: {
                google: {
                    apiKey: process.env.GOOGLE_API_KEY,
                    searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
                    maxResults: 10,
                },
                bing: {
                    apiKey: process.env.BING_API_KEY,
                    maxResults: 10,
                },
                serpApi: {
                    apiKey: process.env.SERPAPI_KEY,
                    engine: 'google',
                    maxResults: 10,
                },
            },
        };
        console.log('✅ Application configuration created successfully');
        return config;
    }
    catch (error) {
        console.error('Failed to create application configuration:', error);
        throw error;
    }
}
let cachedConfig = null;
function getConfig() {
    if (!cachedConfig) {
        cachedConfig = validateConfig();
    }
    return cachedConfig;
}
function resetConfig() {
    cachedConfig = null;
}
exports.config = getConfig();
//# sourceMappingURL=validator.js.map