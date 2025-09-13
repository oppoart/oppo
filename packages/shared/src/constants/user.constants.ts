/**
 * User Preferences and Settings Constants
 * Constants for user configuration and preferences
 */

// Notification frequency options
export const NOTIFICATION_FREQUENCIES = {
  IMMEDIATE: 'immediate',
  DAILY: 'daily', 
  WEEKLY: 'weekly',
} as const;

// Application styles for auto-application
export const APPLICATION_STYLES = {
  FORMAL: 'formal',
  CASUAL: 'casual',
  ARTISTIC: 'artistic',
} as const;

// AI providers
export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
} as const;

// AI models by provider (user-facing options)
export const USER_AI_MODELS = {
  OPENAI: {
    GPT_4: 'gpt-4',
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
  },
  ANTHROPIC: {
    CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
    CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
  },
} as const;

// Query generation styles
export const QUERY_GENERATION_STYLES = {
  FOCUSED: 'focused',
  DIVERSE: 'diverse',
  CREATIVE: 'creative',
} as const;

// AI configuration ranges and defaults
export const AI_SETTINGS = {
  TEMPERATURE: {
    MIN: 0,
    MAX: 1,
    DEFAULT: 0.7,
    STEP: 0.1,
  },
  MAX_TOKENS: {
    MIN: 500,
    MAX: 4000,
    DEFAULT: 2000,
    STEP: 500,
  },
} as const;

// Match score configuration
export const MATCH_SCORE = {
  MIN: 0.3,
  MAX: 0.95,
  DEFAULT: 0.7,
  STEP: 0.05,
  AUTO_APPLICATION_THRESHOLD: 0.95,
} as const;

// Common locations for opportunity filtering
export const COMMON_LOCATIONS = [
  'New York, NY',
  'Los Angeles, CA',
  'San Francisco, CA',
  'Chicago, IL',
  'Boston, MA',
  'Washington, DC',
  'Seattle, WA',
  'Portland, OR',
  'Austin, TX',
  'Denver, CO',
  'Miami, FL',
  'Atlanta, GA',
  'Remote/Virtual',
  'International',
  'Europe',
  'Asia',
  'North America',
  'South America',
  'Australia',
  'Canada',
  'United Kingdom',
] as const;

// User preference default values
export const USER_PREFERENCE_DEFAULTS = {
  EMAIL_NOTIFICATIONS: true,
  PUSH_NOTIFICATIONS: false,
  NOTIFICATION_FREQUENCY: NOTIFICATION_FREQUENCIES.DAILY,
  MINIMUM_MATCH_SCORE: 0.7,
  ENABLE_AUTO_APPLICATION: false,
  APPLICATION_STYLE: APPLICATION_STYLES.FORMAL,
  INCLUDE_PORTFOLIO_LINKS: true,
  AI_PROVIDER: AI_PROVIDERS.OPENAI,
  AI_MODEL: USER_AI_MODELS.OPENAI.GPT_4,
  AI_TEMPERATURE: 0.7,
  AI_MAX_TOKENS: 2000,
  ENABLE_QUERY_CACHE: true,
  ENABLE_ANALYSIS_CACHE: true,
  QUERY_GENERATION_STYLE: QUERY_GENERATION_STYLES.DIVERSE,
} as const;

// Form validation messages for user preferences
export const USER_VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_URL: 'Please enter a valid URL',
  MIN_FUNDING_AMOUNT: 'Minimum amount must be positive',
  MAX_FUNDING_LESS_THAN_MIN: 'Maximum amount must be greater than minimum',
  API_KEY_FORMAT: 'API key format is invalid',
  WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
} as const;

// Tab configuration for settings page
export const SETTINGS_TABS = {
  OPPORTUNITIES: 'opportunities',
  AI: 'ai', 
  API: 'api',
  NOTIFICATIONS: 'notifications',
  DATA: 'data',
  APPEARANCE: 'appearance',
} as const;

// Loading and error states
export const UI_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

// Data export formats
export const EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv',
  PDF: 'pdf',
} as const;

// Cache types that can be cleared
export const CACHE_TYPES = {
  OPPORTUNITIES: 'opportunities',
  PROFILES: 'profiles',
  SEARCHES: 'searches',
  AI_RESPONSES: 'ai_responses',
  ALL: 'all',
} as const;