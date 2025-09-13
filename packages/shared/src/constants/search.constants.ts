/**
 * Search-related Constants
 * Constants for search functionality and discovery
 */

// Search engines
export const SEARCH_ENGINES = {
  GOOGLE: 'google',
  BING: 'bing',
  YANDEX: 'yandex',
  DUCKDUCKGO: 'duckduckgo',
  SERPAPI: 'serpapi',
} as const;

// Search result types
export const SEARCH_RESULT_TYPES = {
  ORGANIC: 'organic',
  PAID: 'paid',
  NEWS: 'news',
  IMAGES: 'images',
  VIDEOS: 'videos',
  SHOPPING: 'shopping',
  LOCAL: 'local',
} as const;

// Search operators
export const SEARCH_OPERATORS = {
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  EXACT_PHRASE: '"',
  WILDCARD: '*',
  SITE: 'site:',
  FILETYPE: 'filetype:',
  INTITLE: 'intitle:',
  INURL: 'inurl:',
  RELATED: 'related:',
} as const;

// Common search terms for art opportunities
export const ART_OPPORTUNITY_KEYWORDS = [
  'art grant',
  'artist residency',
  'art exhibition',
  'art competition',
  'artist fellowship',
  'call for artists',
  'art opportunity',
  'creative grant',
  'visual arts funding',
  'artist opportunity',
  'art commission',
  'gallery call',
  'artist call',
  'art prize',
  'art award',
  'creative fellowship',
  'art scholarship',
  'public art commission',
  'artist-in-residence',
  'emerging artist',
  'contemporary art',
  'digital art',
  'installation art',
  'performance art',
  'sculpture competition',
  'painting grant',
  'photography award',
] as const;

// Search query templates
export const SEARCH_QUERY_TEMPLATES = {
  BASIC_GRANT: '{medium} grant {year}',
  LOCATION_SPECIFIC: '{medium} {location} grant',
  DEADLINE_BASED: '{medium} grant deadline {month}',
  DEMOGRAPHIC_SPECIFIC: '{demographic} {medium} grant',
  AMOUNT_SPECIFIC: '{medium} grant ${amount}',
  RESIDENCY: '{medium} artist residency {location}',
  EXHIBITION: '{medium} exhibition call {year}',
  COMPETITION: '{medium} competition {theme}',
  FELLOWSHIP: '{demographic} {medium} fellowship',
  COMMISSION: 'public art commission {location}',
} as const;

// Search filters
export const SEARCH_FILTERS = {
  TIME_RANGE: {
    ANY: 'any',
    PAST_HOUR: 'past-hour',
    PAST_24_HOURS: 'past-24h',
    PAST_WEEK: 'past-week',
    PAST_MONTH: 'past-month',
    PAST_YEAR: 'past-year',
    CUSTOM: 'custom',
  },
  LANGUAGE: {
    ANY: 'any',
    ENGLISH: 'en',
    SPANISH: 'es',
    FRENCH: 'fr',
    GERMAN: 'de',
    CHINESE: 'zh',
    JAPANESE: 'ja',
    PORTUGUESE: 'pt',
    ITALIAN: 'it',
    RUSSIAN: 'ru',
  },
  REGION: {
    ANY: 'any',
    NORTH_AMERICA: 'north-america',
    EUROPE: 'europe',
    ASIA: 'asia',
    OCEANIA: 'oceania',
    AFRICA: 'africa',
    SOUTH_AMERICA: 'south-america',
  },
  SAFE_SEARCH: {
    OFF: 'off',
    MODERATE: 'moderate',
    STRICT: 'strict',
  },
} as const;

// Search result quality indicators
export const QUALITY_INDICATORS = {
  OFFICIAL_WEBSITE: 'official-website',
  GOVERNMENT_SITE: 'government-site',
  EDUCATIONAL_INSTITUTION: 'educational-institution',
  KNOWN_ORGANIZATION: 'known-organization',
  HTTPS_SECURE: 'https-secure',
  RECENTLY_UPDATED: 'recently-updated',
  VERIFIED_SOURCE: 'verified-source',
  HIGH_AUTHORITY: 'high-authority',
} as const;

// Common domains for art opportunities
export const TRUSTED_DOMAINS = [
  'arts.gov',
  'nea.gov',
  'artscouncil.org.uk',
  'canadacouncil.ca',
  'creativenz.govt.nz',
  'australiacouncil.gov.au',
  'goethe.de',
  'britishcouncil.org',
  'unesco.org',
  'europa.eu',
  'smithsonian.edu',
  'moma.org',
  'tate.org.uk',
  'guggenheim.org',
  'metmuseum.org',
  'whitney.org',
  'lacma.org',
  'sfmoma.org',
  'artforum.com',
  'artnet.com',
  'hyperallergic.com',
  'artsy.net',
  'frieze.com',
  'e-flux.com',
  'artcritical.com',
  'contemporaryartdaily.com',
] as const;

// Search API limits
export const API_LIMITS = {
  GOOGLE_CUSTOM_SEARCH: {
    FREE_TIER: 100, // queries per day
    PAID_TIER: 10000, // queries per day
  },
  BING_SEARCH: {
    FREE_TIER: 1000, // queries per month
    PAID_TIER: 1000000, // queries per month
  },
  SERPAPI: {
    FREE_TIER: 100, // queries per month
    STARTER: 5000, // queries per month
    PRO: 50000, // queries per month
  },
} as const;

// Search scoring weights
export const RELEVANCE_WEIGHTS = {
  TITLE_MATCH: 0.4,
  DESCRIPTION_MATCH: 0.3,
  DOMAIN_AUTHORITY: 0.15,
  RECENCY: 0.1,
  KEYWORD_DENSITY: 0.05,
} as const;