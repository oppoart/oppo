"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperConfigs = exports.SCRAPER_RATE_LIMITS = exports.GOOGLE_SELECTORS = exports.BING_SELECTORS = exports.TWITTER_SELECTORS = exports.LINKEDIN_SELECTORS = exports.BROWSER_SETTINGS = exports.SCRAPER_RETRY = exports.SCRAPER_TIMEOUTS = void 0;
exports.createLinkedInScraperConfig = createLinkedInScraperConfig;
exports.createTwitterScraperConfig = createTwitterScraperConfig;
exports.createBingScraperConfig = createBingScraperConfig;
exports.createDefaultScraperConfig = createDefaultScraperConfig;
exports.SCRAPER_TIMEOUTS = {
    PAGE_LOAD: 30000,
    NAVIGATION: 30000,
    ELEMENT_WAIT: 10000,
    NETWORK_IDLE: 2000,
    SCROLL_DELAY: 1000,
    TYPING_DELAY: 100,
    DEFAULT_TIMEOUT: 60000,
};
exports.SCRAPER_RETRY = {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 2000,
    MAX_DELAY: 10000,
    BACKOFF_MULTIPLIER: 2,
};
exports.BROWSER_SETTINGS = {
    HEADLESS: true,
    SANDBOX: true,
    DISABLE_GPU: true,
    NO_SANDBOX_FLAGS: ['--no-sandbox', '--disable-setuid-sandbox'],
    VIEWPORT: {
        width: 1920,
        height: 1080,
    },
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};
exports.LINKEDIN_SELECTORS = {
    LOGIN_EMAIL: 'input#username',
    LOGIN_PASSWORD: 'input#password',
    LOGIN_BUTTON: 'button[type="submit"]',
    PROFILE_NAME: 'h1.text-heading-xlarge',
    PROFILE_HEADLINE: 'div.text-body-medium',
    PROFILE_LOCATION: 'span.text-body-small',
    PROFILE_ABOUT: 'div.display-flex.ph5.pv3 span[aria-hidden="true"]',
    JOB_TITLE: 'h1.jobs-unified-top-card__job-title',
    JOB_COMPANY: 'div.jobs-unified-top-card__company-name',
    JOB_LOCATION: 'span.jobs-unified-top-card__bullet',
    JOB_DESCRIPTION: 'div.jobs-description__content',
    SEARCH_INPUT: 'input.search-global-typeahead__input',
    SEARCH_RESULTS: 'ul.reusable-search__entity-result-list',
    SEARCH_RESULT_ITEM: 'li.reusable-search__result-container',
    NEXT_BUTTON: 'button[aria-label="Next"]',
    PAGE_NUMBER: 'button[aria-current="true"]',
};
exports.TWITTER_SELECTORS = {
    LOGIN_USERNAME: 'input[name="text"]',
    LOGIN_PASSWORD: 'input[name="password"]',
    LOGIN_BUTTON: 'div[data-testid="LoginForm_Login_Button"]',
    TWEET_TEXT: 'div[data-testid="tweetText"]',
    TWEET_USERNAME: 'div[data-testid="User-Names"]',
    TWEET_TIMESTAMP: 'time',
    TWEET_STATS: 'div[data-testid="reply"], div[data-testid="retweet"], div[data-testid="like"]',
    PROFILE_NAME: 'div[data-testid="UserName"]',
    PROFILE_BIO: 'div[data-testid="UserDescription"]',
    PROFILE_LOCATION: 'span[data-testid="UserLocation"]',
    PROFILE_WEBSITE: 'a[data-testid="UserUrl"]',
    SEARCH_INPUT: 'input[data-testid="SearchBox_Search_Input"]',
    SEARCH_RESULTS: 'div[data-testid="primaryColumn"]',
    SEARCH_TAB_TOP: 'a[href*="f=live"]',
};
exports.BING_SELECTORS = {
    SEARCH_INPUT: 'input#sb_form_q',
    SEARCH_BUTTON: 'input#sb_form_go',
    SEARCH_RESULTS: 'ol#b_results',
    RESULT_ITEM: 'li.b_algo',
    RESULT_TITLE: 'h2 a',
    RESULT_SNIPPET: 'div.b_caption p',
    RESULT_URL: 'cite',
    NEXT_PAGE: 'a.sb_pagN',
    PAGINATION: 'nav[role="navigation"]',
};
exports.GOOGLE_SELECTORS = {
    SEARCH_INPUT: 'input[name="q"]',
    SEARCH_BUTTON: 'input[name="btnK"]',
    SEARCH_RESULTS: 'div#search',
    RESULT_ITEM: 'div.g',
    RESULT_TITLE: 'h3',
    RESULT_SNIPPET: 'div.VwiC3b',
    RESULT_URL: 'a[href]',
    NEXT_PAGE: 'a#pnnext',
    PAGINATION: 'div[role="navigation"]',
};
exports.SCRAPER_RATE_LIMITS = {
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
};
function createLinkedInScraperConfig() {
    return {
        defaultTimeout: exports.SCRAPER_TIMEOUTS.DEFAULT_TIMEOUT,
        retryAttempts: exports.SCRAPER_RETRY.MAX_ATTEMPTS,
        userAgent: exports.BROWSER_SETTINGS.USER_AGENT,
        headless: process.env.SCRAPER_HEADLESS !== 'false',
        viewport: exports.BROWSER_SETTINGS.VIEWPORT,
        selectors: exports.LINKEDIN_SELECTORS,
        waitConditions: {
            pageLoad: exports.SCRAPER_TIMEOUTS.PAGE_LOAD,
            navigation: exports.SCRAPER_TIMEOUTS.NAVIGATION,
            element: exports.SCRAPER_TIMEOUTS.ELEMENT_WAIT,
        },
    };
}
function createTwitterScraperConfig() {
    return {
        defaultTimeout: exports.SCRAPER_TIMEOUTS.DEFAULT_TIMEOUT,
        retryAttempts: exports.SCRAPER_RETRY.MAX_ATTEMPTS,
        userAgent: exports.BROWSER_SETTINGS.USER_AGENT,
        headless: process.env.SCRAPER_HEADLESS !== 'false',
        viewport: exports.BROWSER_SETTINGS.VIEWPORT,
        selectors: exports.TWITTER_SELECTORS,
        waitConditions: {
            pageLoad: exports.SCRAPER_TIMEOUTS.PAGE_LOAD,
            navigation: exports.SCRAPER_TIMEOUTS.NAVIGATION,
            element: exports.SCRAPER_TIMEOUTS.ELEMENT_WAIT,
        },
    };
}
function createBingScraperConfig() {
    return {
        defaultTimeout: exports.SCRAPER_TIMEOUTS.DEFAULT_TIMEOUT,
        retryAttempts: exports.SCRAPER_RETRY.MAX_ATTEMPTS,
        userAgent: exports.BROWSER_SETTINGS.USER_AGENT,
        headless: process.env.SCRAPER_HEADLESS !== 'false',
        viewport: exports.BROWSER_SETTINGS.VIEWPORT,
        selectors: exports.BING_SELECTORS,
        waitConditions: {
            pageLoad: exports.SCRAPER_TIMEOUTS.PAGE_LOAD,
            navigation: exports.SCRAPER_TIMEOUTS.NAVIGATION,
            element: exports.SCRAPER_TIMEOUTS.ELEMENT_WAIT,
        },
    };
}
function createDefaultScraperConfig() {
    return {
        defaultTimeout: exports.SCRAPER_TIMEOUTS.DEFAULT_TIMEOUT,
        retryAttempts: exports.SCRAPER_RETRY.MAX_ATTEMPTS,
        userAgent: exports.BROWSER_SETTINGS.USER_AGENT,
        headless: process.env.SCRAPER_HEADLESS !== 'false',
        viewport: exports.BROWSER_SETTINGS.VIEWPORT,
        selectors: {},
        waitConditions: {
            pageLoad: exports.SCRAPER_TIMEOUTS.PAGE_LOAD,
            navigation: exports.SCRAPER_TIMEOUTS.NAVIGATION,
            element: exports.SCRAPER_TIMEOUTS.ELEMENT_WAIT,
        },
    };
}
exports.scraperConfigs = {
    linkedin: createLinkedInScraperConfig(),
    twitter: createTwitterScraperConfig(),
    bing: createBingScraperConfig(),
    default: createDefaultScraperConfig(),
};
//# sourceMappingURL=scraper.config.js.map