import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { ArchivistService } from '../../services/ArchivistService';
import { OpportunityData } from '../../types/discovery';

// Mock Prisma
const mockPrisma = {
  opportunity: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  opportunitySource: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

describe('ArchivistService', () => {
  let archivistService: ArchivistService;

  beforeEach(() => {
    archivistService = new ArchivistService(mockPrisma, {
      autoCleanup: false, // Disable auto-cleanup for tests
      maxOpportunities: 1000,
      duplicateThreshold: 0.85
    });
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await archivistService.shutdown();
  });

  // =====================================
  // Opportunity CRUD Tests
  // =====================================

  describe('saveOpportunity', () => {
    const validOpportunityData: OpportunityData = {
      title: 'Test Art Grant 2024',
      description: 'A comprehensive description of the art grant opportunity for emerging artists.',
      url: 'https://example.org/grant',
      organization: 'Test Foundation',
      deadline: new Date('2024-12-31'),
      amount: '$5,000',
      location: 'New York, NY',
      tags: ['grant', 'visual art', 'emerging artist'],
      sourceType: 'websearch',
      sourceUrl: 'https://search.example.com',
      relevanceScore: 0.85,
      status: 'new'
    };

    test('should save a valid opportunity successfully', async () => {
      const mockCreatedOpportunity = {
        id: 'test-id-1',
        ...validOpportunityData,
        discoveredAt: new Date(),
        lastUpdated: new Date(),
        processed: false,
        applied: false,
        starred: false
      };

      mockPrisma.opportunity.create = jest.fn().mockResolvedValue(mockCreatedOpportunity);
      mockPrisma.opportunity.findFirst = jest.fn().mockResolvedValue(null); // No duplicate

      const result = await archivistService.saveOpportunity(validOpportunityData);

      expect(result.isDuplicate).toBe(false);
      expect(result.opportunity).toBeDefined();
      expect(result.opportunity?.title).toBe(validOpportunityData.title);
      expect(mockPrisma.opportunity.create).toHaveBeenCalledTimes(1);
    });

    test('should detect duplicates', async () => {
      const existingOpportunity = {
        id: 'existing-id',
        ...validOpportunityData
      };

      mockPrisma.opportunity.findFirst = jest.fn().mockResolvedValue(existingOpportunity);

      const result = await archivistService.saveOpportunity(validOpportunityData);

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateOf).toBe('existing-id');
      expect(mockPrisma.opportunity.create).not.toHaveBeenCalled();
    });

    test('should handle validation errors', async () => {
      const invalidData = {
        title: '', // Invalid: empty title
        description: 'Too short', // Invalid: too short
        url: 'invalid-url', // Invalid: not a valid URL
        sourceType: 'websearch'
      };

      await expect(archivistService.saveOpportunity(invalidData))
        .rejects.toThrow();
    });
  });

  describe('bulkSaveOpportunities', () => {
    test('should handle bulk save with mixed results', async () => {
      const opportunities = [
        {
          title: 'Valid Opportunity 1',
          description: 'A valid opportunity description that meets minimum length requirements.',
          url: 'https://example1.org/grant',
          sourceType: 'websearch',
          tags: []
        },
        {
          title: '', // Invalid
          description: 'Valid description here',
          url: 'https://example2.org/grant',
          sourceType: 'websearch',
          tags: []
        },
        {
          title: 'Valid Opportunity 2',
          description: 'Another valid opportunity description that meets minimum length requirements.',
          url: 'https://example3.org/grant',
          sourceType: 'websearch',
          tags: []
        }
      ];

      mockPrisma.opportunity.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.opportunity.create = jest.fn()
        .mockResolvedValueOnce({ id: 'id1' })
        .mockResolvedValueOnce({ id: 'id3' });

      const result = await archivistService.bulkSaveOpportunities(opportunities);

      expect(result.created).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.duplicates).toBe(0);
    });
  });

  describe('getOpportunity', () => {
    test('should retrieve opportunity by ID', async () => {
      const mockOpportunity = {
        id: 'test-id',
        title: 'Test Opportunity',
        description: 'Test description',
        url: 'https://example.org',
        sourceLinks: [],
        matches: []
      };

      mockPrisma.opportunity.findUnique = jest.fn().mockResolvedValue(mockOpportunity);

      const result = await archivistService.getOpportunity('test-id');

      expect(result).toEqual(mockOpportunity);
      expect(mockPrisma.opportunity.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: expect.any(Object)
      });
    });

    test('should return null for non-existent opportunity', async () => {
      mockPrisma.opportunity.findUnique = jest.fn().mockResolvedValue(null);

      const result = await archivistService.getOpportunity('non-existent-id');

      expect(result).toBeNull();
    });
  });

  // =====================================
  // Search and Query Tests
  // =====================================

  describe('searchOpportunities', () => {
    test('should search with filters', async () => {
      const mockOpportunities = [
        { id: '1', title: 'Art Grant 1', relevanceScore: 0.9, status: 'new' },
        { id: '2', title: 'Art Grant 2', relevanceScore: 0.8, status: 'new' }
      ];

      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue(mockOpportunities);

      const options = {
        minRelevanceScore: 0.7,
        status: 'new' as any,
        limit: 10
      };

      const result = await archivistService.searchOpportunities(options);

      expect(result).toEqual(mockOpportunities);
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            relevanceScore: { gte: 0.7 },
            status: 'new'
          }),
          take: 10
        })
      );
    });
  });

  describe('getHighRelevanceOpportunities', () => {
    test('should retrieve high relevance opportunities', async () => {
      const mockHighRelevanceOpps = [
        { id: '1', title: 'High Relevance Grant', relevanceScore: 0.9 }
      ];

      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue(mockHighRelevanceOpps);

      const result = await archivistService.getHighRelevanceOpportunities(0.8);

      expect(result).toEqual(mockHighRelevanceOpps);
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            relevanceScore: { gte: 0.8 }
          })
        })
      );
    });
  });

  // =====================================
  // Statistics Tests
  // =====================================

  describe('getStats', () => {
    test('should return comprehensive statistics', async () => {
      // Mock the various database calls for stats
      mockPrisma.opportunity.count = jest.fn().mockResolvedValue(100);
      mockPrisma.opportunity.groupBy = jest.fn().mockResolvedValue([
        { status: 'new', _count: 60 },
        { status: 'reviewing', _count: 25 },
        { status: 'archived', _count: 15 }
      ]);
      mockPrisma.opportunity.aggregate = jest.fn().mockResolvedValue({
        _avg: { relevanceScore: 0.75 }
      });
      mockPrisma.opportunitySource.count = jest.fn().mockResolvedValue(5);

      const result = await archivistService.getStats();

      expect(result.totalOpportunities).toBe(100);
      expect(result.averageRelevanceScore).toBe(0.75);
      expect(result.sourcesActive).toBe(5);
      expect(result.opportunitiesByStatus).toEqual({
        new: 60,
        reviewing: 25,
        archived: 15
      });
    });
  });

  // =====================================
  // Data Integrity Tests
  // =====================================

  describe('validateDataIntegrity', () => {
    test('should identify data integrity issues', async () => {
      mockPrisma.opportunity.count = jest.fn()
        .mockResolvedValueOnce(100) // total records
        .mockResolvedValueOnce(5); // opportunities without title
      
      mockPrisma.opportunitySourceLink.count = jest.fn().mockResolvedValue(3); // orphaned links

      const result = await archivistService.validateDataIntegrity();

      expect(result.totalRecords).toBe(100);
      expect(result.invalidRecords).toBe(5);
      expect(result.orphanedRecords).toBe(3);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  // =====================================
  // Error Handling Tests
  // =====================================

  describe('error handling', () => {
    test('should handle database errors gracefully', async () => {
      mockPrisma.opportunity.create = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(archivistService.saveOpportunity({
        title: 'Test',
        description: 'Test description that meets minimum length requirements',
        url: 'https://example.org',
        sourceType: 'websearch',
        tags: []
      })).rejects.toThrow('Failed to save opportunity');
    });

    test('should emit error events', async () => {
      const errorHandler = jest.fn();
      archivistService.on('error', errorHandler);

      mockPrisma.opportunity.create = jest.fn().mockRejectedValue(new Error('Test error'));

      try {
        await archivistService.saveOpportunity({
          title: 'Test',
          description: 'Test description that meets minimum length requirements',
          url: 'https://example.org',
          sourceType: 'websearch',
          tags: []
        });
      } catch (error) {
        // Expected to throw
      }

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  // =====================================
  // Health Check Tests
  // =====================================

  describe('healthCheck', () => {
    test('should return healthy status when all systems operational', async () => {
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue([{ result: 1 }]);
      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue([]);

      const health = await archivistService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.database).toBe(true);
      expect(health.details.repositories).toBe(true);
      expect(health.details.deduplication).toBe(true);
    });

    test('should return unhealthy status when database is down', async () => {
      mockPrisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const health = await archivistService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.database).toBe(false);
    });
  });
});

// =====================================
// Integration-like Tests
// =====================================

describe('ArchivistService Integration', () => {
  let archivistService: ArchivistService;

  beforeEach(() => {
    archivistService = new ArchivistService(mockPrisma);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await archivistService.shutdown();
  });

  test('should handle full opportunity lifecycle', async () => {
    const opportunityData: OpportunityData = {
      title: 'Lifecycle Test Grant',
      description: 'A test grant for validating the full opportunity lifecycle in the system.',
      url: 'https://example.org/lifecycle-grant',
      organization: 'Test Foundation',
      deadline: new Date('2024-12-31'),
      tags: ['test', 'grant'],
      sourceType: 'websearch',
      relevanceScore: 0.8,
      status: 'new'
    };

    // Mock create
    const createdOpportunity = { id: 'lifecycle-test-id', ...opportunityData };
    mockPrisma.opportunity.create = jest.fn().mockResolvedValue(createdOpportunity);
    mockPrisma.opportunity.findFirst = jest.fn().mockResolvedValue(null); // No duplicate

    // 1. Create opportunity
    const createResult = await archivistService.saveOpportunity(opportunityData);
    expect(createResult.isDuplicate).toBe(false);
    expect(createResult.opportunity?.id).toBe('lifecycle-test-id');

    // Mock update
    const updatedOpportunity = { ...createdOpportunity, status: 'reviewing' };
    mockPrisma.opportunity.update = jest.fn().mockResolvedValue(updatedOpportunity);

    // 2. Update opportunity
    const updateResult = await archivistService.updateOpportunity('lifecycle-test-id', {
      status: 'reviewing'
    });
    expect(updateResult.status).toBe('reviewing');

    // Mock delete
    mockPrisma.opportunity.delete = jest.fn().mockResolvedValue(updatedOpportunity);

    // 3. Delete opportunity
    await expect(archivistService.deleteOpportunity('lifecycle-test-id')).resolves.not.toThrow();

    // Verify all operations were called
    expect(mockPrisma.opportunity.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.opportunity.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.opportunity.delete).toHaveBeenCalledTimes(1);
  });
});