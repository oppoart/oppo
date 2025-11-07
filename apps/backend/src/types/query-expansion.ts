import { z } from 'zod';

/**
 * Expanded query with all placeholders replaced
 */
export interface ExpandedQuery {
  id: string;
  templateId: string;
  template: string; // Original template with placeholders
  expanded: string; // Expanded query with values
  groupId: string;
  groupName: string;
  placeholders: Record<string, string | number>; // Placeholder values used
  createdAt: Date;
}

/**
 * Statistics about query expansion
 */
export interface ExpansionStats {
  totalTemplates: number;
  totalCombinations: number;
  totalQueries: number;
  queriesByGroup: Record<string, number>;
  parametersUsed: string[];
  emptyParameters: string[];
  coverageScore: number; // 0-100, how many parameters are filled
}

/**
 * Query expansion request
 */
export const expandQueriesRequestSchema = z.object({
  groupId: z.string().optional(), // Filter by specific group
  limit: z.number().min(1).max(500).default(100),
  includeIncomplete: z.boolean().default(false), // Include queries with missing placeholders
});

export type ExpandQueriesRequest = z.infer<typeof expandQueriesRequestSchema>;

/**
 * Query expansion response
 */
export interface QueryExpansionResponse {
  success: boolean;
  message: string;
  data?: {
    profileId: string;
    totalQueries: number;
    queries: ExpandedQuery[];
    stats: ExpansionStats;
    templatesCoverage: {
      used: number;
      skipped: number;
      reasons: Record<string, string[]>; // Reason -> template IDs
    };
  };
}

/**
 * Profile parameter completeness
 */
export interface ParameterCompleteness {
  parameterName: string;
  filled: boolean;
  count: number;
  examples: string[];
  impact: {
    currentQueries: number;
    potentialQueries: number;
    increase: number; // Percentage increase if filled
  };
}

/**
 * Profile analysis result
 */
export interface ProfileAnalysisResult {
  profileId: string;
  completenessScore: number; // 0-100
  parameters: {
    locations: ParameterCompleteness;
    opportunityTypes: ParameterCompleteness;
    amountRanges: ParameterCompleteness;
    themes: ParameterCompleteness;
  };
  recommendations: string[];
  queryGenerationPotential: {
    current: number; // Current possible queries
    withAllParameters: number; // Max possible queries if all parameters filled
    breakdown: Record<string, number>; // By parameter type
  };
  missingFields: string[];
  weakAreas: Record<string, string>; // Field name -> issue description
}

/**
 * Template usage info
 */
export interface TemplateUsage {
  templateId: string;
  template: string;
  groupName: string;
  used: boolean;
  skippedReason?: string;
  requiredPlaceholders: string[];
  missingPlaceholders: string[];
  possibleCombinations: number;
}

/**
 * Query expansion options
 */
export interface QueryExpansionOptions {
  profileId: string;
  groupId?: string;
  limit?: number;
  includeIncomplete?: boolean;
  includeStats?: boolean;
  includeTemplateUsage?: boolean;
}

/**
 * Validation error for query expansion
 */
export class QueryExpansionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'QueryExpansionError';
  }
}
