import { aiService } from '../ai';
import { ArtistProfile } from './QueryGenerationService';

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  location?: string;
  requirements?: string[];
  type?: string;
  eligibility?: string;
  website?: string;
  source?: string;
}

export interface OpportunityAnalysis {
  opportunityId: string;
  relevanceScore: number;
  category: string;
  reasoning: string;
  matchedCriteria: string[];
  missingRequirements?: string[];
  confidence: number;
}

export interface BatchAnalysisResult {
  analyses: OpportunityAnalysis[];
  averageScore: number;
  totalAnalyzed: number;
  processingTimeMs: number;
  failedAnalyses: number;
}

export class AnalysisService {
  private analysisCache: Map<string, OpportunityAnalysis> = new Map();
  private cacheExpiryMs = 1000 * 60 * 60 * 24; // 24 hours

  async analyzeOpportunity(
    opportunity: Opportunity,
    profile: ArtistProfile
  ): Promise<OpportunityAnalysis> {
    const cacheKey = this.getCacheKey(opportunity.id, profile.id);
    const cached = this.analysisCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const analysis = await aiService.analyzeOpportunity(opportunity, profile);
      
      const result: OpportunityAnalysis = {
        opportunityId: opportunity.id,
        relevanceScore: Math.max(0, Math.min(1, analysis.relevanceScore)),
        category: analysis.category,
        reasoning: analysis.reasoning,
        matchedCriteria: this.extractMatchedCriteria(analysis.reasoning),
        confidence: this.calculateConfidence(analysis),
      };

      this.analysisCache.set(cacheKey, result);
      this.cleanupExpiredCache();

      return result;
    } catch (error) {
      console.error(`Analysis failed for opportunity ${opportunity.id}:`, error);
      
      return {
        opportunityId: opportunity.id,
        relevanceScore: 0.5,
        category: 'unknown',
        reasoning: 'Analysis failed due to technical error',
        matchedCriteria: [],
        confidence: 0.1,
      };
    }
  }

  async batchAnalyzeOpportunities(
    opportunities: Opportunity[],
    profile: ArtistProfile,
    options: {
      maxConcurrent?: number;
      skipCached?: boolean;
    } = {}
  ): Promise<BatchAnalysisResult> {
    const startTime = Date.now();
    const { maxConcurrent = 5, skipCached = false } = options;
    
    const analyses: OpportunityAnalysis[] = [];
    let failedAnalyses = 0;

    const opportunitiesToAnalyze = skipCached 
      ? opportunities.filter(opp => !this.analysisCache.has(this.getCacheKey(opp.id, profile.id)))
      : opportunities;

    const chunks = this.chunkArray(opportunitiesToAnalyze, maxConcurrent);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (opportunity) => {
        try {
          return await this.analyzeOpportunity(opportunity, profile);
        } catch (error) {
          failedAnalyses++;
          console.error(`Failed to analyze opportunity ${opportunity.id}:`, error);
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      analyses.push(...chunkResults.filter((result): result is OpportunityAnalysis => result !== null));
    }

    const averageScore = analyses.length > 0 
      ? analyses.reduce((sum, analysis) => sum + analysis.relevanceScore, 0) / analyses.length 
      : 0;

    return {
      analyses: analyses.sort((a, b) => b.relevanceScore - a.relevanceScore),
      averageScore,
      totalAnalyzed: analyses.length,
      processingTimeMs: Date.now() - startTime,
      failedAnalyses
    };
  }

  async scoreOpportunities(
    opportunities: Opportunity[],
    profile: ArtistProfile
  ): Promise<Array<{ opportunityId: string; score: number; category: string }>> {
    const result = await this.batchAnalyzeOpportunities(opportunities, profile);
    
    return result.analyses.map(analysis => ({
      opportunityId: analysis.opportunityId,
      score: analysis.relevanceScore,
      category: analysis.category
    }));
  }

  async getTopOpportunities(
    opportunities: Opportunity[],
    profile: ArtistProfile,
    limit = 10
  ): Promise<OpportunityAnalysis[]> {
    const result = await this.batchAnalyzeOpportunities(opportunities, profile);
    return result.analyses.slice(0, limit);
  }

  private extractMatchedCriteria(reasoning: string): string[] {
    const criteria: string[] = [];
    
    const patterns = [
      /matches?\s+([^.!?]+)/gi,
      /aligns?\s+with\s+([^.!?]+)/gi,
      /fits?\s+([^.!?]+)/gi,
      /relevant\s+to\s+([^.!?]+)/gi
    ];

    for (const pattern of patterns) {
      const matches = reasoning.match(pattern);
      if (matches) {
        criteria.push(...matches.map(match => match.trim()));
      }
    }

    return [...new Set(criteria)].slice(0, 5);
  }

  private calculateConfidence(analysis: any): number {
    let confidence = 0.7;
    
    if (analysis.reasoning && analysis.reasoning.length > 50) {
      confidence += 0.1;
    }
    
    if (analysis.category && analysis.category !== 'unknown') {
      confidence += 0.1;
    }
    
    if (analysis.relevanceScore > 0.8 || analysis.relevanceScore < 0.2) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  private getCacheKey(opportunityId: string, profileId: string): string {
    return `${opportunityId}:${profileId}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private cleanupExpiredCache(): void {
    if (this.analysisCache.size > 1000) {
      const entries = Array.from(this.analysisCache.entries());
      entries.slice(0, 500).forEach(([key]) => {
        this.analysisCache.delete(key);
      });
    }
  }

  clearCache(): void {
    this.analysisCache.clear();
  }

  getCacheStats(): { size: number; maxAge: number } {
    return {
      size: this.analysisCache.size,
      maxAge: this.cacheExpiryMs
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testOpportunity: Opportunity = {
        id: 'health-check',
        title: 'Test Grant',
        description: 'A test grant for emerging artists working in contemporary media',
        type: 'grant'
      };

      const testProfile: ArtistProfile = {
        id: 'health-check',
        name: 'Test Artist',
        mediums: ['digital art'],
        skills: ['photography'],
        interests: ['contemporary art'],
        experience: 'emerging'
      };

      const analysis = await this.analyzeOpportunity(testOpportunity, testProfile);
      return analysis.relevanceScore >= 0 && analysis.relevanceScore <= 1;
    } catch {
      return false;
    }
  }
}

export const analysisService = new AnalysisService();