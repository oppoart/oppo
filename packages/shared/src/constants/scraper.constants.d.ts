export declare const SCRAPING_METHODS: {
    readonly FIRECRAWL: "firecrawl";
    readonly PLAYWRIGHT: "playwright";
    readonly CHEERIO: "cheerio";
};
export declare const EXTRACTION_PATTERNS: {
    readonly ORGANIZATION: readonly [RegExp, RegExp, RegExp];
    readonly DEADLINE: readonly [RegExp, RegExp, RegExp, RegExp, RegExp];
    readonly AMOUNT: readonly [RegExp, RegExp, RegExp, RegExp];
    readonly LOCATION: readonly [RegExp, RegExp, RegExp];
    readonly EMAIL: RegExp;
};
export declare const CONTENT_FILTERS: {
    readonly UNWANTED_SELECTORS: readonly ["script", "style", "nav", "footer", "header", ".advertisement", ".ads", ".sidebar"];
    readonly INCLUDE_TAGS: readonly ["title", "meta", "h1", "h2", "h3", "p", "ul", "ol", "li", "a", "time", "date"];
    readonly EXCLUDE_TAGS: readonly ["script", "style", "nav", "footer", "header", "advertisement"];
};
export declare const ART_KEYWORDS: {
    readonly 'Visual Arts': readonly ["painting", "drawing", "sculpture", "photography", "printmaking"];
    readonly 'Digital Arts': readonly ["digital art", "new media", "interactive", "generative", "ai art", "nft"];
    readonly Performance: readonly ["performance", "dance", "theater", "music", "live art"];
    readonly Installation: readonly ["installation", "public art", "environmental", "site-specific"];
    readonly 'Mixed Media': readonly ["mixed media", "multimedia", "interdisciplinary", "experimental"];
};
export declare const CONTENT_LIMITS: {
    readonly TITLE_MAX_LENGTH: 255;
    readonly DESCRIPTION_MAX_LENGTH: 2000;
    readonly ORGANIZATION_MAX_LENGTH: 100;
    readonly LOCATION_MAX_LENGTH: 100;
    readonly REQUIREMENT_MAX_LENGTH: 200;
    readonly RAW_CONTENT_MAX_LENGTH: 5000;
    readonly MAX_REQUIREMENTS: 5;
    readonly MAX_TAGS: 10;
};
export declare const DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
export declare const SCRAPING_STATUSES: {
    readonly SUCCESS: "success";
    readonly FAILED: "failed";
    readonly PARTIAL: "partial";
    readonly TIMEOUT: "timeout";
    readonly BLOCKED: "blocked";
};
export declare const DEFAULT_TIMEOUTS: {
    readonly HTTP_REQUEST: 10000;
    readonly PAGE_LOAD: 10000;
    readonly ELEMENT_WAIT: 2000;
    readonly PROCESSING_DELAY: 2000;
};
//# sourceMappingURL=scraper.constants.d.ts.map