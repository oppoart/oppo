/**
 * Query types for different opportunity categories
 */
export const QUERY_TYPES = {
  GRANTS: 'grants',
  RESIDENCIES: 'residencies',
  EXHIBITIONS: 'exhibitions',
  FELLOWSHIPS: 'fellowships',
  COMPETITIONS: 'competitions',
  CALLS_FOR_ARTISTS: 'calls_for_artists',
  FUNDING_OPPORTUNITIES: 'funding_opportunities',
  COMMISSIONS: 'commissions',
  WORKSHOPS: 'workshops',
  INTERNSHIPS: 'internships',
  COLLABORATIONS: 'collaborations',
  PUBLISHING: 'publishing'
} as const;

export type QueryType = typeof QUERY_TYPES[keyof typeof QUERY_TYPES];

/**
 * Query generation strategies
 */
export const QUERY_STRATEGIES = {
  BASIC: 'basic',           // Simple keyword-based queries
  SEMANTIC: 'semantic',     // AI-enhanced semantic queries
  TARGETED: 'targeted',     // Specific location/medium targeted
  EXPLORATORY: 'exploratory' // Broad discovery queries
} as const;

export type QueryStrategy = typeof QUERY_STRATEGIES[keyof typeof QUERY_STRATEGIES];

/**
 * Query priority levels
 */
export const QUERY_PRIORITIES = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
} as const;

export type QueryPriority = typeof QUERY_PRIORITIES[keyof typeof QUERY_PRIORITIES];

// Query templates are now stored in the database (QueryTemplateGroup and QueryTemplate models)
// See: apps/backend/prisma/seed.ts for template definitions

/**
 * Query generation defaults
 */
export const QUERY_GENERATION_DEFAULTS = {
  MAX_QUERIES_PER_TYPE: 5,
  DEFAULT_STRATEGY: QUERY_STRATEGIES.SEMANTIC,
  DEFAULT_PRIORITY: QUERY_PRIORITIES.MEDIUM,
  QUERY_VARIATION_COUNT: 3,
  MAX_TOTAL_QUERIES: 25
} as const;

/**
 * Location-based query modifiers
 */
export const LOCATION_MODIFIERS = {
  INTERNATIONAL: 'international',
  NATIONAL: 'national',
  REGIONAL: 'regional',
  LOCAL: 'local',
  REMOTE: 'remote',
  VIRTUAL: 'virtual'
} as const;

export type LocationModifier = typeof LOCATION_MODIFIERS[keyof typeof LOCATION_MODIFIERS];

/**
 * Career stage modifiers for queries
 */
export const CAREER_STAGE_MODIFIERS = {
  EMERGING: 'emerging artist',
  MID_CAREER: 'mid-career artist',
  ESTABLISHED: 'established artist',
  STUDENT: 'art student',
  RECENT_GRADUATE: 'recent graduate'
} as const;

export type CareerStageModifier = typeof CAREER_STAGE_MODIFIERS[keyof typeof CAREER_STAGE_MODIFIERS];