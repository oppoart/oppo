export declare const SEARCH_ENGINES: {
    readonly GOOGLE: "google";
    readonly BING: "bing";
    readonly YANDEX: "yandex";
    readonly DUCKDUCKGO: "duckduckgo";
    readonly SERPAPI: "serpapi";
};
export declare const SEARCH_RESULT_TYPES: {
    readonly ORGANIC: "organic";
    readonly PAID: "paid";
    readonly NEWS: "news";
    readonly IMAGES: "images";
    readonly VIDEOS: "videos";
    readonly SHOPPING: "shopping";
    readonly LOCAL: "local";
};
export declare const SEARCH_OPERATORS: {
    readonly AND: "AND";
    readonly OR: "OR";
    readonly NOT: "NOT";
    readonly EXACT_PHRASE: "\"";
    readonly WILDCARD: "*";
    readonly SITE: "site:";
    readonly FILETYPE: "filetype:";
    readonly INTITLE: "intitle:";
    readonly INURL: "inurl:";
    readonly RELATED: "related:";
};
export declare const ART_OPPORTUNITY_KEYWORDS: readonly ["art grant", "artist residency", "art exhibition", "art competition", "artist fellowship", "call for artists", "art opportunity", "creative grant", "visual arts funding", "artist opportunity", "art commission", "gallery call", "artist call", "art prize", "art award", "creative fellowship", "art scholarship", "public art commission", "artist-in-residence", "emerging artist", "contemporary art", "digital art", "installation art", "performance art", "sculpture competition", "painting grant", "photography award"];
export declare const SEARCH_QUERY_TEMPLATES: {
    readonly BASIC_GRANT: "{medium} grant {year}";
    readonly LOCATION_SPECIFIC: "{medium} {location} grant";
    readonly DEADLINE_BASED: "{medium} grant deadline {month}";
    readonly DEMOGRAPHIC_SPECIFIC: "{demographic} {medium} grant";
    readonly AMOUNT_SPECIFIC: "{medium} grant ${amount}";
    readonly RESIDENCY: "{medium} artist residency {location}";
    readonly EXHIBITION: "{medium} exhibition call {year}";
    readonly COMPETITION: "{medium} competition {theme}";
    readonly FELLOWSHIP: "{demographic} {medium} fellowship";
    readonly COMMISSION: "public art commission {location}";
};
export declare const SEARCH_FILTERS: {
    readonly TIME_RANGE: {
        readonly ANY: "any";
        readonly PAST_HOUR: "past-hour";
        readonly PAST_24_HOURS: "past-24h";
        readonly PAST_WEEK: "past-week";
        readonly PAST_MONTH: "past-month";
        readonly PAST_YEAR: "past-year";
        readonly CUSTOM: "custom";
    };
    readonly LANGUAGE: {
        readonly ANY: "any";
        readonly ENGLISH: "en";
        readonly SPANISH: "es";
        readonly FRENCH: "fr";
        readonly GERMAN: "de";
        readonly CHINESE: "zh";
        readonly JAPANESE: "ja";
        readonly PORTUGUESE: "pt";
        readonly ITALIAN: "it";
        readonly RUSSIAN: "ru";
    };
    readonly REGION: {
        readonly ANY: "any";
        readonly NORTH_AMERICA: "north-america";
        readonly EUROPE: "europe";
        readonly ASIA: "asia";
        readonly OCEANIA: "oceania";
        readonly AFRICA: "africa";
        readonly SOUTH_AMERICA: "south-america";
    };
    readonly SAFE_SEARCH: {
        readonly OFF: "off";
        readonly MODERATE: "moderate";
        readonly STRICT: "strict";
    };
};
export declare const QUALITY_INDICATORS: {
    readonly OFFICIAL_WEBSITE: "official-website";
    readonly GOVERNMENT_SITE: "government-site";
    readonly EDUCATIONAL_INSTITUTION: "educational-institution";
    readonly KNOWN_ORGANIZATION: "known-organization";
    readonly HTTPS_SECURE: "https-secure";
    readonly RECENTLY_UPDATED: "recently-updated";
    readonly VERIFIED_SOURCE: "verified-source";
    readonly HIGH_AUTHORITY: "high-authority";
};
export declare const TRUSTED_DOMAINS: readonly ["arts.gov", "nea.gov", "artscouncil.org.uk", "canadacouncil.ca", "creativenz.govt.nz", "australiacouncil.gov.au", "goethe.de", "britishcouncil.org", "unesco.org", "europa.eu", "smithsonian.edu", "moma.org", "tate.org.uk", "guggenheim.org", "metmuseum.org", "whitney.org", "lacma.org", "sfmoma.org", "artforum.com", "artnet.com", "hyperallergic.com", "artsy.net", "frieze.com", "e-flux.com", "artcritical.com", "contemporaryartdaily.com"];
export declare const API_LIMITS: {
    readonly GOOGLE_CUSTOM_SEARCH: {
        readonly FREE_TIER: 100;
        readonly PAID_TIER: 10000;
    };
    readonly BING_SEARCH: {
        readonly FREE_TIER: 1000;
        readonly PAID_TIER: 1000000;
    };
    readonly SERPAPI: {
        readonly FREE_TIER: 100;
        readonly STARTER: 5000;
        readonly PRO: 50000;
    };
};
export declare const RELEVANCE_WEIGHTS: {
    readonly TITLE_MATCH: 0.4;
    readonly DESCRIPTION_MATCH: 0.3;
    readonly DOMAIN_AUTHORITY: 0.15;
    readonly RECENCY: 0.1;
    readonly KEYWORD_DENSITY: 0.05;
};
