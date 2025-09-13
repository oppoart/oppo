// Local types for the query generation service
export const sourceTypes = ['websearch', 'social', 'bookmark', 'newsletter', 'manual'] as const;
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

export class AIServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public operation: string,
    public context?: any
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}
