"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION_STATUSES = exports.DISCOVERY_SOURCES = exports.COMMON_TAGS = exports.ART_DISCIPLINES = exports.TARGET_DEMOGRAPHICS = exports.DURATION_TYPES = exports.GEOGRAPHIC_SCOPE = exports.FUNDING_RANGES = exports.DEADLINE_URGENCY = exports.RELEVANCE_THRESHOLDS = exports.APPLICATION_STATUSES = exports.OPPORTUNITY_CATEGORIES = exports.OPPORTUNITY_TYPES = void 0;
exports.OPPORTUNITY_TYPES = {
    GRANT: 'grant',
    RESIDENCY: 'residency',
    EXHIBITION: 'exhibition',
    COMPETITION: 'competition',
    FELLOWSHIP: 'fellowship',
    WORKSHOP: 'workshop',
    CONFERENCE: 'conference',
    COMMISSION: 'commission',
    JOB: 'job',
    COLLABORATION: 'collaboration',
    CALL_FOR_ARTISTS: 'call-for-artists',
    MENTORSHIP: 'mentorship',
};
exports.OPPORTUNITY_CATEGORIES = {
    FUNDING: 'funding',
    PROFESSIONAL_DEVELOPMENT: 'professional-development',
    EXHIBITION_OPPORTUNITIES: 'exhibition-opportunities',
    CAREER_OPPORTUNITIES: 'career-opportunities',
    EDUCATIONAL: 'educational',
    NETWORKING: 'networking',
    COLLABORATIVE: 'collaborative',
    INTERNATIONAL: 'international',
};
exports.APPLICATION_STATUSES = {
    NOT_STARTED: 'not-started',
    IN_PROGRESS: 'in-progress',
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under-review',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    WAITLISTED: 'waitlisted',
    WITHDRAWN: 'withdrawn',
};
exports.RELEVANCE_THRESHOLDS = {
    VERY_LOW: 0.2,
    LOW: 0.4,
    MEDIUM: 0.6,
    HIGH: 0.8,
    VERY_HIGH: 0.9,
};
exports.DEADLINE_URGENCY = {
    OVERDUE: -1,
    URGENT: 7,
    SOON: 14,
    MODERATE: 30,
    DISTANT: 90,
};
exports.FUNDING_RANGES = {
    MICRO: { min: 0, max: 1000 },
    SMALL: { min: 1000, max: 5000 },
    MEDIUM: { min: 5000, max: 25000 },
    LARGE: { min: 25000, max: 100000 },
    MAJOR: { min: 100000, max: Infinity },
};
exports.GEOGRAPHIC_SCOPE = {
    LOCAL: 'local',
    REGIONAL: 'regional',
    NATIONAL: 'national',
    INTERNATIONAL: 'international',
    GLOBAL: 'global',
    VIRTUAL: 'virtual',
};
exports.DURATION_TYPES = {
    ONE_TIME: 'one-time',
    SHORT_TERM: 'short-term',
    MEDIUM_TERM: 'medium-term',
    LONG_TERM: 'long-term',
    ONGOING: 'ongoing',
    RECURRING: 'recurring',
};
exports.TARGET_DEMOGRAPHICS = {
    EMERGING: 'emerging',
    MID_CAREER: 'mid-career',
    ESTABLISHED: 'established',
    STUDENT: 'student',
    PROFESSIONAL: 'professional',
    SENIOR: 'senior',
    ANY_LEVEL: 'any-level',
};
exports.ART_DISCIPLINES = {
    VISUAL_ARTS: 'visual-arts',
    DIGITAL_ARTS: 'digital-arts',
    PERFORMANCE: 'performance',
    SCULPTURE: 'sculpture',
    PAINTING: 'painting',
    PHOTOGRAPHY: 'photography',
    PRINTMAKING: 'printmaking',
    CERAMICS: 'ceramics',
    TEXTILE_ARTS: 'textile-arts',
    INSTALLATION: 'installation',
    VIDEO_ART: 'video-art',
    SOUND_ART: 'sound-art',
    NEW_MEDIA: 'new-media',
    MIXED_MEDIA: 'mixed-media',
    CONCEPTUAL: 'conceptual',
    STREET_ART: 'street-art',
    ILLUSTRATION: 'illustration',
    GRAPHIC_DESIGN: 'graphic-design',
    INTERDISCIPLINARY: 'interdisciplinary',
};
exports.COMMON_TAGS = {
    SUSTAINABILITY: 'sustainability',
    SOCIAL_JUSTICE: 'social-justice',
    COMMUNITY_ENGAGEMENT: 'community-engagement',
    TECHNOLOGY: 'technology',
    INNOVATION: 'innovation',
    CULTURAL_HERITAGE: 'cultural-heritage',
    DIVERSITY: 'diversity',
    INCLUSION: 'inclusion',
    ACCESSIBILITY: 'accessibility',
    WOMEN_ONLY: 'women-only',
    LGBTQ_FRIENDLY: 'lgbtq-friendly',
    MINORITIES: 'minorities',
    INDIGENOUS: 'indigenous',
    DISABILITY_INCLUSIVE: 'disability-inclusive',
    MATERIALS_PROVIDED: 'materials-provided',
    ACCOMMODATION_PROVIDED: 'accommodation-provided',
    TRAVEL_COVERED: 'travel-covered',
    MENTORSHIP_INCLUDED: 'mentorship-included',
    NETWORKING_OPPORTUNITIES: 'networking-opportunities',
    PUBLIC_EXHIBITION: 'public-exhibition',
    PUBLICATION_OPPORTUNITY: 'publication-opportunity',
};
exports.DISCOVERY_SOURCES = {
    MANUAL_INPUT: 'manual-input',
    WEB_SCRAPING: 'web-scraping',
    API_INTEGRATION: 'api-integration',
    RSS_FEED: 'rss-feed',
    EMAIL_PARSING: 'email-parsing',
    SOCIAL_MEDIA: 'social-media',
    PARTNER_ORGANIZATION: 'partner-organization',
    USER_SUBMISSION: 'user-submission',
    AI_DISCOVERY: 'ai-discovery',
};
exports.VALIDATION_STATUSES = {
    UNVALIDATED: 'unvalidated',
    VALIDATING: 'validating',
    VALIDATED: 'validated',
    INVALID: 'invalid',
    REQUIRES_REVIEW: 'requires-review',
};
//# sourceMappingURL=opportunity.constants.js.map