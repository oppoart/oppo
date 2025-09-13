/**
 * Rate Limiting Configuration
 * Centralized rate limiting settings
 */

import { RateLimitConfig } from './types';

// Default rate limit windows (in milliseconds)
export const RATE_LIMIT_WINDOWS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// Rate limit tiers
export const RATE_LIMIT_TIERS = {
  FREE: {
    REQUESTS_PER_HOUR: 100,
    REQUESTS_PER_DAY: 1000,
    AI_REQUESTS_PER_DAY: 10,
    SCRAPING_REQUESTS_PER_DAY: 5,
  },
  BASIC: {
    REQUESTS_PER_HOUR: 500,
    REQUESTS_PER_DAY: 5000,
    AI_REQUESTS_PER_DAY: 50,
    SCRAPING_REQUESTS_PER_DAY: 20,
  },
  PRO: {
    REQUESTS_PER_HOUR: 2000,
    REQUESTS_PER_DAY: 20000,
    AI_REQUESTS_PER_DAY: 200,
    SCRAPING_REQUESTS_PER_DAY: 100,
  },
  ENTERPRISE: {
    REQUESTS_PER_HOUR: 10000,
    REQUESTS_PER_DAY: 100000,
    AI_REQUESTS_PER_DAY: 1000,
    SCRAPING_REQUESTS_PER_DAY: 500,
  },
} as const;

// API endpoint rate limits
export const ENDPOINT_RATE_LIMITS = {
  // Authentication endpoints
  '/api/auth/login': {
    windowMs: RATE_LIMIT_WINDOWS.FIFTEEN_MINUTES,
    maxRequests: 5,
  },
  '/api/auth/register': {
    windowMs: RATE_LIMIT_WINDOWS.HOUR,
    maxRequests: 3,
  },
  '/api/auth/forgot-password': {
    windowMs: RATE_LIMIT_WINDOWS.HOUR,
    maxRequests: 3,
  },
  '/api/auth/reset-password': {
    windowMs: RATE_LIMIT_WINDOWS.HOUR,
    maxRequests: 5,
  },
  
  // AI endpoints
  '/api/analysis/analyze': {
    windowMs: RATE_LIMIT_WINDOWS.MINUTE,
    maxRequests: 10,
  },
  '/api/research/start': {
    windowMs: RATE_LIMIT_WINDOWS.MINUTE,
    maxRequests: 5,
  },
  
  // Scraping endpoints
  '/api/scraper/scrape': {
    windowMs: RATE_LIMIT_WINDOWS.HOUR,
    maxRequests: 10,
  },
  
  // Search endpoints
  '/api/discovery/search': {
    windowMs: RATE_LIMIT_WINDOWS.MINUTE,
    maxRequests: 30,
  },
  '/api/opportunities/search': {
    windowMs: RATE_LIMIT_WINDOWS.MINUTE,
    maxRequests: 30,
  },
  
  // Data export endpoints
  '/api/archivist/export': {
    windowMs: RATE_LIMIT_WINDOWS.HOUR,
    maxRequests: 10,
  },
  '/api/research/export': {
    windowMs: RATE_LIMIT_WINDOWS.HOUR,
    maxRequests: 10,
  },
  
  // General API endpoints
  '/api/*': {
    windowMs: RATE_LIMIT_WINDOWS.FIFTEEN_MINUTES,
    maxRequests: 100,
  },
} as const;

// Rate limit headers
export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
} as const;

// Rate limit messages
export const RATE_LIMIT_MESSAGES = {
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  AUTH_LIMIT_EXCEEDED: 'Too many authentication attempts, please try again later',
  API_LIMIT_EXCEEDED: 'API rate limit exceeded',
  SCRAPING_LIMIT_EXCEEDED: 'Scraping rate limit exceeded',
  AI_LIMIT_EXCEEDED: 'AI service rate limit exceeded',
  CUSTOM: (minutes: number) => `Rate limit exceeded. Please try again in ${minutes} minutes`,
} as const;

// Skip rate limiting for certain conditions
export const RATE_LIMIT_SKIP = {
  // IP addresses to skip (for internal services)
  SKIP_IPS: process.env.RATE_LIMIT_SKIP_IPS?.split(',') || [],
  
  // API keys that bypass rate limiting
  BYPASS_KEYS: process.env.RATE_LIMIT_BYPASS_KEYS?.split(',') || [],
  
  // User roles that have higher limits
  ELEVATED_ROLES: ['admin', 'moderator', 'enterprise'],
} as const;

// Rate limit storage options
export const RATE_LIMIT_STORAGE = {
  TYPE: process.env.RATE_LIMIT_STORAGE || 'memory', // 'memory', 'redis', 'database'
  REDIS_URL: process.env.REDIS_URL,
  KEY_PREFIX: 'rate_limit:',
  CLEANUP_INTERVAL: RATE_LIMIT_WINDOWS.HOUR,
} as const;

// Create rate limiting configuration
export function createRateLimitConfig(): RateLimitConfig {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(RATE_LIMIT_WINDOWS.FIFTEEN_MINUTES));
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  const authWindowMs = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(RATE_LIMIT_WINDOWS.FIFTEEN_MINUTES));
  const authMaxAttempts = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5');

  return {
    windowMs,
    maxRequests,
    authRateLimit: {
      windowMs: authWindowMs,
      maxAttempts: authMaxAttempts,
    },
    apiEndpoints: ENDPOINT_RATE_LIMITS,
  };
}

// Rate limiter factory function
export function createRateLimiter(endpoint?: string) {
  const config = createRateLimitConfig();
  
  // Check if there's a specific limit for this endpoint
  if (endpoint && config.apiEndpoints[endpoint]) {
    return config.apiEndpoints[endpoint];
  }
  
  // Check for wildcard matches
  const wildcardKey = Object.keys(config.apiEndpoints).find(key => {
    if (key.includes('*') && endpoint) {
      const pattern = key.replace('*', '.*');
      return new RegExp(pattern).test(endpoint);
    }
    return false;
  });
  
  if (wildcardKey) {
    return config.apiEndpoints[wildcardKey];
  }
  
  // Return default configuration
  return {
    windowMs: config.windowMs,
    maxRequests: config.maxRequests,
  };
}

// Export default configuration
export const rateLimitConfig = createRateLimitConfig();