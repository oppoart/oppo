/**
 * API Configuration
 * Centralized API settings and endpoints
 */

import { ApiConfig } from './types';

// API timeout values (in milliseconds)
export const API_TIMEOUTS = {
  DEFAULT: 30000,
  UPLOAD: 120000,
  SEARCH: 60000,
  AI_PROCESSING: 90000,
  SCRAPING: 180000,
} as const;

// Retry configuration
export const API_RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10000,
  BACKOFF_MULTIPLIER: 2,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    VERIFY: '/api/auth/verify',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  // User endpoints
  USER: {
    PROFILE: '/api/users/profile',
    UPDATE: '/api/users/update',
    DELETE: '/api/users/delete',
    PREFERENCES: '/api/users/preferences',
  },
  // Artist profile endpoints
  ARTIST: {
    PROFILES: '/api/artists/profiles',
    CREATE: '/api/artists/create',
    UPDATE: '/api/artists/update',
    DELETE: '/api/artists/delete',
  },
  // Opportunity endpoints
  OPPORTUNITY: {
    LIST: '/api/opportunities',
    DETAIL: '/api/opportunities/:id',
    CREATE: '/api/opportunities/create',
    UPDATE: '/api/opportunities/update',
    DELETE: '/api/opportunities/delete',
    SEARCH: '/api/opportunities/search',
    HIGH_RELEVANCE: '/api/opportunities/high-relevance',
  },
  // Research endpoints
  RESEARCH: {
    START: '/api/research/start',
    STOP: '/api/research/stop',
    STATUS: '/api/research/status/:serviceId/:sessionId',
    RESULTS: '/api/research/results/:serviceId/:sessionId',
    SESSIONS: '/api/research/sessions/:profileId',
    FETCH: '/api/research/fetch-opportunities',
    EXPORT: '/api/research/export',
  },
  // Discovery endpoints
  DISCOVERY: {
    SEARCH: '/api/discovery/search',
    OPPORTUNITIES: '/api/discovery/opportunities',
    ANALYZE: '/api/discovery/analyze-profile',
  },
  // Archivist endpoints
  ARCHIVIST: {
    OPPORTUNITIES: '/api/archivist/opportunities',
    OPPORTUNITY_DETAIL: '/api/archivist/opportunities/:id',
    ARCHIVE: '/api/archivist/archive',
    HIGH_RELEVANCE: '/api/archivist/opportunities/high-relevance',
    EXPORT: '/api/archivist/export',
    STATS: '/api/archivist/stats',
  },
  // Analysis endpoints
  ANALYSIS: {
    ANALYZE: '/api/analysis/analyze',
    SCORE: '/api/analysis/score',
    BATCH: '/api/analysis/batch',
  },
  // Scraper endpoints
  SCRAPER: {
    SCRAPE: '/api/scraper/scrape',
    STATUS: '/api/scraper/status/:jobId',
    RESULTS: '/api/scraper/results/:jobId',
  },
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Response messages
export const API_MESSAGES = {
  SUCCESS: {
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    FETCHED: 'Data fetched successfully',
  },
  ERROR: {
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    INVALID_INPUT: 'Invalid input provided',
    SERVER_ERROR: 'Internal server error',
    RATE_LIMITED: 'Too many requests, please try again later',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  },
} as const;

// API configuration factory
export function createApiConfig(env: string = process.env.NODE_ENV || 'development'): ApiConfig {
  const baseUrl = process.env.API_BASE_URL || (
    env === 'production' 
      ? 'https://api.oppo.com' 
      : 'http://localhost:3001'
  );

  return {
    baseUrl,
    timeout: API_TIMEOUTS.DEFAULT,
    retryAttempts: API_RETRY.MAX_ATTEMPTS,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequestsPerWindow: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  };
}

// Export default configuration
export const apiConfig = createApiConfig();