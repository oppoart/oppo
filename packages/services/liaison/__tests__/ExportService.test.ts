import { ExportService } from '../export/ExportService';
import { PrismaClient, Opportunity } from '@prisma/client';
import { getLiaisonConfig } from '../config';

// Mock Prisma Client
const mockPrisma = {
  opportunity: {
    findMany: jest.fn()
  }
} as unknown as PrismaClient;

describe('ExportService', () => {
  let exportService: ExportService;
  const mockOpportunities: Opportunity[] = [
    {
      id: '1',
      title: 'Test Opportunity 1',
      organization: 'Test Org 1',
      description: 'Description 1',
      url: 'https://example.com/1',
      deadline: new Date('2024-12-01'),
      status: 'new',
      type: 'grant',
      relevanceScore: 85,
      applicationFee: 50,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      userId: 'user1',
      artistProfileId: 'profile1'
    },
    {
      id: '2',
      title: 'Test Opportunity 2',
      organization: 'Test Org 2',
      description: 'Description 2',
      url: 'https://example.com/2',
      deadline: new Date('2024-12-15'),
      status: 'reviewing',
      type: 'residency',
      relevanceScore: 92,
      applicationFee: 0,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-06'),
      userId: 'user1',
      artistProfileId: 'profile1'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    const config = getLiaisonConfig('test');
    exportService = new ExportService(mockPrisma, config.export);
  });

  describe('CSV export', () => {
    test('should export opportunities to CSV format', async () => {
      const result = await exportService.exportToCSV(mockOpportunities);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('text/csv;charset=utf-8;');

      // Read blob content
      const text = await result.text();
      const lines = text.split('\n');

      // Check headers
      expect(lines[0]).toContain('ID,Title,Organization');
      
      // Check data rows
      expect(lines[1]).toContain('1,Test Opportunity 1,Test Org 1');
      expect(lines[2]).toContain('2,Test Opportunity 2,Test Org 2');
    });

    test('should escape CSV special characters', async () => {
      const opportunityWithSpecialChars: Opportunity = {
        ...mockOpportunities[0],
        title: 'Title with "quotes" and, commas',
        description: 'Description with\nnewlines'
      };

      const result = await exportService.exportToCSV([opportunityWithSpecialChars]);
      const text = await result.text();

      expect(text).toContain('"Title with ""quotes"" and, commas"');
      expect(text).toContain('"Description with\nnewlines"');
    });
  });

  describe('JSON export', () => {
    test('should export opportunities to JSON format', async () => {
      const result = await exportService.exportToJSON(mockOpportunities);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/json;charset=utf-8;');

      const text = await result.text();
      const data = JSON.parse(text);

      expect(data.exportDate).toBeDefined();
      expect(data.version).toBe('1.0');
      expect(data.count).toBe(2);
      expect(data.opportunities).toHaveLength(2);
      expect(data.opportunities[0].id).toBe('1');
      expect(data.opportunities[0].title).toBe('Test Opportunity 1');
    });

    test('should include metadata when requested', async () => {
      const result = await exportService.exportToJSON(mockOpportunities, {
        includeMetadata: true
      });

      const text = await result.text();
      const data = JSON.parse(text);

      expect(data.opportunities[0]).toHaveProperty('tags');
      expect(data.opportunities[0]).toHaveProperty('notes');
      expect(data.opportunities[0]).toHaveProperty('source');
      expect(data.opportunities[0]).toHaveProperty('metadata');
    });
  });

  describe('filtered export', () => {
    test('should export filtered opportunities', async () => {
      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue(mockOpportunities);

      const result = await exportService.exportFiltered({
        status: ['new', 'reviewing'],
        relevanceMinScore: 80
      }, 'json');

      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['new', 'reviewing'] },
          relevanceScore: { gte: 80 }
        },
        take: 1000,
        orderBy: { createdAt: 'desc' }
      });

      expect(result).toBeInstanceOf(Blob);
    });

    test('should handle date range filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue([]);

      await exportService.exportFiltered({
        deadlineAfter: startDate,
        deadlineBefore: endDate
      }, 'csv');

      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith({
        where: {
          deadline: {
            gte: startDate,
            lte: endDate
          }
        },
        take: 1000,
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('export validation', () => {
    test('should throw error when exceeding max items limit', async () => {
      const largeOpportunityList = Array(1001).fill(mockOpportunities[0]);

      await expect(
        exportService.exportOpportunities(largeOpportunityList, 'csv')
      ).rejects.toThrow('Export limit exceeded');
    });

    test('should throw error for unsupported format', async () => {
      await expect(
        exportService.exportOpportunities(mockOpportunities, 'xml' as any)
      ).rejects.toThrow('Export format \'xml\' is not supported');
    });
  });

  describe('export template', () => {
    test('should generate CSV template', async () => {
      const result = await exportService.generateExportTemplate('csv');

      expect(result).toBeInstanceOf(Blob);
      
      const text = await result.text();
      expect(text).toContain('sample-id');
      expect(text).toContain('Sample Art Residency');
    });

    test('should generate JSON template', async () => {
      const result = await exportService.generateExportTemplate('json');

      expect(result).toBeInstanceOf(Blob);
      
      const text = await result.text();
      const data = JSON.parse(text);
      
      expect(data.opportunities[0].id).toBe('sample-id');
      expect(data.opportunities[0].title).toBe('Sample Art Residency');
    });
  });

  describe('event emission', () => {
    test('should emit export completed event', async () => {
      const eventSpy = jest.fn();
      exportService.on('export.completed', eventSpy);

      await exportService.exportOpportunities(mockOpportunities, 'csv');

      expect(eventSpy).toHaveBeenCalledWith('csv', 2);
    });

    test('should emit error event on failure', async () => {
      const errorSpy = jest.fn();
      exportService.on('error', errorSpy);

      // Force an error by passing invalid data
      const invalidOpportunities = null as any;

      await expect(
        exportService.exportOpportunities(invalidOpportunities, 'csv')
      ).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalled();
    });
  });
});