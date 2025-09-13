/**
 * Configuration Validator
 * Validates environment variables and configuration at startup
 */

import { AppConfig } from './types';
import { createApiConfig } from './api.config';
import { createDatabaseConfig } from './database.config';
import { createAuthConfig } from './auth.config';
import { createAiConfig } from './ai.config';
import { createRateLimitConfig } from './rate-limit.config';
import { createUiConfig } from './ui.config';
import { createValidationConfig } from './validation.config';
import { 
  createLinkedInScraperConfig, 
  createTwitterScraperConfig, 
  createBingScraperConfig,
  createDefaultScraperConfig 
} from './scraper.config';

// Required environment variables
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
} as const;

// Optional environment variables with defaults
const OPTIONAL_ENV_VARS = {
  // Server
  PORT: '3001',
  HOST: 'localhost',
  
  // Database
  DB_MAX_CONNECTIONS: '10',
  DB_CONNECTION_TIMEOUT: '20000',
  
  // Auth
  BCRYPT_ROUNDS: '12',
  SESSION_TIMEOUT_HOURS: '24',
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX_REQUESTS: '100',
  AUTH_RATE_LIMIT_MAX: '5',
  AUTH_RATE_LIMIT_WINDOW_MS: '900000',
  
  // AI
  AI_MODEL_PRIMARY: 'gpt-4',
  AI_MODEL_FALLBACK: 'gpt-3.5-turbo',
  AI_MAX_TOKENS: '2000',
  AI_RATE_LIMIT: '100',
  AI_TEMPERATURE: '0.7',
  
  // Logging
  LOG_LEVEL: 'info',
  
  // Health check
  HEALTH_CHECK_ENABLED: 'true',
  
  // Search services
  GOOGLE_API_KEY: '',
  GOOGLE_SEARCH_ENGINE_ID: '',
  BING_API_KEY: '',
  SERPAPI_KEY: '',
  
  // Web scraping
  SCRAPER_HEADLESS: 'true',
  SCRAPER_MAX_CONCURRENT: '3',
  
  // External APIs
  API_BASE_URL: '',
} as const;

// Warning environment variables (warn if not set but don't fail)
const WARNING_ENV_VARS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SERPAPI_KEY',
  'FIRECRAWL_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
] as const;

/**
 * Validates that required environment variables are set
 */
export function validateEnvironment(): void {
  const env = process.env.NODE_ENV || 'development';
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables based on environment
  const requiredVars = REQUIRED_ENV_VARS[env.toUpperCase() as keyof typeof REQUIRED_ENV_VARS] || REQUIRED_ENV_VARS.DEVELOPMENT;
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check warning variables
  for (const varName of WARNING_ENV_VARS) {
    if (!process.env[varName]) {
      warnings.push(`Missing optional environment variable: ${varName} - Some features may be limited`);
    }
  }

  // Set defaults for optional variables
  for (const [key, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  }

  // Validate specific variable formats
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

  // Log warnings
  if (warnings.length > 0) {
    console.warn('Configuration warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Throw error if any required variables are missing or invalid
  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid configuration. Please check environment variables.');
  }

  console.log(`✅ Configuration validated for ${env} environment`);
}

/**
 * Validates a database URL
 */
function isValidDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
  } catch {
    return false;
  }
}

/**
 * Creates and validates the complete application configuration
 */
export function validateConfig(): AppConfig {
  // Validate environment first
  validateEnvironment();

  const env = process.env.NODE_ENV || 'development';
  
  try {
    const config: AppConfig = {
      environment: {
        env: env as 'development' | 'test' | 'staging' | 'production',
        isDevelopment: env === 'development',
        isProduction: env === 'production',
        isTest: env === 'test',
        port: parseInt(process.env.PORT || '3001'),
        host: process.env.HOST || 'localhost',
        corsOrigins: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
      },
      database: createDatabaseConfig(env),
      api: createApiConfig(env),
      auth: createAuthConfig(env),
      ai: createAiConfig(),
      scrapers: {
        linkedin: createLinkedInScraperConfig(),
        twitter: createTwitterScraperConfig(),
        bing: createBingScraperConfig(),
        default: createDefaultScraperConfig(),
      },
      rateLimit: createRateLimitConfig(),
      ui: createUiConfig(),
      validation: createValidationConfig(),
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
  } catch (error) {
    console.error('Failed to create application configuration:', error);
    throw error;
  }
}

/**
 * Gets the current configuration (creates it if not already created)
 */
let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = validateConfig();
  }
  return cachedConfig;
}

/**
 * Resets the configuration cache (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

// Export a default validated configuration
export const config = getConfig();