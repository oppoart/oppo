/**
 * LinkedIn Scraper TypeScript Types and Interfaces
 * Comprehensive type definitions for LinkedIn scraping operations
 */

import { BrowserContext, Page, Browser } from 'playwright';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';

/**
 * LinkedIn scraper configuration interface
 */
export interface LinkedInConfig {
  // Authentication
  sessionCookies?: string;
  email?: string;
  password?: string;
  
  // Search configuration
  searchTerms: string[];
  jobSearchTerms: string[];
  groupsToMonitor: string[];
  companiesPagesToMonitor: string[];
  
  // Limits
  maxPostsPerSearch: number;
  maxJobsPerSearch: number;
  maxCompanyPosts: number;
  
  // Browser settings
  useHeadless: boolean;
  
  // Timing
  scrollTimeout: number;
  postDelay: number;
  
  // Features
  loginRequired: boolean;
  useDataExtraction: boolean;
  useDataCleaning: boolean;
  
  // Processor configs
  dataExtractor: DataExtractorConfig;
  dataCleaner: DataCleanerConfig;
}

/**
 * Data extractor configuration
 */
export interface DataExtractorConfig {
  enabled: boolean;
  timeout: number;
  extractImages: boolean;
  extractLinks: boolean;
}

/**
 * Data cleaner configuration
 */
export interface DataCleanerConfig {
  enabled: boolean;
  maxTitleLength: number;
  maxDescriptionLength: number;
}

/**
 * LinkedIn content types
 */
export type LinkedInContentType = 'post' | 'job' | 'article' | 'company_update';

/**
 * LinkedIn content data structure
 */
export interface LinkedInContent {
  id: string;
  type: LinkedInContentType;
  title: string;
  content: string;
  
  // Author information
  author: string;
  authorTitle?: string;
  authorCompany?: string;
  authorUrl: string;
  
  // Content metadata
  contentUrl: string;
  publishedAt: Date;
  
  // Engagement metrics
  likes?: number;
  comments?: number;
  shares?: number;
  
  // Extracted data
  hashtags: string[];
  mentions: string[];
  externalLinks: string[];
  
  // Job-specific fields
  location?: string;
  company?: string;
  salary?: string;
  jobType?: string;
  experience?: string;
  
  // Additional metadata
  isSponsored?: boolean;
  hasVideo?: boolean;
  hasImages?: boolean;
}

/**
 * Browser instance state
 */
export interface BrowserState {
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
  isAuthenticated: boolean;
}

/**
 * Authentication status
 */
export interface AuthenticationStatus {
  isAuthenticated: boolean;
  method: 'cookies' | 'credentials' | 'none';
  lastChecked: Date;
  error?: string;
}

/**
 * Search context for LinkedIn operations
 */
export interface LinkedInSearchContext {
  searchTerms?: string[];
  maxResults?: number;
  contentType?: LinkedInContentType[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  location?: string;
  company?: string;
}

/**
 * Extracted post data from DOM
 */
export interface ExtractedPostData {
  content: string;
  author: string;
  authorUrl: string;
  authorTitle?: string;
  contentUrl: string;
  publishedAt: string;
  likes?: number;
  comments?: number;
  shares?: number;
}

/**
 * Extracted job data from DOM
 */
export interface ExtractedJobData {
  title: string;
  company: string;
  location?: string;
  jobUrl: string;
  description: string;
  salary?: string;
  jobType?: string;
  experience?: string;
  isEasyApply?: boolean;
}

/**
 * Content extraction result
 */
export interface ContentExtractionResult {
  success: boolean;
  content?: LinkedInContent;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Scroll and loading operations
 */
export interface ScrollOperation {
  maxAttempts: number;
  currentAttempt: number;
  delayBetweenAttempts: number;
  success: boolean;
  elementsLoaded: number;
}

/**
 * Search operation result
 */
export interface SearchOperationResult {
  searchTerm: string;
  contentType: LinkedInContentType;
  resultsFound: number;
  resultsExtracted: number;
  errors: string[];
  duration: number;
  success: boolean;
}

/**
 * LinkedIn scraper operation metrics
 */
export interface ScrapingMetrics {
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  
  // Operation counts
  searchOperations: number;
  successfulExtractions: number;
  failedExtractions: number;
  skippedContent: number;
  
  // Content types
  postsExtracted: number;
  jobsExtracted: number;
  articlesExtracted: number;
  
  // Rate limiting
  delaysTriggered: number;
  totalDelayTime: number;
  
  // Errors
  errors: ScrapingError[];
  warnings: string[];
}

/**
 * Scraping error details
 */
export interface ScrapingError {
  type: 'authentication' | 'extraction' | 'navigation' | 'timeout' | 'rate_limit';
  message: string;
  stack?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Security challenge detection
 */
export interface SecurityChallenge {
  detected: boolean;
  type: 'captcha' | 'verification' | 'suspicious_activity' | 'rate_limit';
  message: string;
  timestamp: Date;
  requiresManualIntervention: boolean;
}

/**
 * Content validation result
 */
export interface ContentValidationResult {
  isValid: boolean;
  score: number;
  reasons: string[];
  hasOpportunityKeywords: boolean;
  meetsSizeRequirements: boolean;
  hasRequiredFields: boolean;
}

/**
 * LinkedIn URL patterns and parsing
 */
export interface LinkedInUrlInfo {
  type: 'post' | 'job' | 'profile' | 'company' | 'group' | 'unknown';
  id?: string;
  isValid: boolean;
  fullUrl: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  cooldownPeriod: number;
  enableBackoff: boolean;
}

/**
 * Rate limiting state
 */
export interface RateLimitState {
  requestCount: number;
  windowStart: Date;
  isLimited: boolean;
  nextAllowedTime?: Date;
  backoffMultiplier: number;
}

/**
 * Browser initialization options
 */
export interface BrowserInitOptions {
  headless: boolean;
  viewport: { width: number; height: number };
  userAgent: string;
  locale: string;
  timezoneId: string;
  args: string[];
  stealth: boolean;
}

/**
 * Stealth configuration
 */
export interface StealthConfig {
  hideWebdriver: boolean;
  spoofChrome: boolean;
  randomizeViewport: boolean;
  disableAutomationFeatures: boolean;
  customUserAgent?: string;
}

/**
 * Monitoring configuration for groups and companies
 */
export interface MonitoringConfig {
  groups: MonitoringTarget[];
  companies: MonitoringTarget[];
  refreshInterval: number;
  maxPostsPerTarget: number;
}

/**
 * Monitoring target
 */
export interface MonitoringTarget {
  id: string;
  name: string;
  url: string;
  lastChecked?: Date;
  isActive: boolean;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Session management
 */
export interface SessionInfo {
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
  isValid: boolean;
  expiresAt?: Date;
  cookies: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  isHealthy: boolean;
  browserReady: boolean;
  authenticationValid: boolean;
  lastCheck: Date;
  errors: string[];
  responseTime: number;
}

/**
 * Cleanup configuration
 */
export interface CleanupConfig {
  closeBrowser: boolean;
  clearCookies: boolean;
  clearCache: boolean;
  timeout: number;
}

/**
 * Data processing pipeline configuration
 */
export interface ProcessingPipelineConfig {
  enableExtraction: boolean;
  enableCleaning: boolean;
  enableValidation: boolean;
  enableEnrichment: boolean;
  parallelProcessing: boolean;
  batchSize: number;
}

/**
 * LinkedIn scraper factory configuration
 */
export interface ScraperFactoryConfig {
  defaultConfig: Partial<LinkedInConfig>;
  browserPool: {
    maxInstances: number;
    reuseInstances: boolean;
    instanceTimeout: number;
  };
  monitoring: {
    enableMetrics: boolean;
    enableHealthChecks: boolean;
    healthCheckInterval: number;
  };
}

/**
 * Content enrichment data
 */
export interface ContentEnrichment {
  sentiment?: 'positive' | 'negative' | 'neutral';
  urgency?: 'low' | 'medium' | 'high';
  category?: string;
  skills?: string[];
  experience_level?: 'entry' | 'mid' | 'senior' | 'executive';
  remote_friendly?: boolean;
  salary_range?: {
    min: number;
    max: number;
    currency: string;
  };
}

/**
 * Export all types as a namespace for easier imports
 */
export namespace LinkedIn {
  export type Config = LinkedInConfig;
  export type Content = LinkedInContent;
  export type ContentType = LinkedInContentType;
  export type SearchContext = LinkedInSearchContext;
  export type Metrics = ScrapingMetrics;
  export type Error = ScrapingError;
  export type ValidationResult = ContentValidationResult;
  export type HealthCheck = HealthCheckResult;
}