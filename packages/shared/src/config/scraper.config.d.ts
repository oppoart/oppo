import { ScraperConfig } from './types';
export declare const SCRAPER_TIMEOUTS: {
    readonly PAGE_LOAD: 30000;
    readonly NAVIGATION: 30000;
    readonly ELEMENT_WAIT: 10000;
    readonly NETWORK_IDLE: 2000;
    readonly SCROLL_DELAY: 1000;
    readonly TYPING_DELAY: 100;
    readonly DEFAULT_TIMEOUT: 60000;
};
export declare const SCRAPER_RETRY: {
    readonly MAX_ATTEMPTS: 3;
    readonly INITIAL_DELAY: 2000;
    readonly MAX_DELAY: 10000;
    readonly BACKOFF_MULTIPLIER: 2;
};
export declare const BROWSER_SETTINGS: {
    readonly HEADLESS: true;
    readonly SANDBOX: true;
    readonly DISABLE_GPU: true;
    readonly NO_SANDBOX_FLAGS: readonly ["--no-sandbox", "--disable-setuid-sandbox"];
    readonly VIEWPORT: {
        readonly width: 1920;
        readonly height: 1080;
    };
    readonly USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
};
export declare const LINKEDIN_SELECTORS: {
    readonly LOGIN_EMAIL: "input#username";
    readonly LOGIN_PASSWORD: "input#password";
    readonly LOGIN_BUTTON: "button[type=\"submit\"]";
    readonly PROFILE_NAME: "h1.text-heading-xlarge";
    readonly PROFILE_HEADLINE: "div.text-body-medium";
    readonly PROFILE_LOCATION: "span.text-body-small";
    readonly PROFILE_ABOUT: "div.display-flex.ph5.pv3 span[aria-hidden=\"true\"]";
    readonly JOB_TITLE: "h1.jobs-unified-top-card__job-title";
    readonly JOB_COMPANY: "div.jobs-unified-top-card__company-name";
    readonly JOB_LOCATION: "span.jobs-unified-top-card__bullet";
    readonly JOB_DESCRIPTION: "div.jobs-description__content";
    readonly SEARCH_INPUT: "input.search-global-typeahead__input";
    readonly SEARCH_RESULTS: "ul.reusable-search__entity-result-list";
    readonly SEARCH_RESULT_ITEM: "li.reusable-search__result-container";
    readonly NEXT_BUTTON: "button[aria-label=\"Next\"]";
    readonly PAGE_NUMBER: "button[aria-current=\"true\"]";
};
export declare const TWITTER_SELECTORS: {
    readonly LOGIN_USERNAME: "input[name=\"text\"]";
    readonly LOGIN_PASSWORD: "input[name=\"password\"]";
    readonly LOGIN_BUTTON: "div[data-testid=\"LoginForm_Login_Button\"]";
    readonly TWEET_TEXT: "div[data-testid=\"tweetText\"]";
    readonly TWEET_USERNAME: "div[data-testid=\"User-Names\"]";
    readonly TWEET_TIMESTAMP: "time";
    readonly TWEET_STATS: "div[data-testid=\"reply\"], div[data-testid=\"retweet\"], div[data-testid=\"like\"]";
    readonly PROFILE_NAME: "div[data-testid=\"UserName\"]";
    readonly PROFILE_BIO: "div[data-testid=\"UserDescription\"]";
    readonly PROFILE_LOCATION: "span[data-testid=\"UserLocation\"]";
    readonly PROFILE_WEBSITE: "a[data-testid=\"UserUrl\"]";
    readonly SEARCH_INPUT: "input[data-testid=\"SearchBox_Search_Input\"]";
    readonly SEARCH_RESULTS: "div[data-testid=\"primaryColumn\"]";
    readonly SEARCH_TAB_TOP: "a[href*=\"f=live\"]";
};
export declare const BING_SELECTORS: {
    readonly SEARCH_INPUT: "input#sb_form_q";
    readonly SEARCH_BUTTON: "input#sb_form_go";
    readonly SEARCH_RESULTS: "ol#b_results";
    readonly RESULT_ITEM: "li.b_algo";
    readonly RESULT_TITLE: "h2 a";
    readonly RESULT_SNIPPET: "div.b_caption p";
    readonly RESULT_URL: "cite";
    readonly NEXT_PAGE: "a.sb_pagN";
    readonly PAGINATION: "nav[role=\"navigation\"]";
};
export declare const GOOGLE_SELECTORS: {
    readonly SEARCH_INPUT: "input[name=\"q\"]";
    readonly SEARCH_BUTTON: "input[name=\"btnK\"]";
    readonly SEARCH_RESULTS: "div#search";
    readonly RESULT_ITEM: "div.g";
    readonly RESULT_TITLE: "h3";
    readonly RESULT_SNIPPET: "div.VwiC3b";
    readonly RESULT_URL: "a[href]";
    readonly NEXT_PAGE: "a#pnnext";
    readonly PAGINATION: "div[role=\"navigation\"]";
};
export declare const SCRAPER_RATE_LIMITS: {
    readonly LINKEDIN: {
        readonly REQUESTS_PER_HOUR: 60;
        readonly COOLDOWN_MS: 5000;
    };
    readonly TWITTER: {
        readonly REQUESTS_PER_HOUR: 180;
        readonly COOLDOWN_MS: 3000;
    };
    readonly GOOGLE: {
        readonly REQUESTS_PER_HOUR: 100;
        readonly COOLDOWN_MS: 2000;
    };
    readonly BING: {
        readonly REQUESTS_PER_HOUR: 120;
        readonly COOLDOWN_MS: 2000;
    };
    readonly DEFAULT: {
        readonly REQUESTS_PER_HOUR: 60;
        readonly COOLDOWN_MS: 3000;
    };
};
export declare function createLinkedInScraperConfig(): ScraperConfig;
export declare function createTwitterScraperConfig(): ScraperConfig;
export declare function createBingScraperConfig(): ScraperConfig;
export declare function createDefaultScraperConfig(): ScraperConfig;
export declare const scraperConfigs: {
    linkedin: ScraperConfig;
    twitter: ScraperConfig;
    bing: ScraperConfig;
    default: ScraperConfig;
};
//# sourceMappingURL=scraper.config.d.ts.map