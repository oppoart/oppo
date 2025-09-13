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

/**
 * Query templates for different opportunity types
 */
export const QUERY_TEMPLATES = {
  [QUERY_TYPES.GRANTS]: [
    '{medium} art grants {year}',
    '{medium} artist funding opportunities',
    'creative grants for {medium} artists',
    'arts council grants {location}',
    'foundation grants contemporary art'
  ],
  [QUERY_TYPES.RESIDENCIES]: [
    'artist residency {medium}',
    'art residency programs {location}',
    '{medium} artist residency opportunities',
    'international artist residencies',
    'studio residency contemporary art'
  ],
  [QUERY_TYPES.EXHIBITIONS]: [
    'call for artists {medium}',
    'group exhibition submissions',
    '{medium} art exhibition opportunities',
    'gallery submissions {location}',
    'contemporary art exhibitions call'
  ],
  [QUERY_TYPES.FELLOWSHIPS]: [
    'artist fellowship {medium}',
    'creative fellowship programs',
    'arts fellowship opportunities',
    '{medium} artist mentorship',
    'professional development fellowship'
  ],
  [QUERY_TYPES.COMPETITIONS]: [
    '{medium} art competition',
    'artist competition {year}',
    'contemporary art awards',
    '{medium} artist prizes',
    'international art competition'
  ],
  [QUERY_TYPES.CALLS_FOR_ARTISTS]: [
    'open call artists {medium}',
    'artist call submissions',
    'public art call {location}',
    'commissioned artwork call',
    'artist opportunity {medium}'
  ],
  [QUERY_TYPES.FUNDING_OPPORTUNITIES]: [
    'artist funding {medium}',
    'creative project funding',
    'arts funding opportunities',
    'artist financial support',
    'creative grants and funding'
  ],
  [QUERY_TYPES.COMMISSIONS]: [
    'artist commission {medium}',
    'public art commission {location}',
    'commissioned artwork {medium}',
    'art commissioning opportunities',
    'custom artwork commission'
  ],
  [QUERY_TYPES.WORKSHOPS]: [
    'artist workshop {medium}',
    'creative workshop opportunities',
    'professional development workshop',
    'art technique workshop',
    'artist skill building'
  ],
  [QUERY_TYPES.INTERNSHIPS]: [
    'artist internship {medium}',
    'gallery internship opportunities',
    'museum internship program',
    'creative industry internship',
    'art world internship'
  ],
  [QUERY_TYPES.COLLABORATIONS]: [
    'artist collaboration {medium}',
    'creative collaboration opportunities',
    'interdisciplinary art projects',
    'artist partnership {location}',
    'collaborative art projects'
  ],
  [QUERY_TYPES.PUBLISHING]: [
    'artist publication opportunities',
    'art magazine submissions',
    'creative writing {medium}',
    'artist book publishing',
    'arts journal submissions'
  ]
} as const;

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