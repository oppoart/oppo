// Define OpportunityData interface locally to avoid import issues
export interface OpportunityData {
  id?: string;
  title: string;
  description: string;
  url: string;
  organization?: string;
  deadline?: Date;
  amount?: string;
  location?: string;
  requirements?: string[];
  category?: string;
  tags?: string[];
  contactEmail?: string;
}
import { RelevanceAnalysisResult } from '../analysis/RelevanceAnalysisService';

export interface DuplicateGroup {
  id: string;
  opportunities: OpportunityData[];
  analysisResults?: RelevanceAnalysisResult[];
  primaryOpportunity: OpportunityData;
  duplicateCount: number;
  confidence: number;
  reason: string;
  mergedAt: Date;
}

export interface DeduplicationOptions {
  titleSimilarityThreshold: number;
  descriptionSimilarityThreshold: number;
  organizationMatchRequired: boolean;
  deadlineToleranceDays: number;
  urlDomainMatching: boolean;
}

export interface DeduplicationResult {
  originalCount: number;
  uniqueCount: number;
  duplicateGroups: DuplicateGroup[];
  removedDuplicates: OpportunityData[];
  uniqueOpportunities: OpportunityData[];
  processingTime: number;
  duplicateDetectionRate: number;
}

class DeduplicationService {
  private readonly defaultOptions: DeduplicationOptions = {
    titleSimilarityThreshold: 0.85,
    descriptionSimilarityThreshold: 0.75,
    organizationMatchRequired: false,
    deadlineToleranceDays: 2,
    urlDomainMatching: true
  };

  /**
   * Detect and group duplicate opportunities
   */
  async detectDuplicates(
    opportunities: OpportunityData[],
    analysisResults?: RelevanceAnalysisResult[],
    options: Partial<DeduplicationOptions> = {}
  ): Promise<DeduplicationResult> {
    const startTime = Date.now();
    const config = { ...this.defaultOptions, ...options };
    
    console.log(`🔍 Starting duplicate detection for ${opportunities.length} opportunities`);

    const duplicateGroups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();
    const uniqueOpportunities: OpportunityData[] = [];
    const removedDuplicates: OpportunityData[] = [];

    for (let i = 0; i < opportunities.length; i++) {
      const currentOpp = opportunities[i];
      
      // Skip if already processed as part of another group
      if (processedIds.has(currentOpp.url)) continue;

      const duplicates: OpportunityData[] = [];
      const duplicateAnalysis: RelevanceAnalysisResult[] = [];

      // Find all duplicates for this opportunity
      for (let j = i + 1; j < opportunities.length; j++) {
        const compareOpp = opportunities[j];
        
        if (processedIds.has(compareOpp.url)) continue;

        const duplicateCheck = this.isDuplicate(currentOpp, compareOpp, config);
        
        if (duplicateCheck.isDuplicate) {
          duplicates.push(compareOpp);
          processedIds.add(compareOpp.url);
          
          // Add corresponding analysis if available
          const analysis = analysisResults?.find(r => r.opportunityId === compareOpp.id);
          if (analysis) duplicateAnalysis.push(analysis);
          
          console.log(`🎯 Duplicate detected: "${currentOpp.title}" ↔ "${compareOpp.title}" (${Math.round(duplicateCheck.confidence * 100)}%)`);
        }
      }

      // Mark current opportunity as processed
      processedIds.add(currentOpp.url);

      if (duplicates.length > 0) {
        // Create duplicate group
        const allOpportunities = [currentOpp, ...duplicates];
        const primaryOpp = this.selectPrimaryOpportunity(allOpportunities, analysisResults);
        
        const group: DuplicateGroup = {
          id: `dup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          opportunities: allOpportunities,
          analysisResults: duplicateAnalysis,
          primaryOpportunity: primaryOpp,
          duplicateCount: duplicates.length,
          confidence: this.calculateGroupConfidence(allOpportunities, config),
          reason: this.generateDuplicationReason(allOpportunities, config),
          mergedAt: new Date()
        };

        duplicateGroups.push(group);
        uniqueOpportunities.push(primaryOpp);
        
        // Track removed duplicates (non-primary)
        const nonPrimary = allOpportunities.filter(opp => opp.url !== primaryOpp.url);
        removedDuplicates.push(...nonPrimary);
      } else {
        // No duplicates found, add to unique list
        uniqueOpportunities.push(currentOpp);
      }
    }

    const processingTime = Date.now() - startTime;
    const duplicateDetectionRate = (removedDuplicates.length / opportunities.length) * 100;

    console.log(`✅ Deduplication complete: ${opportunities.length} → ${uniqueOpportunities.length} unique (${Math.round(duplicateDetectionRate)}% duplicates removed)`);

    return {
      originalCount: opportunities.length,
      uniqueCount: uniqueOpportunities.length,
      duplicateGroups,
      removedDuplicates,
      uniqueOpportunities,
      processingTime,
      duplicateDetectionRate
    };
  }

  /**
   * Check if two opportunities are duplicates
   */
  private isDuplicate(
    opp1: OpportunityData, 
    opp2: OpportunityData, 
    config: DeduplicationOptions
  ): { isDuplicate: boolean; confidence: number; reasons: string[] } {
    const reasons: string[] = [];
    const scores: number[] = [];

    // 1. Title similarity (most important)
    const titleSim = this.calculateStringSimilarity(opp1.title, opp2.title);
    if (titleSim >= config.titleSimilarityThreshold) {
      reasons.push(`Title similarity: ${Math.round(titleSim * 100)}%`);
      scores.push(titleSim * 0.4); // 40% weight
    }

    // 2. Description similarity
    if (opp1.description && opp2.description) {
      const descSim = this.calculateStringSimilarity(opp1.description, opp2.description);
      if (descSim >= config.descriptionSimilarityThreshold) {
        reasons.push(`Description similarity: ${Math.round(descSim * 100)}%`);
        scores.push(descSim * 0.3); // 30% weight
      }
    }

    // 3. Organization match
    if (opp1.organization && opp2.organization) {
      const orgSim = this.calculateStringSimilarity(opp1.organization, opp2.organization);
      if (orgSim >= 0.9 || this.normalizeString(opp1.organization) === this.normalizeString(opp2.organization)) {
        reasons.push(`Organization match: ${opp1.organization}`);
        scores.push(0.2); // 20% weight
      } else if (config.organizationMatchRequired && orgSim < 0.8) {
        // Different organizations - likely not duplicates
        return { isDuplicate: false, confidence: 0, reasons: ['Different organizations'] };
      }
    }

    // 4. Deadline proximity
    if (opp1.deadline && opp2.deadline) {
      const deadline1 = new Date(opp1.deadline);
      const deadline2 = new Date(opp2.deadline);
      const daysDiff = Math.abs(deadline1.getTime() - deadline2.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= config.deadlineToleranceDays) {
        reasons.push(`Similar deadline: ${daysDiff.toFixed(1)} days apart`);
        scores.push(0.1); // 10% weight
      } else if (daysDiff > 7) {
        // Very different deadlines - less likely to be duplicates
        scores.push(-0.1); // Negative weight
      }
    }

    // 5. URL domain matching
    if (config.urlDomainMatching) {
      const domain1 = this.extractDomain(opp1.url);
      const domain2 = this.extractDomain(opp2.url);
      
      if (domain1 === domain2) {
        reasons.push(`Same domain: ${domain1}`);
        // Same domain but different URLs could be different opportunities
        // Only add small positive weight
        scores.push(0.05);
      }
    }

    // 6. Amount similarity (if present)
    if (opp1.amount && opp2.amount) {
      const amount1 = this.extractNumericAmount(opp1.amount);
      const amount2 = this.extractNumericAmount(opp2.amount);
      
      if (amount1 && amount2 && Math.abs(amount1 - amount2) / Math.max(amount1, amount2) < 0.1) {
        reasons.push(`Similar amount: ${opp1.amount} ≈ ${opp2.amount}`);
        scores.push(0.1);
      }
    }

    // Calculate final confidence score
    const confidence = scores.reduce((sum, score) => sum + score, 0);
    const isDuplicate = confidence >= 0.8 && reasons.length >= 2;

    return { isDuplicate, confidence: Math.min(confidence, 1), reasons };
  }

  /**
   * Select the primary (best) opportunity from a group of duplicates
   */
  private selectPrimaryOpportunity(
    opportunities: OpportunityData[],
    analysisResults?: RelevanceAnalysisResult[]
  ): OpportunityData {
    // Priority 1: Highest relevance score (if analysis available)
    if (analysisResults?.length) {
      const scored = opportunities
        .map(opp => ({
          opp,
          analysis: analysisResults.find(r => r.opportunityId === opp.id)
        }))
        .filter(item => item.analysis)
        .sort((a, b) => (b.analysis!.relevanceScore.overallScore || 0) - (a.analysis!.relevanceScore.overallScore || 0));
      
      if (scored.length > 0) return scored[0].opp;
    }

    // Priority 2: Most detailed information
    const scored = opportunities.map(opp => ({
      opp,
      score: this.calculateInformationScore(opp)
    })).sort((a, b) => b.score - a.score);

    return scored[0].opp;
  }

  /**
   * Calculate how much information an opportunity contains
   */
  private calculateInformationScore(opp: OpportunityData): number {
    let score = 0;
    
    score += opp.title?.length || 0;
    score += (opp.description?.length || 0) * 0.5;
    score += opp.organization ? 50 : 0;
    score += opp.deadline ? 30 : 0;
    score += opp.amount ? 25 : 0;
    score += opp.location ? 20 : 0;
    score += (opp.requirements?.length || 0) * 10;
    score += opp.contactEmail ? 15 : 0;
    score += opp.applicationUrl ? 15 : 0;
    
    return score;
  }

  /**
   * Calculate confidence score for entire duplicate group
   */
  private calculateGroupConfidence(opportunities: OpportunityData[], config: DeduplicationOptions): number {
    if (opportunities.length < 2) return 0;

    let totalConfidence = 0;
    let comparisons = 0;

    // Calculate pairwise confidence and average
    for (let i = 0; i < opportunities.length; i++) {
      for (let j = i + 1; j < opportunities.length; j++) {
        const check = this.isDuplicate(opportunities[i], opportunities[j], config);
        totalConfidence += check.confidence;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalConfidence / comparisons : 0;
  }

  /**
   * Generate human-readable reason for duplication
   */
  private generateDuplicationReason(opportunities: OpportunityData[], config: DeduplicationOptions): string {
    const titles = opportunities.map(o => o.title).slice(0, 2);
    const orgs = [...new Set(opportunities.map(o => o.organization).filter(Boolean))];
    
    let reason = `Similar titles: "${titles[0]}" and "${titles[1]}"`;
    
    if (orgs.length === 1) {
      reason += ` from ${orgs[0]}`;
    } else if (orgs.length > 1) {
      reason += ` from multiple organizations`;
    }

    return reason;
  }

  /**
   * Calculate string similarity using Jaro-Winkler distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = this.normalizeString(str1);
    const s2 = this.normalizeString(str2);
    
    if (s1 === s2) return 1;
    
    // Simple Levenshtein distance approximation
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  /**
   * Extract numeric amount from string
   */
  private extractNumericAmount(amount: string): number | null {
    const match = amount.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''));
    }
    return null;
  }
}

export const deduplicationService = new DeduplicationService();