import { LiaisonService } from '../core/LiaisonService';
import { PrismaClient } from '@prisma/client';
import { getLiaisonConfig } from '../config';

// Mock Prisma Client
const mockPrisma = {
  opportunity: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  },
  $queryRaw: jest.fn(),
  $disconnect: jest.fn()
} as unknown as PrismaClient;

// Mock WebSocket
global.WebSocket = jest.fn() as any;

describe('LiaisonService', () => {
  let liaisonService: LiaisonService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    const config = getLiaisonConfig('test');
    liaisonService = new LiaisonService(mockPrisma, config);
  });

  afterEach(async () => {
    await liaisonService.shutdown();
  });

  describe('initialization', () => {
    test('should initialize successfully without Notion config', async () => {
      await expect(liaisonService.initialize()).resolves.not.toThrow();
    });

    test('should handle multiple initialization calls', async () => {
      await liaisonService.initialize();
      await expect(liaisonService.initialize()).resolves.not.toThrow();
    });
  });

  describe('opportunity management', () => {
    test('should get opportunities with default pagination', async () => {
      const mockOpportunities = [
        { id: '1', title: 'Test Opportunity 1', status: 'new' },
        { id: '2', title: 'Test Opportunity 2', status: 'reviewing' }
      ];
      
      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue(mockOpportunities);
      mockPrisma.opportunity.count = jest.fn().mockResolvedValue(2);

      const result = await liaisonService.getOpportunities();

      expect(result.opportunities).toEqual(mockOpportunities);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    test('should filter opportunities by status', async () => {
      const mockOpportunities = [
        { id: '1', title: 'Test Opportunity 1', status: 'new' }
      ];
      
      mockPrisma.opportunity.findMany = jest.fn().mockResolvedValue(mockOpportunities);
      mockPrisma.opportunity.count = jest.fn().mockResolvedValue(1);

      const result = await liaisonService.getOpportunities({
        status: ['new']
      });

      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith({
        where: { status: { in: ['new'] } },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should update opportunity status', async () => {
      const mockOpportunity = {
        id: '1',
        title: 'Test Opportunity',
        status: 'reviewing',
        updatedAt: new Date()
      };

      mockPrisma.opportunity.update = jest.fn().mockResolvedValue(mockOpportunity);

      const result = await liaisonService.updateOpportunityStatus('1', 'reviewing');

      expect(mockPrisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { 
          status: 'reviewing',
          updatedAt: expect.any(Date)
        }
      });
      expect(result).toEqual(mockOpportunity);
    });
  });

  describe('feedback capture', () => {
    test('should capture user feedback and update status', async () => {
      const mockOpportunity = {
        id: '1',
        status: 'new',
        createdAt: new Date(Date.now() - 60000) // 1 minute ago
      };

      mockPrisma.opportunity.findUnique = jest.fn()
        .mockResolvedValueOnce({ status: 'new' }) // for getOpportunityStatus
        .mockResolvedValueOnce(mockOpportunity); // for calculateTimeToDecision

      mockPrisma.opportunity.update = jest.fn().mockResolvedValue({
        ...mockOpportunity,
        status: 'applying'
      });

      await liaisonService.captureFeedback({
        opportunityId: '1',
        action: 'accepted',
        reason: 'Looks interesting'
      });

      expect(mockPrisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { 
          status: 'applying',
          updatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('dashboard data', () => {
    test('should get dashboard statistics', async () => {
      // Mock all the count queries
      mockPrisma.opportunity.count = jest.fn()
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10)  // new this week
        .mockResolvedValueOnce(5)   // upcoming deadlines
        .mockResolvedValueOnce(20)  // high relevance
        .mockResolvedValueOnce(15)  // in progress
        .mockResolvedValueOnce(8);  // submitted

      // Mock find queries
      mockPrisma.opportunity.findMany = jest.fn()
        .mockResolvedValueOnce([]) // recent opportunities
        .mockResolvedValueOnce([]); // deadline opportunities

      const result = await liaisonService.getDashboardData();

      expect(result.stats.totalOpportunities).toBe(100);
      expect(result.stats.newThisWeek).toBe(10);
      expect(result.stats.upcomingDeadlines).toBe(5);
      expect(result.stats.highRelevance).toBe(20);
      expect(result.stats.inProgress).toBe(15);
      expect(result.stats.submitted).toBe(8);
    });
  });

  describe('health check', () => {
    test('should return healthy status when all services are working', async () => {
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

      const result = await liaisonService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.details.database).toBe(true);
      expect(result.details.export).toBe(true);
    });

    test('should return unhealthy status when database fails', async () => {
      mockPrisma.$queryRaw = jest.fn().mockRejectedValue(new Error('DB Error'));

      const result = await liaisonService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.details.database).toBe(false);
    });
  });

  describe('event handling', () => {
    test('should emit events when opportunities are updated', async () => {
      const mockOpportunity = {
        id: '1',
        title: 'Test Opportunity',
        status: 'reviewing'
      };

      mockPrisma.opportunity.update = jest.fn().mockResolvedValue(mockOpportunity);

      const eventSpy = jest.fn();
      liaisonService.on('opportunity.updated', eventSpy);

      await liaisonService.updateOpportunityStatus('1', 'reviewing');

      expect(eventSpy).toHaveBeenCalledWith(mockOpportunity);
    });
  });
});