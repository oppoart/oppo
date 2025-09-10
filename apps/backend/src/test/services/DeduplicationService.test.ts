import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { DeduplicationService } from '../../services/DeduplicationService';
import { OpportunityData } from '../../types/discovery';

const mockPrisma = {
  opportunity: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  opportunitySource: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  opportunitySourceLink: {
    upsert: jest.fn(),
  },
  opportunityDuplicate: {
    upsert: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  }
} as unknown as PrismaClient;

describe('DeduplicationService', () => {
  let deduplicationService: DeduplicationService;

  beforeEach(() => {
    deduplicationService = new DeduplicationService(mockPrisma);
    jest.clearAllMocks();
  });

  // =====================================
  // Hash Generation Tests
  // =====================================

  describe('generateSourceHash', () => {
    test('should generate consistent hash for identical opportunities', () => {
      const opportunity1: OpportunityData = {
        title: 'Art Grant 2024',
        organization: 'Test Foundation',
        deadline: new Date('2024-12-31'),
        description: 'A test grant',
        url: 'https://example.org',
        sourceType: 'websearch',
        tags: []
      };

      const opportunity2: OpportunityData = {
        title: 'ART GRANT 2024!!!', // Different formatting
        organization: 'Test Foundation',
        deadline: new Date('2024-12-31T00:00:00Z'), // Same date, different format
        description: 'A different description',
        url: 'https://example.org',
        sourceType: 'websearch',
        tags: []
      };

      const hash1 = deduplicationService.generateSourceHash(opportunity1);
      const hash2 = deduplicationService.generateSourceHash(opportunity2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash format
    });

    test('should generate different hashes for different opportunities', () => {
      const opportunity1: OpportunityData = {
        title: 'Art Grant 2024',
        organization: 'Foundation A',
        deadline: new Date('2024-12-31'),
        description: 'A test grant',
        url: 'https://example1.org',
        sourceType: 'websearch',
        tags: []
      };

      const opportunity2: OpportunityData = {
        title: 'Music Grant 2024',
        organization: 'Foundation B',
        deadline: new Date('2024-11-30'),
        description: 'A music grant',
        url: 'https://example2.org',
        sourceType: 'websearch',
        tags: []
      };

      const hash1 = deduplicationService.generateSourceHash(opportunity1);
      const hash2 = deduplicationService.generateSourceHash(opportunity2);

      expect(hash1).not.toBe(hash2);
    });
  });

  // =====================================
  // Duplicate Detection Tests
  // =====================================

  describe('checkDuplicate', () => {
    const testOpportunity: OpportunityData = {
      title: 'Test Grant 2024',
      organization: 'Test Foundation',
      deadline: new Date('2024-12-31'),
      description: 'A comprehensive test grant for artists',
      url: 'https://testfoundation.org/grant',
      sourceType: 'websearch',
      tags: ['grant', 'art']
    };

    test('should detect exact duplicate by URL', async () => {
      const existingOpportunity = {
        id: 'existing-123',
        url: testOpportunity.url,
        title: testOpportunity.title,
        organization: testOpportunity.organization,
        deadline: testOpportunity.deadline
      };

      mockPrisma.opportunity.findFirst = jest.fn().mockResolvedValue(existingOpportunity);
      mockPrisma.opportunitySource.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.opportunitySource.create = jest.fn().mockResolvedValue({ id: 'source-1' });
      mockPrisma.opportunitySourceLink.upsert = jest.fn().mockResolvedValue({});

      const result = await deduplicationService.checkDuplicate(testOpportunity);

      expect(result.isDuplicate).toBe(true);
      expect(result.existingId).toBe('existing-123');
      expect(result.action).toBe('source_added');
      expect(result.similarityScore).toBe(1.0);
    });

    test('should detect no duplicate for unique opportunity', async () => {
      mockPrisma.opportunity.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue([]);

      const result = await deduplicationService.checkDuplicate(testOpportunity);

      expect(result.isDuplicate).toBe(false);
      expect(result.action).toBe('new_opportunity');
      expect(result.hash).toBeDefined();
    });

    test('should detect similarity-based duplicates', async () => {
      const similarOpportunity = {
        id: 'similar-123',
        title: 'Test Grant for Artists 2024', // Similar title
        organization: 'Test Foundation', // Same organization
        deadline: new Date('2024-12-31'), // Same deadline
        description: 'A comprehensive grant program for emerging artists',
        discoveredAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within 30 days
      };

      mockPrisma.opportunity.findFirst = jest.fn()
        .mockResolvedValueOnce(null) // No exact match
      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue([similarOpportunity]);
      mockPrisma.opportunityDuplicate.upsert = jest.fn().mockResolvedValue({});
      mockPrisma.opportunity.create = jest.fn().mockResolvedValue({ id: 'dup-id' });

      const result = await deduplicationService.checkDuplicate(testOpportunity);

      expect(result.isDuplicate).toBe(true);
      expect(result.existingId).toBe('similar-123');
      expect(result.similarityScore).toBeGreaterThan(0.85);
    });
  });

  // =====================================
  // Similarity Calculation Tests
  // =====================================

  describe('similarity calculation', () => {
    test('should calculate high similarity for very similar opportunities', () => {
      const opp1: OpportunityData = {
        title: 'Visual Arts Grant 2024',
        organization: 'National Arts Council',
        deadline: new Date('2024-12-31'),
        description: 'A comprehensive grant for visual artists working in contemporary mediums',
        url: 'https://example1.org',
        sourceType: 'websearch',
        tags: []
      };

      const opp2 = {
        id: 'test-id',
        title: 'Visual Arts Grant Program 2024',
        organization: 'National Arts Council',
        deadline: new Date('2024-12-31'),
        description: 'A comprehensive grant program for visual artists in contemporary art',
        url: 'https://example2.org'
      };

      // Access private method through any cast for testing
      const factors = (deduplicationService as any).calculateSimilarityFactors(opp1, opp2);
      const overallScore = (deduplicationService as any).calculateOverallSimilarity(factors);

      expect(factors.titleSimilarity).toBeGreaterThan(0.8);
      expect(factors.organizationSimilarity).toBe(1.0);
      expect(factors.deadlineSimilarity).toBe(1.0);
      expect(overallScore).toBeGreaterThan(0.85);
    });

    test('should calculate low similarity for very different opportunities', () => {
      const opp1: OpportunityData = {
        title: 'Visual Arts Grant 2024',
        organization: 'Arts Council A',
        deadline: new Date('2024-12-31'),
        description: 'Grant for visual artists',
        url: 'https://example1.org',
        sourceType: 'websearch',
        tags: []
      };

      const opp2 = {
        id: 'test-id',
        title: 'Music Composition Fellowship',
        organization: 'Music Foundation B',
        deadline: new Date('2025-06-30'),
        description: 'Fellowship for music composers',
        url: 'https://example2.org'
      };

      const factors = (deduplicationService as any).calculateSimilarityFactors(opp1, opp2);
      const overallScore = (deduplicationService as any).calculateOverallSimilarity(factors);

      expect(factors.titleSimilarity).toBeLessThan(0.3);
      expect(factors.organizationSimilarity).toBeLessThan(0.3);
      expect(overallScore).toBeLessThan(0.5);
    });
  });

  // =====================================
  // Batch Deduplication Tests
  // =====================================

  describe('runDeduplication', () => {
    test('should process batch deduplication', async () => {
      const mockOpportunities = [
        {
          id: '1',
          title: 'Grant A',
          organization: 'Foundation 1',
          deadline: new Date('2024-12-31'),
          description: 'First grant',
          discoveredAt: new Date(),
          tags: []
        },
        {
          id: '2',
          title: 'Grant B',
          organization: 'Foundation 2',
          deadline: new Date('2024-11-30'),
          description: 'Second grant',
          discoveredAt: new Date(),
          tags: []
        }
      ];

      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue(mockOpportunities);
      mockPrisma.opportunity.update = jest.fn().mockResolvedValue({});
      mockPrisma.opportunityDuplicate.create = jest.fn().mockResolvedValue({});

      const result = await deduplicationService.runDeduplication(100);

      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.duplicatesFound).toBeGreaterThanOrEqual(0);
      expect(result.duplicatesRemoved).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.duplicatePairs)).toBe(true);
    });
  });

  // =====================================
  // Statistics Tests
  // =====================================

  describe('getDeduplicationStats', () => {
    test('should return deduplication statistics', async () => {
      mockPrisma.opportunityDuplicate.count = jest.fn().mockResolvedValue(25);
      mockPrisma.opportunity.count = jest.fn().mockResolvedValue(100);

      const stats = await deduplicationService.getDeduplicationStats();

      expect(stats.totalOpportunities).toBe(100);
      expect(stats.duplicatesIdentified).toBe(25);
      expect(stats.deduplicationRate).toBe(0.25);
    });

    test('should handle zero opportunities case', async () => {
      mockPrisma.opportunityDuplicate.count = jest.fn().mockResolvedValue(0);
      mockPrisma.opportunity.count = jest.fn().mockResolvedValue(0);

      const stats = await deduplicationService.getDeduplicationStats();

      expect(stats.totalOpportunities).toBe(0);
      expect(stats.duplicatesIdentified).toBe(0);
      expect(stats.deduplicationRate).toBe(0);
    });
  });

  // =====================================
  // Edge Cases Tests
  // =====================================

  describe('edge cases', () => {
    test('should handle opportunities with missing fields', async () => {
      const incompleteOpportunity: OpportunityData = {
        title: 'Incomplete Grant',
        description: 'A grant with missing organization and deadline',
        url: 'https://example.org',
        sourceType: 'websearch',
        tags: []
        // Missing organization and deadline
      };

      mockPrisma.opportunity.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue([]);

      const result = await deduplicationService.checkDuplicate(incompleteOpportunity);

      expect(result.isDuplicate).toBe(false);
      expect(result.hash).toBeDefined();
    });

    test('should handle very old opportunities in similarity check', async () => {
      const oldOpportunity = {
        id: 'old-123',
        title: 'Old Grant',
        organization: 'Old Foundation',
        deadline: new Date('2024-12-31'),
        description: 'An old grant',
        discoveredAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
      };

      mockPrisma.opportunity.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue([oldOpportunity]);

      const testOpportunity: OpportunityData = {
        title: 'Old Grant',
        organization: 'Old Foundation',
        deadline: new Date('2024-12-31'),
        description: 'An old grant',
        url: 'https://example.org',
        sourceType: 'websearch',
        tags: []
      };

      const result = await deduplicationService.checkDuplicate(testOpportunity);

      // Should not find similarity with very old opportunities (outside 30-day window)
      expect(result.isDuplicate).toBe(false);
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.opportunity.findFirst = jest.fn().mockRejectedValue(new Error('Database error'));

      const testOpportunity: OpportunityData = {
        title: 'Test Grant',
        description: 'A test grant for error handling',
        url: 'https://example.org',
        sourceType: 'websearch',
        tags: []
      };

      await expect(deduplicationService.checkDuplicate(testOpportunity))
        .rejects.toThrow('Database error');
    });
  });
});