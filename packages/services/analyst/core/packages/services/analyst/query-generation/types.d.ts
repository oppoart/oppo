export declare const sourceTypes: readonly ["websearch", "social", "bookmark", "newsletter", "manual"];
export type SourceType = typeof sourceTypes[number];
export interface SearchQueryContext {
    artistMediums: string[];
    interests: string[];
    location?: string;
}
export interface GeneratedSearchQuery {
    query: string;
    provider: SourceType;
    priority: number;
    context: SearchQueryContext;
    expectedResults: number;
}
export declare class AIServiceError extends Error {
    service: string;
    operation: string;
    context?: any;
    constructor(message: string, service: string, operation: string, context?: any);
}
