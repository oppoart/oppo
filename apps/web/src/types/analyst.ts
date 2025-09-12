export interface Opportunity {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  deadline?: string;
  location?: string;
  type: 'grant' | 'residency' | 'exhibition' | 'competition' | 'fellowship' | 'other';
  relevanceScore?: number;
  matchingCriteria?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityScore {
  opportunityId: string;
  score: number;
  reasoning: string;
  matchingCriteria: string[];
}

export interface AnalysisResult {
  id: string;
  profileId: string;
  opportunities: Opportunity[];
  totalOpportunities: number;
  analysisDate: string;
  queriesUsed: string[];
  status: 'completed' | 'failed' | 'in_progress';
  error?: string;
}

export interface AnalysisStats {
  profileId: string;
  totalAnalyses: number;
  totalOpportunities: number;
  avgRelevanceScore: number;
  lastAnalysisDate?: string;
  opportunitiesByType: {
    [key in Opportunity['type']]: number;
  };
  topMatchingCriteria: {
    criteria: string;
    count: number;
  }[];
}

export interface AnalysisHistory {
  id: string;
  profileId: string;
  analysisDate: string;
  opportunitiesFound: number;
  status: 'completed' | 'failed' | 'in_progress';
  error?: string;
}

export const OPPORTUNITY_TYPES = [
  { value: 'grant', label: 'Grant' },
  { value: 'residency', label: 'Residency' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'competition', label: 'Competition' },
  { value: 'fellowship', label: 'Fellowship' },
  { value: 'other', label: 'Other' },
] as const;