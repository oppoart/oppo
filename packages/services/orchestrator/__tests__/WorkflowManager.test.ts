import { WorkflowManager } from '../workflows/WorkflowManager';
import { OrchestrationEngine } from '../core/OrchestrationEngine';
import { WorkflowPattern } from '../types';

// Mock the orchestration engine
jest.mock('../core/OrchestrationEngine');

describe('WorkflowManager', () => {
  let workflowManager: WorkflowManager;
  let mockOrchestrator: jest.Mocked<OrchestrationEngine>;

  beforeEach(() => {
    workflowManager = new WorkflowManager();
    
    mockOrchestrator = {
      registerWorkflow: jest.fn().mockResolvedValue(undefined),
      executeWorkflow: jest.fn().mockResolvedValue({ success: true }),
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined)
    } as any;

    workflowManager.setOrchestrator(mockOrchestrator);
  });

  describe('Workflow Management', () => {
    test('should create workflows', async () => {
      const workflow = {
        name: 'Test Workflow',
        description: 'A test workflow',
        enabled: true,
        trigger: {
          type: 'manual' as const,
          config: {}
        },
        steps: [
          {
            id: 'step1',
            action: 'wait' as const,
            config: { delay: 1000 }
          }
        ]
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      
      expect(workflowId).toBeDefined();
      expect(workflowId).toMatch(/^workflow_\d+_[a-z0-9]+$/);
      expect(mockOrchestrator.registerWorkflow).toHaveBeenCalled();
    });

    test('should retrieve workflows', async () => {
      const workflow = {
        name: 'Retrievable Workflow',
        enabled: true,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      const retrieved = workflowManager.getWorkflow(workflowId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Retrievable Workflow');
      expect(retrieved!.id).toBe(workflowId);
    });

    test('should list all workflows', async () => {
      await workflowManager.createWorkflow({
        name: 'Workflow 1',
        enabled: true,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      });

      await workflowManager.createWorkflow({
        name: 'Workflow 2',
        enabled: false,
        trigger: { type: 'cron' as const, config: { cron: '0 0 * * *' } },
        steps: []
      });

      const workflows = workflowManager.getAllWorkflows();
      expect(workflows).toHaveLength(2);
      expect(workflows.map(w => w.name)).toContain('Workflow 1');
      expect(workflows.map(w => w.name)).toContain('Workflow 2');
    });

    test('should update workflows', async () => {
      const workflow = {
        name: 'Original Name',
        enabled: true,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      
      const updated = await workflowManager.updateWorkflow(workflowId, {
        name: 'Updated Name',
        enabled: false
      });

      expect(updated).toBe(true);
      
      const retrieved = workflowManager.getWorkflow(workflowId);
      expect(retrieved!.name).toBe('Updated Name');
      expect(retrieved!.enabled).toBe(false);
      expect(mockOrchestrator.registerWorkflow).toHaveBeenCalledTimes(2); // Once for create, once for update
    });

    test('should delete workflows', async () => {
      const workflow = {
        name: 'To Be Deleted',
        enabled: true,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      expect(workflowManager.getWorkflow(workflowId)).toBeDefined();
      
      const deleted = await workflowManager.deleteWorkflow(workflowId);
      expect(deleted).toBe(true);
      expect(workflowManager.getWorkflow(workflowId)).toBeUndefined();
    });

    test('should handle non-existent workflow operations', async () => {
      const nonExistentId = 'workflow_123_abc';
      
      expect(workflowManager.getWorkflow(nonExistentId)).toBeUndefined();
      expect(await workflowManager.updateWorkflow(nonExistentId, { name: 'Test' })).toBe(false);
      expect(await workflowManager.deleteWorkflow(nonExistentId)).toBe(false);
    });
  });

  describe('Workflow Execution', () => {
    test('should execute workflows', async () => {
      const workflow = {
        name: 'Executable Workflow',
        enabled: true,
        trigger: { type: 'manual' as const, config: {} },
        steps: [
          {
            id: 'step1',
            action: 'wait' as const,
            config: { delay: 100 }
          }
        ]
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      const context = { input: 'test data' };
      
      const executionId = await workflowManager.executeWorkflow(workflowId, context);
      
      expect(executionId).toBeDefined();
      expect(executionId).toMatch(/^exec_\d+_[a-z0-9]+$/);
      expect(mockOrchestrator.executeWorkflow).toHaveBeenCalledWith(workflowId, context);
    });

    test('should not execute disabled workflows', async () => {
      const workflow = {
        name: 'Disabled Workflow',
        enabled: false,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      
      await expect(workflowManager.executeWorkflow(workflowId))
        .rejects.toThrow('Workflow is disabled');
    });

    test('should not execute non-existent workflows', async () => {
      const nonExistentId = 'workflow_123_abc';
      
      await expect(workflowManager.executeWorkflow(nonExistentId))
        .rejects.toThrow('Workflow not found');
    });

    test('should track workflow executions', async () => {
      const workflow = {
        name: 'Tracked Workflow',
        enabled: true,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      const executionId = await workflowManager.executeWorkflow(workflowId);
      
      const execution = workflowManager.getExecution(executionId);
      expect(execution).toBeDefined();
      expect(execution!.workflowId).toBe(workflowId);
      expect(execution!.status).toBe('completed');
    });

    test('should handle workflow execution failures', async () => {
      mockOrchestrator.executeWorkflow.mockRejectedValue(new Error('Execution failed'));
      
      const workflow = {
        name: 'Failing Workflow',
        enabled: true,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      
      await expect(workflowManager.executeWorkflow(workflowId))
        .rejects.toThrow('Execution failed');
      
      const executions = workflowManager.getWorkflowExecutions(workflowId);
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('failed');
      expect(executions[0].error).toBe('Execution failed');
    });
  });

  describe('Workflow Templates', () => {
    test('should create source scan workflow template', () => {
      const template = workflowManager.createSourceScanWorkflow();
      
      expect(template.name).toBe('Source Scanning');
      expect(template.enabled).toBe(true);
      expect(template.trigger.type).toBe('cron');
      expect(template.trigger.config.cron).toBe('0 */6 * * *');
      expect(template.steps).toHaveLength(3);
    });

    test('should create deadline alert workflow template', () => {
      const template = workflowManager.createDeadlineAlertWorkflow();
      
      expect(template.name).toBe('Deadline Alerts');
      expect(template.enabled).toBe(true);
      expect(template.trigger.type).toBe('cron');
      expect(template.trigger.config.cron).toBe('0 9 * * *');
      expect(template.steps.some(step => step.config.toolName === 'get_upcoming_deadline_opportunities')).toBe(true);
    });

    test('should create opportunity analysis workflow template', () => {
      const template = workflowManager.createOpportunityAnalysisWorkflow();
      
      expect(template.name).toBe('Opportunity Analysis');
      expect(template.trigger.type).toBe('event');
      expect(template.trigger.config.eventType).toBe('NEW_OPPORTUNITY_FOUND');
      expect(template.steps.length).toBeGreaterThan(0);
    });

    test('should create user query workflow template', () => {
      const template = workflowManager.createUserQueryWorkflow();
      
      expect(template.name).toBe('User Query Processing');
      expect(template.trigger.type).toBe('event');
      expect(template.trigger.config.eventType).toBe('USER_QUERY');
      expect(template.steps.some(step => step.config.toolName === 'search_opportunities')).toBe(true);
    });

    test('should create default workflows', async () => {
      const workflowIds = await workflowManager.createDefaultWorkflows();
      
      expect(workflowIds).toHaveLength(4);
      expect(workflowIds.every(id => id.match(/^workflow_\d+_[a-z0-9]+$/))).toBe(true);
      
      const workflows = workflowManager.getAllWorkflows();
      expect(workflows).toHaveLength(4);
      
      const workflowNames = workflows.map(w => w.name);
      expect(workflowNames).toContain('Source Scanning');
      expect(workflowNames).toContain('Deadline Alerts');
      expect(workflowNames).toContain('Opportunity Analysis');
      expect(workflowNames).toContain('User Query Processing');
    });
  });

  describe('Workflow Statistics', () => {
    test('should provide workflow statistics', async () => {
      await workflowManager.createWorkflow({
        name: 'Enabled Workflow',
        enabled: true,
        trigger: { type: 'cron' as const, config: { cron: '0 * * * *' } },
        steps: []
      });

      await workflowManager.createWorkflow({
        name: 'Disabled Workflow',
        enabled: false,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      });

      const stats = workflowManager.getWorkflowStats();
      
      expect(stats.total).toBe(2);
      expect(stats.enabled).toBe(1);
      expect(stats.disabled).toBe(1);
      expect(stats.byTriggerType.cron).toBe(1);
      expect(stats.byTriggerType.manual).toBe(1);
      expect(Array.isArray(stats.recentExecutions)).toBe(true);
    });

    test('should track recent executions in statistics', async () => {
      const workflow = {
        name: 'Stats Workflow',
        enabled: true,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      await workflowManager.executeWorkflow(workflowId);
      
      const stats = workflowManager.getWorkflowStats();
      expect(stats.recentExecutions).toHaveLength(1);
      expect(stats.recentExecutions[0].workflowId).toBe(workflowId);
    });
  });

  describe('Execution Management', () => {
    test('should retrieve workflow executions', async () => {
      const workflow = {
        name: 'Execution Test',
        enabled: true,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      
      await workflowManager.executeWorkflow(workflowId);
      await workflowManager.executeWorkflow(workflowId);
      
      const executions = workflowManager.getWorkflowExecutions(workflowId);
      expect(executions).toHaveLength(2);
      expect(executions.every(exec => exec.workflowId === workflowId)).toBe(true);
    });

    test('should cleanup old executions', async () => {
      const workflow = {
        name: 'Cleanup Test',
        enabled: true,
        trigger: { type: 'manual' as const, config: {} },
        steps: []
      };

      const workflowId = await workflowManager.createWorkflow(workflow);
      await workflowManager.executeWorkflow(workflowId);
      
      // Clean up executions older than 0 hours (should clean all completed)
      const cleaned = await workflowManager.cleanupExecutions(0);
      expect(cleaned).toBe(1);
    });
  });
});