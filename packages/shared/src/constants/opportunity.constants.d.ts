export declare const OPPORTUNITY_TYPES: {
    readonly GRANT: "grant";
    readonly RESIDENCY: "residency";
    readonly EXHIBITION: "exhibition";
    readonly COMPETITION: "competition";
    readonly FELLOWSHIP: "fellowship";
    readonly WORKSHOP: "workshop";
    readonly CONFERENCE: "conference";
    readonly COMMISSION: "commission";
    readonly JOB: "job";
    readonly COLLABORATION: "collaboration";
    readonly CALL_FOR_ARTISTS: "call-for-artists";
    readonly MENTORSHIP: "mentorship";
};
export declare const OPPORTUNITY_CATEGORIES: {
    readonly FUNDING: "funding";
    readonly PROFESSIONAL_DEVELOPMENT: "professional-development";
    readonly EXHIBITION_OPPORTUNITIES: "exhibition-opportunities";
    readonly CAREER_OPPORTUNITIES: "career-opportunities";
    readonly EDUCATIONAL: "educational";
    readonly NETWORKING: "networking";
    readonly COLLABORATIVE: "collaborative";
    readonly INTERNATIONAL: "international";
};
export declare const APPLICATION_STATUSES: {
    readonly NOT_STARTED: "not-started";
    readonly IN_PROGRESS: "in-progress";
    readonly SUBMITTED: "submitted";
    readonly UNDER_REVIEW: "under-review";
    readonly ACCEPTED: "accepted";
    readonly REJECTED: "rejected";
    readonly WAITLISTED: "waitlisted";
    readonly WITHDRAWN: "withdrawn";
};
export declare const RELEVANCE_THRESHOLDS: {
    readonly VERY_LOW: 0.2;
    readonly LOW: 0.4;
    readonly MEDIUM: 0.6;
    readonly HIGH: 0.8;
    readonly VERY_HIGH: 0.9;
};
export declare const DEADLINE_URGENCY: {
    readonly OVERDUE: -1;
    readonly URGENT: 7;
    readonly SOON: 14;
    readonly MODERATE: 30;
    readonly DISTANT: 90;
};
export declare const FUNDING_RANGES: {
    readonly MICRO: {
        readonly min: 0;
        readonly max: 1000;
    };
    readonly SMALL: {
        readonly min: 1000;
        readonly max: 5000;
    };
    readonly MEDIUM: {
        readonly min: 5000;
        readonly max: 25000;
    };
    readonly LARGE: {
        readonly min: 25000;
        readonly max: 100000;
    };
    readonly MAJOR: {
        readonly min: 100000;
        readonly max: number;
    };
};
export declare const GEOGRAPHIC_SCOPE: {
    readonly LOCAL: "local";
    readonly REGIONAL: "regional";
    readonly NATIONAL: "national";
    readonly INTERNATIONAL: "international";
    readonly GLOBAL: "global";
    readonly VIRTUAL: "virtual";
};
export declare const DURATION_TYPES: {
    readonly ONE_TIME: "one-time";
    readonly SHORT_TERM: "short-term";
    readonly MEDIUM_TERM: "medium-term";
    readonly LONG_TERM: "long-term";
    readonly ONGOING: "ongoing";
    readonly RECURRING: "recurring";
};
export declare const TARGET_DEMOGRAPHICS: {
    readonly EMERGING: "emerging";
    readonly MID_CAREER: "mid-career";
    readonly ESTABLISHED: "established";
    readonly STUDENT: "student";
    readonly PROFESSIONAL: "professional";
    readonly SENIOR: "senior";
    readonly ANY_LEVEL: "any-level";
};
export declare const ART_DISCIPLINES: {
    readonly VISUAL_ARTS: "visual-arts";
    readonly DIGITAL_ARTS: "digital-arts";
    readonly PERFORMANCE: "performance";
    readonly SCULPTURE: "sculpture";
    readonly PAINTING: "painting";
    readonly PHOTOGRAPHY: "photography";
    readonly PRINTMAKING: "printmaking";
    readonly CERAMICS: "ceramics";
    readonly TEXTILE_ARTS: "textile-arts";
    readonly INSTALLATION: "installation";
    readonly VIDEO_ART: "video-art";
    readonly SOUND_ART: "sound-art";
    readonly NEW_MEDIA: "new-media";
    readonly MIXED_MEDIA: "mixed-media";
    readonly CONCEPTUAL: "conceptual";
    readonly STREET_ART: "street-art";
    readonly ILLUSTRATION: "illustration";
    readonly GRAPHIC_DESIGN: "graphic-design";
    readonly INTERDISCIPLINARY: "interdisciplinary";
};
export declare const COMMON_TAGS: {
    readonly SUSTAINABILITY: "sustainability";
    readonly SOCIAL_JUSTICE: "social-justice";
    readonly COMMUNITY_ENGAGEMENT: "community-engagement";
    readonly TECHNOLOGY: "technology";
    readonly INNOVATION: "innovation";
    readonly CULTURAL_HERITAGE: "cultural-heritage";
    readonly DIVERSITY: "diversity";
    readonly INCLUSION: "inclusion";
    readonly ACCESSIBILITY: "accessibility";
    readonly WOMEN_ONLY: "women-only";
    readonly LGBTQ_FRIENDLY: "lgbtq-friendly";
    readonly MINORITIES: "minorities";
    readonly INDIGENOUS: "indigenous";
    readonly DISABILITY_INCLUSIVE: "disability-inclusive";
    readonly MATERIALS_PROVIDED: "materials-provided";
    readonly ACCOMMODATION_PROVIDED: "accommodation-provided";
    readonly TRAVEL_COVERED: "travel-covered";
    readonly MENTORSHIP_INCLUDED: "mentorship-included";
    readonly NETWORKING_OPPORTUNITIES: "networking-opportunities";
    readonly PUBLIC_EXHIBITION: "public-exhibition";
    readonly PUBLICATION_OPPORTUNITY: "publication-opportunity";
};
export declare const DISCOVERY_SOURCES: {
    readonly MANUAL_INPUT: "manual-input";
    readonly WEB_SCRAPING: "web-scraping";
    readonly API_INTEGRATION: "api-integration";
    readonly RSS_FEED: "rss-feed";
    readonly EMAIL_PARSING: "email-parsing";
    readonly SOCIAL_MEDIA: "social-media";
    readonly PARTNER_ORGANIZATION: "partner-organization";
    readonly USER_SUBMISSION: "user-submission";
    readonly AI_DISCOVERY: "ai-discovery";
};
export declare const VALIDATION_STATUSES: {
    readonly UNVALIDATED: "unvalidated";
    readonly VALIDATING: "validating";
    readonly VALIDATED: "validated";
    readonly INVALID: "invalid";
    readonly REQUIRES_REVIEW: "requires-review";
};
//# sourceMappingURL=opportunity.constants.d.ts.map