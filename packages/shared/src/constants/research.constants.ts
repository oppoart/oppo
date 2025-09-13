/**
 * Research session status constants
 */
export const RESEARCH_SESSION_STATUSES = {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED', 
  STOPPED: 'STOPPED',
  ERROR: 'ERROR'
} as const;

export type ResearchSessionStatus = typeof RESEARCH_SESSION_STATUSES[keyof typeof RESEARCH_SESSION_STATUSES];

/**
 * Research service types
 */
export const RESEARCH_SERVICES = {
  WEB_SEARCH: 'WEB_SEARCH',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  LLM_SEARCH: 'LLM_SEARCH',
  NEWSLETTERS: 'NEWSLETTERS',
  QUERY_GENERATION: 'QUERY_GENERATION',
  BOOKMARKS: 'BOOKMARKS'
} as const;

export type ResearchService = typeof RESEARCH_SERVICES[keyof typeof RESEARCH_SERVICES];

/**
 * Research priorities
 */
export const RESEARCH_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium', 
  LOW: 'low'
} as const;

/**
 * Source types
 */
export const SOURCE_TYPES = {
  WEBSEARCH: 'websearch',
  SOCIAL: 'social',
  BOOKMARK: 'bookmark',
  NEWSLETTER: 'newsletter',
  MANUAL: 'manual'
} as const;

/**
 * Export formats
 */
export const RESEARCH_EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv',
  PDF: 'pdf'
} as const;

/**
 * Default research options
 */
export const DEFAULT_RESEARCH_OPTIONS = {
  maxResults: 50,
  timeout: 30000,
  retryAttempts: 3,
  concurrentLimit: 3,
  MAX_QUERIES: 50,
  SEARCH_LIMIT: 100
} as const;

/**
 * Result pagination
 */
export const RESULT_PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 20,
  DEFAULT_OFFSET: 0
} as const;

/**
 * Default research configuration
 */
export const RESEARCH_DEFAULTS = {
  MAX_RESULTS_PER_SERVICE: 50,
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  CONCURRENT_LIMIT: 3
} as const;