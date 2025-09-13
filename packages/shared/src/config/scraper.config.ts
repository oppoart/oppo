/**
 * Scraper Configuration
 * Centralized web scraping settings
 */

import { ScraperConfig } from './types';

// Default scraper timeouts (in milliseconds)
export const SCRAPER_TIMEOUTS = {
  PAGE_LOAD: 30000,
  NAVIGATION: 30000,
  ELEMENT_WAIT: 10000,
  NETWORK_IDLE: 2000,
  SCROLL_DELAY: 1000,
  TYPING_DELAY: 100,
  DEFAULT_TIMEOUT: 60000,
} as const;

// Retry configuration
export const SCRAPER_RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 2000,
  MAX_DELAY: 10000,
  BACKOFF_MULTIPLIER: 2,
} as const;

// Browser settings
export const BROWSER_SETTINGS = {
  HEADLESS: true,
  SANDBOX: true,
  DISABLE_GPU: true,
  NO_SANDBOX_FLAGS: ['--no-sandbox', '--disable-setuid-sandbox'],
  VIEWPORT: {
    width: 1920,
    height: 1080,
  },
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const;

// LinkedIn scraper selectors
export const LINKEDIN_SELECTORS = {
  // Login selectors
  LOGIN_EMAIL: 'input#username',
  LOGIN_PASSWORD: 'input#password',
  LOGIN_BUTTON: 'button[type="submit"]',
  
  // Profile selectors
  PROFILE_NAME: 'h1.text-heading-xlarge',
  PROFILE_HEADLINE: 'div.text-body-medium',
  PROFILE_LOCATION: 'span.text-body-small',
  PROFILE_ABOUT: 'div.display-flex.ph5.pv3 span[aria-hidden="true"]',
  
  // Job selectors
  JOB_TITLE: 'h1.jobs-unified-top-card__job-title',
  JOB_COMPANY: 'div.jobs-unified-top-card__company-name',
  JOB_LOCATION: 'span.jobs-unified-top-card__bullet',
  JOB_DESCRIPTION: 'div.jobs-description__content',
  
  // Search selectors
  SEARCH_INPUT: 'input.search-global-typeahead__input',
  SEARCH_RESULTS: 'ul.reusable-search__entity-result-list',
  SEARCH_RESULT_ITEM: 'li.reusable-search__result-container',
  
  // Pagination
  NEXT_BUTTON: 'button[aria-label="Next"]',
  PAGE_NUMBER: 'button[aria-current="true"]',
} as const;

// Twitter scraper selectors
export const TWITTER_SELECTORS = {
  // Login selectors
  LOGIN_USERNAME: 'input[name="text"]',
  LOGIN_PASSWORD: 'input[name="password"]',
  LOGIN_BUTTON: 'div[data-testid="LoginForm_Login_Button"]',
  
  // Tweet selectors
  TWEET_TEXT: 'div[data-testid="tweetText"]',
  TWEET_USERNAME: 'div[data-testid="User-Names"]',
  TWEET_TIMESTAMP: 'time',
  TWEET_STATS: 'div[data-testid="reply"], div[data-testid="retweet"], div[data-testid="like"]',
  
  // Profile selectors
  PROFILE_NAME: 'div[data-testid="UserName"]',
  PROFILE_BIO: 'div[data-testid="UserDescription"]',
  PROFILE_LOCATION: 'span[data-testid="UserLocation"]',
  PROFILE_WEBSITE: 'a[data-testid="UserUrl"]',
  
  // Search selectors
  SEARCH_INPUT: 'input[data-testid="SearchBox_Search_Input"]',
  SEARCH_RESULTS: 'div[data-testid="primaryColumn"]',
  SEARCH_TAB_TOP: 'a[href*="f=live"]',
} as const;

// Bing scraper selectors
export const BING_SELECTORS = {
  SEARCH_INPUT: 'input#sb_form_q',
  SEARCH_BUTTON: 'input#sb_form_go',
  SEARCH_RESULTS: 'ol#b_results',
  RESULT_ITEM: 'li.b_algo',
  RESULT_TITLE: 'h2 a',
  RESULT_SNIPPET: 'div.b_caption p',
  RESULT_URL: 'cite',
  NEXT_PAGE: 'a.sb_pagN',
  PAGINATION: 'nav[role="navigation"]',
} as const;

// Google scraper selectors
export const GOOGLE_SELECTORS = {
  SEARCH_INPUT: 'input[name="q"]',
  SEARCH_BUTTON: 'input[name="btnK"]',
  SEARCH_RESULTS: 'div#search',
  RESULT_ITEM: 'div.g',
  RESULT_TITLE: 'h3',
  RESULT_SNIPPET: 'div.VwiC3b',
  RESULT_URL: 'a[href]',
  NEXT_PAGE: 'a#pnnext',
  PAGINATION: 'div[role="navigation"]',
} as const;

// Rate limiting per scraper
export const SCRAPER_RATE_LIMITS = {
  LINKEDIN: {
    REQUESTS_PER_HOUR: 60,
    COOLDOWN_MS: 5000,
  },
  TWITTER: {
    REQUESTS_PER_HOUR: 180,
    COOLDOWN_MS: 3000,
  },
  GOOGLE: {
    REQUESTS_PER_HOUR: 100,
    COOLDOWN_MS: 2000,
  },
  BING: {
    REQUESTS_PER_HOUR: 120,
    COOLDOWN_MS: 2000,
  },
  DEFAULT: {
    REQUESTS_PER_HOUR: 60,
    COOLDOWN_MS: 3000,
  },
} as const;

// Create LinkedIn scraper configuration
export function createLinkedInScraperConfig(): ScraperConfig {
  return {
    defaultTimeout: SCRAPER_TIMEOUTS.DEFAULT_TIMEOUT,
    retryAttempts: SCRAPER_RETRY.MAX_ATTEMPTS,
    userAgent: BROWSER_SETTINGS.USER_AGENT,
    headless: process.env.SCRAPER_HEADLESS !== 'false',
    viewport: BROWSER_SETTINGS.VIEWPORT,
    selectors: LINKEDIN_SELECTORS,
    waitConditions: {
      pageLoad: SCRAPER_TIMEOUTS.PAGE_LOAD,
      navigation: SCRAPER_TIMEOUTS.NAVIGATION,
      element: SCRAPER_TIMEOUTS.ELEMENT_WAIT,
    },
  };
}

// Create Twitter scraper configuration
export function createTwitterScraperConfig(): ScraperConfig {
  return {
    defaultTimeout: SCRAPER_TIMEOUTS.DEFAULT_TIMEOUT,
    retryAttempts: SCRAPER_RETRY.MAX_ATTEMPTS,
    userAgent: BROWSER_SETTINGS.USER_AGENT,
    headless: process.env.SCRAPER_HEADLESS !== 'false',
    viewport: BROWSER_SETTINGS.VIEWPORT,
    selectors: TWITTER_SELECTORS,
    waitConditions: {
      pageLoad: SCRAPER_TIMEOUTS.PAGE_LOAD,
      navigation: SCRAPER_TIMEOUTS.NAVIGATION,
      element: SCRAPER_TIMEOUTS.ELEMENT_WAIT,
    },
  };
}

// Create Bing scraper configuration
export function createBingScraperConfig(): ScraperConfig {
  return {
    defaultTimeout: SCRAPER_TIMEOUTS.DEFAULT_TIMEOUT,
    retryAttempts: SCRAPER_RETRY.MAX_ATTEMPTS,
    userAgent: BROWSER_SETTINGS.USER_AGENT,
    headless: process.env.SCRAPER_HEADLESS !== 'false',
    viewport: BROWSER_SETTINGS.VIEWPORT,
    selectors: BING_SELECTORS,
    waitConditions: {
      pageLoad: SCRAPER_TIMEOUTS.PAGE_LOAD,
      navigation: SCRAPER_TIMEOUTS.NAVIGATION,
      element: SCRAPER_TIMEOUTS.ELEMENT_WAIT,
    },
  };
}

// Create default scraper configuration
export function createDefaultScraperConfig(): ScraperConfig {
  return {
    defaultTimeout: SCRAPER_TIMEOUTS.DEFAULT_TIMEOUT,
    retryAttempts: SCRAPER_RETRY.MAX_ATTEMPTS,
    userAgent: BROWSER_SETTINGS.USER_AGENT,
    headless: process.env.SCRAPER_HEADLESS !== 'false',
    viewport: BROWSER_SETTINGS.VIEWPORT,
    selectors: {},
    waitConditions: {
      pageLoad: SCRAPER_TIMEOUTS.PAGE_LOAD,
      navigation: SCRAPER_TIMEOUTS.NAVIGATION,
      element: SCRAPER_TIMEOUTS.ELEMENT_WAIT,
    },
  };
}

// Export scraper configurations
export const scraperConfigs = {
  linkedin: createLinkedInScraperConfig(),
  twitter: createTwitterScraperConfig(),
  bing: createBingScraperConfig(),
  default: createDefaultScraperConfig(),
};