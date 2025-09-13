/**
 * Configuration Type Definitions
 * Central type definitions for all configuration modules
 */

// Database Configuration
export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  connectionTimeout?: number;
  ssl?: boolean;
}

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  rateLimitWindow: number;
  maxRequestsPerWindow: number;
}

// Authentication Configuration
export interface AuthConfig {
  jwtSecret: string;
  bcryptRounds: number;
  sessionTimeoutHours: number;
  tokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

// AI Service Configuration
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

// Scraper Configuration
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

// Rate Limiting Configuration
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

// UI Configuration
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

// Validation Configuration
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

// Search Engine Configuration
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

// Environment Configuration
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

// Master Configuration Interface
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