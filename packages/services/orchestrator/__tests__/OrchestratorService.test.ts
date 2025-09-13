import { OrchestratorService } from '../core/OrchestratorService';
import { PrismaClient } from '@prisma/client';

// Mock external dependencies
jest.mock('@prisma/client');
jest.mock('bullmq');
jest.mock('cron');

// Mock file system operations for vector store
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('{}'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined)
}));

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Prisma
    mockPrisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
      opportunity: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([])
      },
      artistProfile: {
        findMany: jest.fn().mockResolvedValue([])
      }
    } as any;

    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

    service = new OrchestratorService();
  });

  afterEach(async () => {
    if (service.getStatus() === 'running') {
      await service.stop();
    }
  });

  describe('Lifecycle Management', () => {
    test('should initialize successfully', async () => {
      // Mock environment variables
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      await service.initialize();
      
      expect(service.getStatus()).toBe('running');
      expect(mockPrisma.$connect).toHaveBeenCalled();
    });

    test('should handle initialization failure gracefully', async () => {
      // Mock database connection failure
      mockPrisma.$connect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.initialize()).rejects.toThrow();
      expect(service.getStatus()).toBe('error');
    });

    test('should start and stop service', async () => {
      // Setup environment
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      
      await service.initialize();
      expect(service.getStatus()).toBe('running');

      await service.start();
      expect(service.getStatus()).toBe('running');

      await service.stop();
      expect(service.getStatus()).toBe('stopped');
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    test('should restart service', async () => {
      // Setup environment
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      
      await service.initialize();
      await service.restart();
      
      expect(service.getStatus()).toBe('running');
    });
  });

  describe('Event Interface', () => {
    beforeEach(async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      await service.initialize();
    });

    test('should emit events', async () => {
      const eventId = await service.emitEvent('SCAN_SOURCES', { test: 'data' });
      
      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^event_\d+_[a-z0-9]+$/);
    });

    test('should handle event emission errors', async () => {
      // This will test error handling within the service
      const eventId = await service.emitEvent('INVALID_EVENT' as any, null);
      expect(eventId).toBeDefined();
    });
  });

  describe('Agent Interface', () => {
    beforeEach(async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      await service.initialize();
    });

    test('should query agent', async () => {
      const query = 'Find art opportunities in New York';
      const result = await service.queryAgent(query);
      
      expect(result).toBeDefined();
      // The actual result depends on the RAG agent implementation
    });

    test('should handle agent query with context', async () => {
      const query = 'What are the best opportunities for me?';
      const context = { artistType: 'painter', location: 'NYC' };
      
      const result = await service.queryAgent(query, context);
      expect(result).toBeDefined();
    });
  });

  describe('Workflow Interface', () => {
    beforeEach(async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      await service.initialize();
    });

    test('should create workflows', async () => {
      const workflow = {
        name: 'Test Workflow',
        enabled: true,
        trigger: {
          type: 'manual',
          config: {}
        },
        steps: []
      };

      const workflowId = await service.createWorkflow(workflow);
      expect(workflowId).toBeDefined();
      expect(workflowId).toMatch(/^workflow_\d+_[a-z0-9]+$/);
    });

    test('should execute workflows', async () => {
      const workflow = {
        name: 'Execution Test Workflow',
        enabled: true,
        trigger: {
          type: 'manual',
          config: {}
        },
        steps: [
          {
            id: 'test-step',
            action: 'wait',
            config: { delay: 10 }
          }
        ]
      };

      const workflowId = await service.createWorkflow(workflow);
      const executionId = await service.executeWorkflow(workflowId, { test: 'context' });
      
      expect(executionId).toBeDefined();
      expect(executionId).toMatch(/^exec_\d+_[a-z0-9]+$/);
    });
  });

  describe('Schedule Interface', () => {
    beforeEach(async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      await service.initialize();
    });

    test('should schedule tasks', async () => {
      const task = {
        name: 'Test Task',
        description: 'A test scheduled task',
        action: 'scan_sources',
        frequency: 'daily',
        priority: 'medium',
        enabled: true
      };

      const taskId = await service.scheduleTask(task);
      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task_\d+_[a-z0-9]+$/);
    });
  });

  describe('Health and Statistics', () => {
    beforeEach(async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      await service.initialize();
    });

    test('should provide status', () => {
      const status = service.getStatus();
      expect(['stopped', 'initializing', 'running', 'stopping', 'error']).toContain(status);
    });

    test('should provide statistics', async () => {
      const stats = await service.getStats();
      
      expect(stats).toHaveProperty('eventsProcessed');
      expect(stats).toHaveProperty('workflowsExecuted');
      expect(stats).toHaveProperty('workflows');
      expect(stats).toHaveProperty('scheduledTasks');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('startTime');

      expect(typeof stats.eventsProcessed).toBe('number');
      expect(typeof stats.workflowsExecuted).toBe('number');
    });

    test('should perform health check', async () => {
      const health = await service.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('details');
      expect(health.details).toHaveProperty('service');
      expect(health.details).toHaveProperty('engine');
      expect(health.details).toHaveProperty('database');
      expect(health.details).toHaveProperty('errors');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      await service.initialize();
    });

    test('should provide configuration', () => {
      const config = service.getConfiguration();
      
      expect(config).toHaveProperty('scheduling');
      expect(config).toHaveProperty('agent');
      expect(config).toHaveProperty('events');
      expect(config).toHaveProperty('cache');
      expect(config).toHaveProperty('external');
      expect(config).toHaveProperty('security');
    });

    test('should update configuration', async () => {
      const updates = {
        scheduling: {
          scanInterval: '2h',
          maxConcurrentScans: 5
        }
      };

      await service.updateConfiguration(updates);
      
      const config = service.getConfiguration();
      expect(config.scheduling.scanInterval).toBe('2h');
      expect(config.scheduling.maxConcurrentScans).toBe(5);
    });
  });

  describe('Error Handling', () => {
    test('should handle configuration errors', async () => {
      // Don't set DATABASE_URL
      delete process.env.DATABASE_URL;
      
      await expect(service.initialize()).rejects.toThrow();
      expect(service.getStatus()).toBe('error');
    });

    test('should handle database connection errors', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      mockPrisma.$connect.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(service.initialize()).rejects.toThrow();
    });
  });

  describe('Maintenance Operations', () => {
    beforeEach(async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      await service.initialize();
    });

    test('should perform maintenance', async () => {
      await service.performMaintenance();
      // Should complete without throwing
    });
  });
});