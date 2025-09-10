import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import * as stringSimilarity from 'string-similarity';
import { 
  OpportunityData, 
  DuplicationCandidate, 
  DeduplicationResult 
} from '../types/discovery';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingId?: string;
  hash?: string;
  action?: 'source_added' | 'new_opportunity';
  similarityScore?: number;
}

export interface SimilarityFactors {
  titleSimilarity: number;
  organizationSimilarity: number;
  deadlineSimilarity: number;
  descriptionSimilarity: number;
  urlSimilarity: number;
}

export class DeduplicationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a canonical hash for deduplication
   */
  generateSourceHash(opportunity: OpportunityData): string {
    // Normalize key fields for consistent hashing
    const normalizedTitle = this.normalizeText(opportunity.title);
    const normalizedOrg = this.normalizeText(opportunity.organization || '');
    const normalizedDate = opportunity.deadline ? 
      this.normalizeDate(opportunity.deadline) : '';
    
    // Create canonical representation
    const canonical = `${normalizedTitle}|${normalizedOrg}|${normalizedDate}`;
    
    // Generate SHA-256 hash
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Check if an opportunity is a duplicate
   */
  async checkDuplicate(opportunity: OpportunityData): Promise<DuplicateCheckResult> {
    const startTime = Date.now();
    
    // First try exact hash matching for fast deduplication
    const hash = this.generateSourceHash(opportunity);
    const exactMatch = await this.findExactMatch(hash, opportunity);
    
    if (exactMatch.isDuplicate) {
      return exactMatch;
    }

    // If no exact match, try similarity matching
    const similarityMatch = await this.findSimilarityMatch(opportunity);
    
    if (similarityMatch.isDuplicate) {
      // Record the duplicate relationship
      if (similarityMatch.existingId) {
        await this.recordDuplicate(
          similarityMatch.existingId, 
          opportunity, 
          similarityMatch.similarityScore || 0
        );
      }
      return similarityMatch;
    }

    return {
      isDuplicate: false,
      hash: hash,
      action: 'new_opportunity'
    };
  }

  /**
   * Find exact matches using hash comparison
   */
  private async findExactMatch(
    hash: string, 
    opportunity: OpportunityData
  ): Promise<DuplicateCheckResult> {
    // For now, we'll use URL as a proxy for source hash
    // In production, we'd add a sourceHash field to the schema
    const existing = await this.prisma.opportunity.findFirst({
      where: {
        OR: [
          { url: opportunity.url },
          {
            AND: [
              { title: { contains: this.normalizeText(opportunity.title) } },
              { organization: opportunity.organization },
              { deadline: opportunity.deadline }
            ]
          }
        ]
      }
    });

    if (existing) {
      // Add new source to existing opportunity if it's from different source
      await this.addSourceLink(existing.id, opportunity);
      
      return {
        isDuplicate: true,
        existingId: existing.id,
        action: 'source_added',
        similarityScore: 1.0
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Find similar opportunities using text similarity
   */
  private async findSimilarityMatch(
    opportunity: OpportunityData
  ): Promise<DuplicateCheckResult> {
    // Get recent opportunities for comparison (last 30 days)
    const recentOpportunities = await this.prisma.opportunity.findMany({
      where: {
        discoveredAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      take: 100 // Limit for performance
    });

    let bestMatch: {
      opportunity: any;
      similarityScore: number;
      factors: SimilarityFactors;
    } | null = null;

    for (const existing of recentOpportunities) {
      const factors = this.calculateSimilarityFactors(opportunity, existing);
      const overallScore = this.calculateOverallSimilarity(factors);

      if (overallScore > 0.85 && (!bestMatch || overallScore > bestMatch.similarityScore)) {
        bestMatch = {
          opportunity: existing,
          similarityScore: overallScore,
          factors
        };
      }
    }

    if (bestMatch && bestMatch.similarityScore > 0.85) {
      return {
        isDuplicate: true,
        existingId: bestMatch.opportunity.id,
        action: 'source_added',
        similarityScore: bestMatch.similarityScore
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Calculate similarity factors between two opportunities
   */
  private calculateSimilarityFactors(
    opp1: OpportunityData, 
    opp2: any
  ): SimilarityFactors {
    return {
      titleSimilarity: stringSimilarity.compareTwoStrings(
        this.normalizeText(opp1.title),
        this.normalizeText(opp2.title)
      ),
      organizationSimilarity: stringSimilarity.compareTwoStrings(
        this.normalizeText(opp1.organization || ''),
        this.normalizeText(opp2.organization || '')
      ),
      deadlineSimilarity: this.calculateDateSimilarity(
        opp1.deadline,
        opp2.deadline
      ),
      descriptionSimilarity: stringSimilarity.compareTwoStrings(
        this.normalizeText(opp1.description.substring(0, 500)),
        this.normalizeText(opp2.description.substring(0, 500))
      ),
      urlSimilarity: stringSimilarity.compareTwoStrings(
        opp1.url,
        opp2.url
      )
    };
  }

  /**
   * Calculate overall similarity score from factors
   */
  private calculateOverallSimilarity(factors: SimilarityFactors): number {
    // Weighted average - title and organization are most important
    return (
      factors.titleSimilarity * 0.4 +
      factors.organizationSimilarity * 0.3 +
      factors.descriptionSimilarity * 0.2 +
      factors.deadlineSimilarity * 0.05 +
      factors.urlSimilarity * 0.05
    );
  }

  /**
   * Calculate similarity between two dates
   */
  private calculateDateSimilarity(date1?: Date, date2?: Date): number {
    if (!date1 || !date2) return 0;
    
    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    // Same day = 1.0, 1 day diff = 0.9, 7 days = 0.5, 30+ days = 0
    if (diffDays === 0) return 1.0;
    if (diffDays <= 1) return 0.9;
    if (diffDays <= 7) return 0.7;
    if (diffDays <= 30) return 0.3;
    return 0;
  }

  /**
   * Record a duplicate relationship
   */
  private async recordDuplicate(
    masterId: string, 
    duplicateOpp: OpportunityData, 
    similarityScore: number
  ): Promise<void> {
    // First create the duplicate opportunity if it doesn't exist
    let duplicateId: string;
    
    const existing = await this.prisma.opportunity.findFirst({
      where: { url: duplicateOpp.url }
    });

    if (existing) {
      duplicateId = existing.id;
    } else {
      const created = await this.prisma.opportunity.create({
        data: {
          title: duplicateOpp.title,
          organization: duplicateOpp.organization || null,
          description: duplicateOpp.description,
          url: duplicateOpp.url,
          deadline: duplicateOpp.deadline || null,
          amount: duplicateOpp.amount || null,
          location: duplicateOpp.location || null,
          tags: duplicateOpp.tags,
          sourceType: duplicateOpp.sourceType,
          sourceUrl: duplicateOpp.sourceUrl || null,
          sourceMetadata: duplicateOpp.sourceMetadata || {},
          status: 'archived' // Mark as archived since it's a duplicate
        }
      });
      duplicateId = created.id;
    }

    // Create duplicate relationship
    await this.prisma.opportunityDuplicate.upsert({
      where: {
        masterOpportunityId_duplicateOpportunityId: {
          masterOpportunityId: masterId,
          duplicateOpportunityId: duplicateId
        }
      },
      create: {
        masterOpportunityId: masterId,
        duplicateOpportunityId: duplicateId,
        similarityScore,
        mergeStrategy: 'keep_master'
      },
      update: {
        similarityScore
      }
    });
  }

  /**
   * Add a source link to an existing opportunity
   */
  private async addSourceLink(
    opportunityId: string, 
    opportunity: OpportunityData
  ): Promise<void> {
    if (!opportunity.sourceUrl) return;

    // Find or create the source
    let source = await this.prisma.opportunitySource.findFirst({
      where: {
        type: opportunity.sourceType,
        url: opportunity.sourceUrl
      }
    });

    if (!source) {
      source = await this.prisma.opportunitySource.create({
        data: {
          name: opportunity.sourceType,
          type: opportunity.sourceType,
          url: opportunity.sourceUrl || null,
          config: opportunity.sourceMetadata || {}
        }
      });
    }

    // Create source link if it doesn't exist
    await this.prisma.opportunitySourceLink.upsert({
      where: {
        opportunityId_sourceId: {
          opportunityId,
          sourceId: source.id
        }
      },
      create: {
        opportunityId,
        sourceId: source.id
      },
      update: {}
    });
  }

  /**
   * Run comprehensive deduplication on existing opportunities
   */
  async runDeduplication(batchSize: number = 100): Promise<DeduplicationResult> {
    const startTime = Date.now();
    let processedCount = 0;
    let duplicatesFound = 0;
    const duplicatePairs: DuplicationCandidate[] = [];

    while (true) {
      const opportunities = await this.prisma.opportunity.findMany({
        skip: processedCount,
        take: batchSize,
        orderBy: { discoveredAt: 'desc' }
      });

      if (opportunities.length === 0) break;

      for (const opp of opportunities) {
        // Check against other opportunities
        const candidates = await this.findDuplicateCandidates(opp);
        duplicatePairs.push(...candidates);
        duplicatesFound += candidates.length;
      }

      processedCount += opportunities.length;
    }

    // Remove actual duplicates
    const duplicatesRemoved = await this.mergeDuplicates(duplicatePairs);

    return {
      duplicatesFound,
      duplicatesRemoved,
      duplicatePairs,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Find duplicate candidates for a given opportunity
   */
  private async findDuplicateCandidates(
    opportunity: any
  ): Promise<DuplicationCandidate[]> {
    const candidates: DuplicationCandidate[] = [];
    
    // Find similar opportunities
    const similar = await this.prisma.opportunity.findMany({
      where: {
        id: { not: opportunity.id },
        title: { contains: opportunity.title.split(' ')[0] } // Basic similarity
      }
    });

    for (const candidate of similar) {
      const oppData: OpportunityData = {
        title: opportunity.title,
        description: opportunity.description,
        url: opportunity.url,
        organization: opportunity.organization,
        deadline: opportunity.deadline,
        sourceType: opportunity.sourceType as any,
        tags: opportunity.tags || [],
        status: 'new',
        processed: false,
        applied: false,
        starred: false
      };

      const factors = this.calculateSimilarityFactors(oppData, candidate);
      const similarityScore = this.calculateOverallSimilarity(factors);

      if (similarityScore > 0.85) {
        candidates.push({
          opportunityId: opportunity.id,
          duplicateId: candidate.id,
          similarityScore,
          similarityFactors: factors
        });
      }
    }

    return candidates;
  }

  /**
   * Merge duplicate opportunities
   */
  private async mergeDuplicates(
    duplicatePairs: DuplicationCandidate[]
  ): Promise<number> {
    let mergedCount = 0;

    for (const pair of duplicatePairs) {
      try {
        // Mark the duplicate as archived
        await this.prisma.opportunity.update({
          where: { id: pair.duplicateId },
          data: { status: 'archived' }
        });

        // Record the duplicate relationship
        await this.prisma.opportunityDuplicate.create({
          data: {
            masterOpportunityId: pair.opportunityId,
            duplicateOpportunityId: pair.duplicateId,
            similarityScore: pair.similarityScore,
            mergeStrategy: 'archive_duplicate'
          }
        });

        mergedCount++;
      } catch (error) {
        console.error(`Failed to merge duplicate ${pair.duplicateId}:`, error);
      }
    }

    return mergedCount;
  }

  /**
   * Normalize text for consistent comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  /**
   * Normalize date for consistent comparison
   */
  private normalizeDate(date: Date): string {
    // Extract YYYY-MM-DD only
    return date.toISOString().split('T')[0];
  }

  /**
   * Get deduplication statistics
   */
  async getDeduplicationStats() {
    const [duplicateCount, totalOpportunities] = await Promise.all([
      this.prisma.opportunityDuplicate.count(),
      this.prisma.opportunity.count()
    ]);

    return {
      totalOpportunities,
      duplicatesIdentified: duplicateCount,
      deduplicationRate: totalOpportunities > 0 ? duplicateCount / totalOpportunities : 0
    };
  }
}