/**
 * LinkedIn Scraper Configuration
 * Centralized configuration for all LinkedIn-related scraping operations
 */

/**
 * CSS Selectors used throughout LinkedIn scraping
 */
export const LINKEDIN_SELECTORS = {
  // Authentication
  login: {
    usernameField: '#username',
    passwordField: '#password',
    submitButton: 'button[type="submit"]',
    profileIcon: 'button[aria-label="View profile"]',
    feedContainer: '.feed-container-theme'
  },

  // Security and navigation
  security: {
    challengeText: 'text="Help us protect the LinkedIn community"',
    skipButton: 'button:has-text("Skip")'
  },

  // Search results
  search: {
    resultsContainer: '.search-results-container',
    showMoreButton: 'button:has-text("Show more results")',
    seeMoreJobsButton: 'button:has-text("See more jobs")'
  },

  // Posts and content
  posts: {
    updateText: '.update-components-text',
    feedText: '.feed-shared-text',
    postContainer: '.feed-shared-update-v2',
    updateContainer: '.update-components-actor',
    
    // Author information
    authorMeta: '.update-components-actor__meta a',
    authorName: '.feed-shared-actor__name a',
    authorDescription: '.update-components-actor__description',
    feedAuthorDescription: '.feed-shared-actor__description',
    
    // Timestamps
    timeElement: 'time'
  },

  // Job listings
  jobs: {
    searchResultsList: '.jobs-search__results-list',
    jobCardContainer: '.job-card-container',
    jobTitle: '.job-card-list__title',
    companyName: '.job-card-container__company-name',
    metadataItem: '.job-card-container__metadata-item',
    jobLink: 'a[href*="/jobs/view/"]',
    jobSummary: '.job-card-list__summary'
  }
} as const;

/**
 * LinkedIn URLs and endpoints
 */
export const LINKEDIN_URLS = {
  base: 'https://www.linkedin.com',
  login: 'https://www.linkedin.com/login',
  feed: 'https://www.linkedin.com/feed',
  
  // Search endpoints
  contentSearch: (query: string) => 
    `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(query)}&sortBy=%22date_posted%22`,
  jobsSearch: (query: string) => 
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&sortBy=DD`,
  companyPage: (companyId: string) => 
    `https://www.linkedin.com/company/${companyId}/posts/`,
  
  // URL patterns
  patterns: {
    postId: /\/(\d+)/,
    activityId: /activity-(\d+)/,
    jobView: /\/jobs\/view\/(\d+)/
  }
} as const;

/**
 * Timing and rate limiting configuration
 */
export const LINKEDIN_TIMING = {
  // Delays (in milliseconds)
  postDelay: 3000,
  scrollDelay: 2000,
  clickDelay: 1000,
  authDelay: 3000,
  securityCheckDelay: 5000,
  
  // Timeouts (in milliseconds)
  pageTimeout: 30000,
  navigationTimeout: 15000,
  elementTimeout: 10000,
  scrollTimeout: 30000,
  
  // Scroll attempts
  maxScrollAttempts: 3,
  
  // Rate limiting
  requestsPerMinute: 10,
  operationTimeout: 90000,
  retryAttempts: 2
} as const;

/**
 * Search terms for different types of opportunities
 */
export const LINKEDIN_SEARCH_TERMS = {
  general: [
    'artist opportunity',
    'art grant',
    'creative residency',
    'museum job',
    'gallery position',
    'art director',
    'curator position',
    'arts administrator',
    'creative manager',
    'art fellowship',
    'cultural program',
    'nonprofit art'
  ],
  
  jobs: [
    'artist',
    'curator',
    'art director',
    'creative director',
    'gallery manager',
    'museum',
    'arts',
    'creative',
    'design',
    'cultural'
  ],
  
  opportunities: [
    'opportunity', 'hiring', 'position', 'role', 'job', 'career',
    'apply', 'join', 'looking for', 'seeking', 'grant', 'fellowship',
    'residency', 'internship', 'freelance', 'contract', 'opening'
  ]
} as const;

/**
 * Groups and companies to monitor
 */
export const LINKEDIN_MONITORING = {
  groups: [
    'arts-professionals',
    'museum-professionals',
    'art-gallery-professionals',
    'creative-professionals-network',
    'artists-network'
  ],
  
  companies: [
    'metropolitan-museum-of-art',
    'moma',
    'guggenheim-museum',
    'whitney-museum',
    'lacma'
  ]
} as const;

/**
 * Browser configuration for LinkedIn
 */
export const LINKEDIN_BROWSER_CONFIG = {
  // Browser settings
  headless: false, // LinkedIn has sophisticated bot detection
  viewport: { width: 1366, height: 768 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  locale: 'en-US',
  timezoneId: 'America/New_York',
  
  // Stealth arguments
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=VizDisplayCompositor'
  ]
} as const;

/**
 * Regular expressions for data extraction
 */
export const LINKEDIN_REGEX = {
  hashtags: /#\w+/g,
  mentions: /@\w+/g,
  urls: /(https?:\/\/[^\s]+)/g,
  
  // Salary patterns
  salary: {
    usd: /\$[\d,]+(?:\.\d{2})?(?:k|,000)?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?(?:k|,000)?)?/gi,
    eur: /€[\d,]+(?:\.\d{2})?(?:k|,000)?(?:\s*-\s*€[\d,]+(?:\.\d{2})?(?:k|,000)?)?/gi,
    gbp: /£[\d,]+(?:\.\d{2})?(?:k|,000)?(?:\s*-\s*£[\d,]+(?:\.\d{2})?(?:k|,000)?)?/gi,
    general: /(?:salary|compensation|pay)[:\s]+([^.\n]*\d+[^.\n]*)/i
  },
  
  // Title extraction patterns
  title: [
    /(?:HIRING|OPPORTUNITY|POSITION|ROLE)[:\s]+([^.\n]{10,100})/i,
    /(?:we're looking for|seeking|hiring)[:\s]+([^.\n]{10,100})/i,
    /^([^.\n]{10,100})/
  ],
  
  // Date and deadline patterns
  deadline: [
    /deadline[:\s]+([^.\n]+)/i,
    /apply by[:\s]+([^.\n]+)/i,
    /closes?[:\s]+([^.\n]+)/i,
    /due[:\s]+([^.\n]+)/i
  ],
  
  // Location patterns
  location: [
    /location[:\s]+([^.\n]+)/i,
    /based in[:\s]+([^.\n]+)/i,
    /(?:remote|on-site|hybrid|in)\s+([\w\s,]+)/i
  ]
} as const;

/**
 * Content validation rules
 */
export const LINKEDIN_VALIDATION = {
  opportunity: {
    minDescriptionLength: 30,
    minTitleLength: 10,
    maxTitleLength: 200,
    maxDescriptionLength: 3000,
    
    // Required fields
    requiredFields: ['title', 'description', 'url'] as const,
    
    // Keywords that indicate an opportunity
    opportunityKeywords: [
      'opportunity', 'position', 'role', 'job', 'hiring', 'apply',
      'join', 'career', 'grant', 'fellowship', 'residency', 'internship'
    ]
  }
} as const;

/**
 * Default configuration for LinkedIn scraper
 */
export const LINKEDIN_DEFAULT_CONFIG = {
  maxPostsPerSearch: 20,
  maxJobsPerSearch: 50,
  maxCompanyPosts: 10,
  loginRequired: true,
  useDataExtraction: true,
  useDataCleaning: true,
  
  // Data extractor config
  dataExtractor: {
    enabled: true,
    timeout: 10000,
    extractImages: false,
    extractLinks: true
  },
  
  // Data cleaner config
  dataCleaner: {
    enabled: true,
    maxTitleLength: 200,
    maxDescriptionLength: 3000
  }
} as const;

/**
 * Environment variable mappings
 */
export const LINKEDIN_ENV = {
  cookies: 'LINKEDIN_COOKIES',
  email: 'LINKEDIN_EMAIL',
  password: 'LINKEDIN_PASSWORD'
} as const;