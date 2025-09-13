"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIMEOUTS = exports.SCRAPING_STATUSES = exports.DEFAULT_USER_AGENT = exports.CONTENT_LIMITS = exports.ART_KEYWORDS = exports.CONTENT_FILTERS = exports.EXTRACTION_PATTERNS = exports.SCRAPING_METHODS = void 0;
exports.SCRAPING_METHODS = {
    FIRECRAWL: 'firecrawl',
    PLAYWRIGHT: 'playwright',
    CHEERIO: 'cheerio',
};
exports.EXTRACTION_PATTERNS = {
    ORGANIZATION: [
        /(?:by|from|organization|foundation|institute|university|college|center|gallery|museum):\s*([^\n]+)/i,
        /hosted by\s+([^\n]+)/i,
        /presented by\s+([^\n]+)/i,
    ],
    DEADLINE: [
        /deadline[:\s]+([^\n]+)/i,
        /due[:\s]+([^\n]+)/i,
        /apply by[:\s]+([^\n]+)/i,
        /closes[:\s]+([^\n]+)/i,
        /submission deadline[:\s]+([^\n]+)/i,
    ],
    AMOUNT: [
        /\$[\d,]+(?:\.\d{2})?/g,
        /[\d,]+\s*(?:USD|dollars?|€|euros?|£|pounds?)/gi,
        /(?:grant|award|prize|funding|stipend)[:\s]*\$?([\d,]+)/gi,
        /up to\s*\$?([\d,]+)/gi,
    ],
    LOCATION: [
        /location[:\s]+([^\n]+)/i,
        /(?:in|at)\s+([A-Z][a-z]+,\s*[A-Z]{2,})/g,
        /([A-Z][a-z]+,\s*[A-Z][a-z]+)/g,
    ],
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
};
exports.CONTENT_FILTERS = {
    UNWANTED_SELECTORS: [
        'script',
        'style',
        'nav',
        'footer',
        'header',
        '.advertisement',
        '.ads',
        '.sidebar'
    ],
    INCLUDE_TAGS: [
        'title',
        'meta',
        'h1',
        'h2',
        'h3',
        'p',
        'ul',
        'ol',
        'li',
        'a',
        'time',
        'date'
    ],
    EXCLUDE_TAGS: [
        'script',
        'style',
        'nav',
        'footer',
        'header',
        'advertisement'
    ],
};
exports.ART_KEYWORDS = {
    'Visual Arts': ['painting', 'drawing', 'sculpture', 'photography', 'printmaking'],
    'Digital Arts': ['digital art', 'new media', 'interactive', 'generative', 'ai art', 'nft'],
    'Performance': ['performance', 'dance', 'theater', 'music', 'live art'],
    'Installation': ['installation', 'public art', 'environmental', 'site-specific'],
    'Mixed Media': ['mixed media', 'multimedia', 'interdisciplinary', 'experimental'],
};
exports.CONTENT_LIMITS = {
    TITLE_MAX_LENGTH: 255,
    DESCRIPTION_MAX_LENGTH: 2000,
    ORGANIZATION_MAX_LENGTH: 100,
    LOCATION_MAX_LENGTH: 100,
    REQUIREMENT_MAX_LENGTH: 200,
    RAW_CONTENT_MAX_LENGTH: 5000,
    MAX_REQUIREMENTS: 5,
    MAX_TAGS: 10,
};
exports.DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
exports.SCRAPING_STATUSES = {
    SUCCESS: 'success',
    FAILED: 'failed',
    PARTIAL: 'partial',
    TIMEOUT: 'timeout',
    BLOCKED: 'blocked',
};
exports.DEFAULT_TIMEOUTS = {
    HTTP_REQUEST: 10000,
    PAGE_LOAD: 10000,
    ELEMENT_WAIT: 2000,
    PROCESSING_DELAY: 2000,
};
//# sourceMappingURL=scraper.constants.js.map