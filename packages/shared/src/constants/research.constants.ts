/**
 * Research Service Constants
 * Constants for research functionality and services
 */

// Research service IDs
export const RESEARCH_SERVICES = {
  QUERY_GENERATION: 'query-generation',
  WEB_SEARCH: 'web-search',
  LLM_SEARCH: 'llm-search',
  SOCIAL_MEDIA: 'social-media',
  BOOKMARKS: 'bookmarks',
  NEWSLETTERS: 'newsletters',
} as const;

// Research session statuses
export const RESEARCH_SESSION_STATUSES = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error',
  STOPPED: 'stopped',
} as const;

// Research priority levels
export const RESEARCH_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
} as const;

// Default research options
export const DEFAULT_RESEARCH_OPTIONS = {
  MAX_QUERIES: 10,
  SEARCH_LIMIT: 10,
  DEFAULT_QUERY: 'art grants opportunities residencies exhibitions',
  RELEVANCE_RANGE: { MIN: 0.7, MAX: 1.0 },
} as const;

// Source types for query generation
export const SOURCE_TYPES = {
  WEBSEARCH: 'websearch',
  SOCIAL: 'social',
  BOOKMARK: 'bookmark',
  NEWSLETTER: 'newsletter',
} as const;

// Social media platforms
export const SOCIAL_PLATFORMS = {
  TWITTER: 'Twitter',
  INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn',
  FACEBOOK: 'Facebook',
} as const;

// Bookmark categories
export const BOOKMARK_CATEGORIES = {
  GRANTS: 'grants',
  RESOURCES: 'resources', 
  NEWS: 'news',
  OPPORTUNITIES: 'opportunities',
  NETWORKING: 'networking',
} as const;

// Processing simulation delays (milliseconds)
export const PROCESSING_DELAYS = {
  INITIAL_DELAY: 1000,
  PROGRESS_UPDATE_DELAY: 1500,
  FINAL_DELAY: 500,
} as const;

// Progress milestones
export const PROGRESS_MILESTONES = {
  STARTED: 10,
  PROCESSING: 30,
  ANALYZING: 60,
  FINALIZING: 90,
  COMPLETED: 100,
} as const;

// Result pagination defaults
export const RESULT_PAGINATION = {
  DEFAULT_LIMIT: 50,
  DEFAULT_OFFSET: 0,
  MAX_LIMIT: 200,
} as const;

// LLM search insight types
export const INSIGHT_TYPES = {
  TREND: 'trend',
  OPPORTUNITY: 'opportunity',
  ANALYSIS: 'analysis',
  PREDICTION: 'prediction',
} as const;

// Confidence score ranges
export const CONFIDENCE_RANGES = {
  LOW: { MIN: 0.0, MAX: 0.4 },
  MEDIUM: { MIN: 0.4, MAX: 0.7 },
  HIGH: { MIN: 0.7, MAX: 0.9 },
  VERY_HIGH: { MIN: 0.9, MAX: 1.0 },
} as const;

// Session timeout settings
export const SESSION_TIMEOUTS = {
  DEFAULT_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
  CLEANUP_INTERVAL_MS: 10 * 60 * 1000, // 10 minutes  
  MAX_SESSIONS_PER_USER: 5,
} as const;

// Export formats for research results
export const RESEARCH_EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv',
} as const;

// Mock data sources for development
export const MOCK_DATA_SOURCES = {
  ART_ORGANIZATIONS: [
    'ArtWorld Weekly',
    'Digital Arts Foundation',
    'Green Arts Initiative', 
    'Environmental Art Fund',
    'Virtual Art Spaces',
    'Online Gallery Network',
    'Contemporary Art News',
    'Funding News',
    'Digital Arts Network',
    'Sustainability Arts Council',
  ],
  NEWS_SOURCES: [
    'ArtWorld Weekly',
    'Contemporary Art News',
    'Art Forum',
    'Artsy',
    'Hyperallergic',
  ],
  FUNDING_SOURCES: [
    'Creative Europe',
    'National Endowment for the Arts',
    'Andy Warhol Foundation',
    'Ford Foundation',
    'Rockefeller Foundation',
  ],
} as const;

// Research result types
export const RESULT_TYPES = {
  SEARCH_RESULT: 'search_result',
  INSIGHT: 'insight',
  SOCIAL_MENTION: 'social_mention',
  BOOKMARK: 'bookmark',
  NEWSLETTER: 'newsletter',
  OPPORTUNITY: 'opportunity',
} as const;

// Quality score thresholds
export const QUALITY_THRESHOLDS = {
  MINIMUM_RELEVANCE: 0.3,
  GOOD_RELEVANCE: 0.6,
  EXCELLENT_RELEVANCE: 0.8,
  MINIMUM_CONFIDENCE: 0.5,
  HIGH_CONFIDENCE: 0.8,
} as const;