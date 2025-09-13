import { OrchestrationEngine } from '../core/OrchestrationEngine';
import { EventType, WorkflowPattern } from '../types';

describe('OrchestrationEngine', () => {
  let engine: OrchestrationEngine;

  beforeEach(async () => {
    engine = new OrchestrationEngine({
      scheduling: {
        scanInterval: '1h',
        alertCheckInterval: '30m',
        cleanupInterval: '1d',
        maxConcurrentScans: 2
      },
      agent: {
        model: 'gpt-3.5-turbo',
        maxToolCalls: 3,
        timeout: 10000,
        temperature: 0.5,
        vectorStorePath: './test-vectors'
      },
      events: {
        maxRetries: 2,
        retryDelay: 1000,
        deadLetterQueueSize: 50
      },
      cache: {
        enabled: false, // Disable cache for tests
        ttl: 60000,
        maxSize: 100
      }
    });
    
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.shutdown();
  });

  describe('Event Management', () => {
    test('should emit and process events', async () => {
      const eventData = { test: 'data' };
      
      // Subscribe to event
      const receivedEvents: any[] = [];
      engine.subscribe('SCAN_SOURCES', (event) => {
        receivedEvents.push(event);
      });

      // Emit event
      const eventId = await engine.emitEvent({
        type: 'SCAN_SOURCES',
        data: eventData,
        priority: 'medium',
        source: 'test'
      });

      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^event_\d+_[a-z0-9]+$/);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].data).toEqual(eventData);
      expect(receivedEvents[0].type).toBe('SCAN_SOURCES');
    });

    test('should handle event subscription and unsubscription', () => {
      const handler = jest.fn();
      
      // Subscribe
      const subId = engine.subscribe('USER_QUERY', handler);
      expect(subId).toBeDefined();
      expect(subId).toMatch(/^sub_\d+_[a-z0-9]+$/);

      // Unsubscribe
      const unsubscribed = engine.unsubscribe(subId);
      expect(unsubscribed).toBe(true);

      // Try to unsubscribe again
      const unsubscribedAgain = engine.unsubscribe(subId);
      expect(unsubscribedAgain).toBe(false);
    });

    test('should filter events based on subscription filter', async () => {
      const allEvents: any[] = [];
      const filteredEvents: any[] = [];

      // Subscribe without filter
      engine.subscribe('SCAN_SOURCES', (event) => {
        allEvents.push(event);
      });

      // Subscribe with filter
      engine.subscribe('SCAN_SOURCES', (event) => {
        filteredEvents.push(event);
      }, {
        filter: (event) => event.data.priority === 'high'
      });

      // Emit events
      await engine.emitEvent({
        type: 'SCAN_SOURCES',
        data: { priority: 'low' },
        source: 'test'
      });

      await engine.emitEvent({
        type: 'SCAN_SOURCES',
        data: { priority: 'high' },
        source: 'test'
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(allEvents).toHaveLength(2);
      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].data.priority).toBe('high');
    });
  });

  describe('Workflow Management', () => {
    test('should register and execute workflows', async () => {
      const workflow: WorkflowPattern = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        trigger: {
          type: 'event',
          config: {
            eventType: 'TEST_TRIGGER'
          }
        },
        steps: [
          {
            id: 'wait-step',
            action: 'wait',
            config: {
              delay: 10
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await engine.registerWorkflow(workflow);

      // Execute workflow
      const result = await engine.executeWorkflow('test-workflow', { input: 'test' });
      expect(result).toBeDefined();
    });

    test('should handle workflow execution failures', async () => {
      const workflow: WorkflowPattern = {
        id: 'failing-workflow',
        name: 'Failing Workflow',
        enabled: true,
        trigger: {
          type: 'manual',
          config: {}
        },
        steps: [
          {
            id: 'invalid-step',
            action: 'invalid_action' as any,
            config: {}
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await engine.registerWorkflow(workflow);

      await expect(engine.executeWorkflow('failing-workflow'))
        .rejects.toThrow();
    });

    test('should not execute disabled workflows', async () => {
      const workflow: WorkflowPattern = {
        id: 'disabled-workflow',
        name: 'Disabled Workflow',
        enabled: false,
        trigger: {
          type: 'manual',
          config: {}
        },
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await engine.registerWorkflow(workflow);

      await expect(engine.executeWorkflow('disabled-workflow'))
        .rejects.toThrow('Workflow is disabled');
    });
  });

  describe('Statistics and Health', () => {
    test('should provide statistics', () => {
      const stats = engine.getStats();
      
      expect(stats).toHaveProperty('eventsProcessed');
      expect(stats).toHaveProperty('workflowsExecuted');
      expect(stats).toHaveProperty('agentQueries');
      expect(stats).toHaveProperty('toolCalls');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('averageResponseTime');
      expect(stats).toHaveProperty('uptime');

      expect(typeof stats.eventsProcessed).toBe('number');
      expect(typeof stats.workflowsExecuted).toBe('number');
      expect(stats.uptime).toBeGreaterThan(0);
    });

    test('should perform health check', async () => {
      const health = await engine.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('details');
      expect(health.details).toHaveProperty('queue');
      expect(health.details).toHaveProperty('worker');
      expect(health.details).toHaveProperty('scheduledJobs');
      expect(health.details).toHaveProperty('workflows');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully', async () => {
      const errorHandler = jest.fn();
      engine.on('error', errorHandler);

      // Try to execute non-existent workflow
      await expect(engine.executeWorkflow('non-existent'))
        .rejects.toThrow('Workflow not found');
    });

    test('should emit workflow failure events', async () => {
      const failureHandler = jest.fn();
      engine.on('workflow.failed', failureHandler);

      const workflow: WorkflowPattern = {
        id: 'error-workflow',
        name: 'Error Workflow',
        enabled: true,
        trigger: {
          type: 'manual',
          config: {}
        },
        steps: [
          {
            id: 'error-step',
            action: 'call_service',
            config: {
              service: 'non-existent',
              method: 'test'
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await engine.registerWorkflow(workflow);

      try {
        await engine.executeWorkflow('error-workflow');
      } catch (error) {
        // Expected to fail
      }

      // Wait for event emission
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(failureHandler).toHaveBeenCalled();
    });
  });

  describe('Workflow Steps', () => {
    test('should execute emit_event steps', async () => {
      const eventHandler = jest.fn();
      engine.subscribe('WORKFLOW_EVENT', eventHandler);

      const workflow: WorkflowPattern = {
        id: 'emit-workflow',
        name: 'Emit Workflow',
        enabled: true,
        trigger: {
          type: 'manual',
          config: {}
        },
        steps: [
          {
            id: 'emit-step',
            action: 'emit_event',
            config: {
              eventType: 'WORKFLOW_EVENT',
              params: { test: 'value' }
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await engine.registerWorkflow(workflow);
      await engine.executeWorkflow('emit-workflow');

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(eventHandler).toHaveBeenCalled();
      expect(eventHandler.mock.calls[0][0].data).toEqual({ test: 'value' });
    });

    test('should execute wait steps', async () => {
      const startTime = Date.now();

      const workflow: WorkflowPattern = {
        id: 'wait-workflow',
        name: 'Wait Workflow',
        enabled: true,
        trigger: {
          type: 'manual',
          config: {}
        },
        steps: [
          {
            id: 'wait-step',
            action: 'wait',
            config: {
              delay: 50
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await engine.registerWorkflow(workflow);
      await engine.executeWorkflow('wait-workflow');

      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(40); // Allow for some timing variance
    });

    test('should handle workflow step retries', async () => {
      let attemptCount = 0;
      const originalCallService = (engine as any).callService;
      (engine as any).callService = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Service unavailable');
        }
        return { success: true };
      });

      const workflow: WorkflowPattern = {
        id: 'retry-workflow',
        name: 'Retry Workflow',
        enabled: true,
        trigger: {
          type: 'manual',
          config: {}
        },
        steps: [
          {
            id: 'retry-step',
            action: 'call_service',
            config: {
              service: 'test',
              method: 'test'
            },
            retries: 3
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await engine.registerWorkflow(workflow);
      const result = await engine.executeWorkflow('retry-workflow');

      expect(result).toBeDefined();
      expect(attemptCount).toBe(3);

      // Restore original method
      (engine as any).callService = originalCallService;
    });
  });
});