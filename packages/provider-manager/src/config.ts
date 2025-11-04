/**
 * Provider Manager Configuration
 *
 * CENTRAL CONFIGURATION FILE
 * All constants, defaults, pricing, and rate limits in one place.
 *
 * ⚠️ Update this file when:
 * - Provider pricing changes
 * - New models are released
 * - Rate limits change
 * - Default configurations need adjustment
 *
 * Structure:
 * 1. Environment & Core Settings (top)
 * 2. Provider Pricing & Limits
 * 3. Discovery & Use Case Config
 * 4. Detailed Parameters (bottom)
 */

import { UseCase, UseCaseConfig } from './core/types';

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Detect if running in production
 */
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Detect if running in test
 */
export const IS_TEST = process.env.NODE_ENV === 'test';

/**
 * Detect if running in development
 */
export const IS_DEVELOPMENT = !IS_PRODUCTION && !IS_TEST;

// ============================================================================
// PROVIDER PRICING (CRITICAL - UPDATE REGULARLY)
// ============================================================================

/**
 * Provider pricing per 1K tokens (USD)
 *
 * Last updated: 2024-11-04
 * Source: Official provider pricing pages
 *
 * ⚠️ Update regularly! Prices change frequently.
 */
export const PROVIDER_PRICING = {
  openai: {
    'gpt-4': {
      input: 0.03,
      output: 0.06,
    },
    'gpt-4-turbo': {
      input: 0.01,
      output: 0.03,
    },
    'gpt-4-turbo-preview': {
      input: 0.01,
      output: 0.03,
    },
    'gpt-3.5-turbo': {
      input: 0.0015,
      output: 0.002,
    },
    'gpt-3.5-turbo-16k': {
      input: 0.003,
      output: 0.004,
    },
    'text-embedding-3-small': {
      input: 0.00002,
      output: 0,
    },
    'text-embedding-3-large': {
      input: 0.00013,
      output: 0,
    },
    'text-embedding-ada-002': {
      input: 0.0001,
      output: 0,
    },
  },

  anthropic: {
    'claude-3-opus-20240229': {
      input: 0.015,
      output: 0.075,
    },
    'claude-3-sonnet-20240229': {
      input: 0.003,
      output: 0.015,
    },
    'claude-3-haiku-20240307': {
      input: 0.00025,
      output: 0.00125,
    },
  },

  // Search providers (cost per query)
  serper: {
    search: 0.001, // $1 per 1000 queries
  },

  google: {
    'custom-search': 0.005, // $5 per 1000 queries
  },

  brave: {
    search: 0.001, // $1 per 1000 queries
  },
};

// ============================================================================
// TIMEOUT VALUES
// ============================================================================

/**
 * Default timeout values in milliseconds
 *
 * Different operations have different timeout needs.
 */
export const DEFAULT_TIMEOUTS = {
  /** Text generation (completions, chat) */
  text: 30000, // 30 seconds

  /** Embeddings generation */
  embedding: 10000, // 10 seconds

  /** Structured extraction (can be slow with large content) */
  extraction: 60000, // 60 seconds

  /** Web search */
  search: 15000, // 15 seconds

  /** Social media scraping (can be slower) */
  social: 30000, // 30 seconds
};

// ============================================================================
// RATE LIMITS
// ============================================================================

/**
 * Rate limits for each provider
 *
 * ⚠️ These are conservative defaults. Check your actual tier limits.
 */
export const RATE_LIMITS = {
  openai: {
    // Tokens per minute by tier
    tier1: 3500,
    tier2: 60000,
    tier3: 160000,
    tier4: 300000,
    tier5: 1000000,
  },

  anthropic: {
    // Requests per minute (Claude default)
    default: 15,
    tier1: 50,
    tier2: 1000,
  },

  serper: {
    // Requests per minute
    default: 100,
  },

  google: {
    // Requests per day
    'custom-search': 100,
  },

  brave: {
    // Requests per minute
    default: 30,
  },
};

// ============================================================================
// DISCOVERY PATTERN CONFIGURATION
// ============================================================================

/**
 * Discovery Pattern Configuration
 *
 * Used for research and scraping workflows where multiple providers
 * are queried sequentially and results are accumulated (not fallback).
 *
 * Example workflow:
 * 1. User searches "new york art competitions"
 * 2. System queries Serper → collects results
 * 3. System queries Google → collects results
 * 4. System queries Brave → collects results
 * 5. All results are merged and returned
 *
 * This is different from fallback pattern where we only try the next
 * provider if the previous one fails.
 */
export const DISCOVERY_CONFIG = {
  /**
   * Search Engine Discovery
   * Multiple search engines for comprehensive web search coverage
   */
  searchEngines: [
    {
      provider: 'serper',
      maxResults: 100,
      enabled: true,
      priority: 1, // Lower number = higher priority (queried first)
    },
    {
      provider: 'google',
      maxResults: 100,
      enabled: true,
      priority: 2,
    },
    {
      provider: 'brave',
      maxResults: 50,
      enabled: false, // Can be enabled when needed
      priority: 3,
    },
  ],

  /**
   * LLM-Enhanced Search Discovery
   * LLM providers that offer search capabilities (like Perplexity)
   */
  llmSearch: [
    {
      provider: 'perplexity',
      model: 'sonar-small-online',
      maxResults: 20,
      enabled: false, // Enable when Perplexity adapter is implemented
      priority: 1,
    },
    {
      provider: 'openai',
      model: 'gpt-4-turbo',
      maxResults: 10,
      enabled: false, // Can use GPT-4 with web browsing when available
      priority: 2,
    },
  ],

  /**
   * Social Media Discovery
   * Multiple social platforms for comprehensive social research
   */
  socialMedia: [
    {
      provider: 'instagram',
      maxPosts: 20,
      enabled: true,
      priority: 1,
    },
    {
      provider: 'linkedin',
      maxPosts: 20,
      enabled: true,
      priority: 2,
    },
    {
      provider: 'twitter',
      maxPosts: 50,
      enabled: false, // Enable when Twitter adapter is implemented
      priority: 3,
    },
  ],
};

// ============================================================================
// DEFAULT USE CASE CONFIGURATIONS
// ============================================================================

/**
 * Default configuration for each use case
 *
 * These can be overridden in ProviderManagerConfig
 */
export const DEFAULT_USE_CASE_CONFIG: Record<UseCase, UseCaseConfig> = {
  [UseCase.QUERY_ENHANCEMENT]: {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 200,
    priority: 'speed',
    fallbackProviders: ['anthropic'],
    enableCaching: true,
    cacheTTL: 300, // 5 minutes
  },

  [UseCase.SEMANTIC_ANALYSIS]: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 500,
    priority: 'quality',
    fallbackProviders: ['anthropic'],
    enableCaching: true,
    cacheTTL: 600, // 10 minutes
  },

  [UseCase.STRUCTURED_EXTRACTION]: {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    temperature: 0.1, // Low for consistency
    maxTokens: 4000,
    priority: 'cost',
    fallbackProviders: ['openai'],
    enableCaching: false, // Each extraction is unique
  },

  [UseCase.RAG_QA]: {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    priority: 'balance',
    fallbackProviders: ['anthropic'],
    enableCaching: true,
    cacheTTL: 300,
  },

  [UseCase.EMBEDDINGS]: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    priority: 'speed',
    fallbackProviders: [],
    enableCaching: true,
    cacheTTL: 3600, // 1 hour - embeddings are stable
  },

  [UseCase.WEB_SEARCH]: {
    provider: 'serper',
    priority: 'balance',
    fallbackProviders: ['google', 'brave'],
    enableCaching: true,
    cacheTTL: 1800, // 30 minutes
  },

  [UseCase.SOCIAL_SEARCH]: {
    provider: 'instagram',
    priority: 'balance',
    fallbackProviders: ['linkedin'],
    enableCaching: true,
    cacheTTL: 3600, // 1 hour
  },
};

// ============================================================================
// DETAILED PARAMETERS
// ============================================================================

/**
 * Default models for each provider when not specified
 */
export const DEFAULT_MODELS = {
  openai: {
    text: 'gpt-3.5-turbo',
    chat: 'gpt-3.5-turbo',
    embedding: 'text-embedding-3-small',
  },

  anthropic: {
    text: 'claude-3-haiku-20240307',
    chat: 'claude-3-haiku-20240307',
    extraction: 'claude-3-haiku-20240307',
  },
};

/**
 * Retry configuration for failed requests
 */
export const RETRY_CONFIG = {
  /** Maximum number of retries */
  maxRetries: 3,

  /** Initial delay in milliseconds */
  initialDelay: 1000,

  /** Maximum delay in milliseconds */
  maxDelay: 10000,

  /** Backoff multiplier */
  backoffMultiplier: 2,

  /** Jitter (randomness) to prevent thundering herd */
  jitter: true,
};

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Enable caching globally */
  enabled: true,

  /** Default TTL in seconds */
  defaultTTL: 300, // 5 minutes

  /** Maximum cache size (number of entries) */
  maxSize: 1000,

  /** Cache cleanup interval in milliseconds */
  cleanupInterval: 60000, // 1 minute
};

/**
 * Cost tracking configuration
 */
export const COST_TRACKING_CONFIG = {
  /** Enable cost tracking globally */
  enabled: true,

  /** Default cost alert threshold in USD */
  defaultAlertThreshold: 10.0,

  /** Cleanup old operations after N days */
  cleanupAfterDays: 30,
};

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
  /** Enable detailed logging */
  enabled: true,

  /** Log level (error, warn, info, debug) */
  level: 'info',

  /** Log request/response payloads (can be verbose) */
  logPayloads: false,

  /** Log timing information */
  logTiming: true,
};
