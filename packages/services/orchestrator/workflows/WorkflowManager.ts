import { WorkflowPattern, WorkflowExecution, WorkflowStatus, WorkflowTrigger, EventType } from '../types';
import { OrchestrationEngine } from '../core/OrchestrationEngine';

export class WorkflowManager {
  private workflows: Map<string, WorkflowPattern> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private orchestrator?: OrchestrationEngine;

  constructor() {}

  setOrchestrator(orchestrator: OrchestrationEngine): void {
    this.orchestrator = orchestrator;
  }

  // Workflow Management
  async createWorkflow(workflow: Omit<WorkflowPattern, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateWorkflowId();
    const fullWorkflow: WorkflowPattern = {
      ...workflow,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflows.set(id, fullWorkflow);

    if (this.orchestrator) {
      await this.orchestrator.registerWorkflow(fullWorkflow);
    }

    return id;
  }

  getWorkflow(id: string): WorkflowPattern | undefined {
    return this.workflows.get(id);
  }

  getAllWorkflows(): WorkflowPattern[] {
    return Array.from(this.workflows.values());
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowPattern>): Promise<boolean> {
    const workflow = this.workflows.get(id);
    if (!workflow) return false;

    const updatedWorkflow: WorkflowPattern = {
      ...workflow,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    this.workflows.set(id, updatedWorkflow);

    // Re-register with orchestrator if needed
    if (this.orchestrator) {
      await this.orchestrator.registerWorkflow(updatedWorkflow);
    }

    return true;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const workflow = this.workflows.get(id);
    if (!workflow) return false;

    // Disable first to stop any scheduled executions
    await this.updateWorkflow(id, { enabled: false });
    
    // Remove from orchestrator (assuming it supports unregistering)
    // For now, just disable it
    this.workflows.delete(id);

    // Clean up related executions
    const executions = Array.from(this.executions.values())
      .filter(exec => exec.workflowId === id);
    
    executions.forEach(exec => this.executions.delete(exec.id));

    return true;
  }

  // Workflow Execution
  async executeWorkflow(workflowId: string, context: any = {}): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow is disabled: ${workflowId}`);
    }

    const executionId = this.generateExecutionId();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      context,
      startedAt: new Date(),
      steps: []
    };

    this.executions.set(executionId, execution);

    try {
      if (this.orchestrator) {
        const result = await this.orchestrator.executeWorkflow(workflowId, context);
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.result = result;
      } else {
        throw new Error('Orchestrator not available');
      }
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.executions.set(executionId, execution);
    }

    return executionId;
  }

  getExecution(id: string): WorkflowExecution | undefined {
    return this.executions.get(id);
  }

  getWorkflowExecutions(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values())
      .filter(exec => exec.workflowId === workflowId);
  }

  // Predefined Workflow Templates
  createSourceScanWorkflow(): WorkflowPattern {
    return {
      id: '',
      name: 'Source Scanning',
      description: 'Periodically scans art opportunity sources',
      enabled: true,
      trigger: {
        type: 'cron',
        config: {
          cron: '0 */6 * * *' // Every 6 hours
        }
      },
      steps: [
        {
          id: 'fetch-updates',
          action: 'tool_use',
          config: {
            toolName: 'fetch_source_updates',
            params: { hours_since: 6 }
          },
          timeout: 120000, // 2 minutes
          retries: 2
        },
        {
          id: 'analyze-opportunities',
          action: 'tool_use',
          config: {
            toolName: 'analyze_opportunities',
            params: {}
          },
          timeout: 60000,
          retries: 1
        },
        {
          id: 'emit-results',
          action: 'emit_event',
          config: {
            eventType: 'SCAN_COMPLETED',
            params: {}
          }
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  createDeadlineAlertWorkflow(): WorkflowPattern {
    return {
      id: '',
      name: 'Deadline Alerts',
      description: 'Checks for upcoming deadlines and sends alerts',
      enabled: true,
      trigger: {
        type: 'cron',
        config: {
          cron: '0 9 * * *' // Daily at 9 AM
        }
      },
      steps: [
        {
          id: 'check-deadlines',
          action: 'tool_use',
          config: {
            toolName: 'get_upcoming_deadline_opportunities',
            params: { days: 7 }
          }
        },
        {
          id: 'generate-alerts',
          action: 'condition',
          config: {
            condition: 'context.opportunities && context.opportunities.length > 0'
          }
        },
        {
          id: 'emit-alerts',
          action: 'emit_event',
          config: {
            eventType: 'DEADLINE_ALERT'
          }
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  createOpportunityAnalysisWorkflow(): WorkflowPattern {
    return {
      id: '',
      name: 'Opportunity Analysis',
      description: 'Analyzes new opportunities for relevance and priority',
      enabled: true,
      trigger: {
        type: 'event',
        config: {
          eventType: 'NEW_OPPORTUNITY_FOUND'
        }
      },
      steps: [
        {
          id: 'analyze-relevance',
          action: 'tool_use',
          config: {
            toolName: 'analyze_opportunity_relevance',
            params: {}
          }
        },
        {
          id: 'predict-success',
          action: 'tool_use',
          config: {
            toolName: 'predict_application_success',
            params: {}
          }
        },
        {
          id: 'generate-strategy',
          action: 'tool_use',
          config: {
            toolName: 'generate_application_strategy',
            params: {}
          }
        },
        {
          id: 'emit-analysis',
          action: 'emit_event',
          config: {
            eventType: 'OPPORTUNITY_ANALYZED'
          }
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  createUserQueryWorkflow(): WorkflowPattern {
    return {
      id: '',
      name: 'User Query Processing',
      description: 'Processes complex user queries using RAG agent',
      enabled: true,
      trigger: {
        type: 'event',
        config: {
          eventType: 'USER_QUERY'
        }
      },
      steps: [
        {
          id: 'analyze-query',
          action: 'tool_use',
          config: {
            toolName: 'search_opportunities',
            params: {}
          }
        },
        {
          id: 'get-recommendations',
          action: 'tool_use',
          config: {
            toolName: 'get_high_relevance_opportunities',
            params: { threshold: 75 }
          }
        },
        {
          id: 'generate-summary',
          action: 'tool_use',
          config: {
            toolName: 'summarize_opportunities',
            params: {}
          }
        },
        {
          id: 'emit-response',
          action: 'emit_event',
          config: {
            eventType: 'QUERY_RESPONSE'
          }
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Workflow Templates Management
  async createDefaultWorkflows(): Promise<string[]> {
    const templates = [
      this.createSourceScanWorkflow(),
      this.createDeadlineAlertWorkflow(),
      this.createOpportunityAnalysisWorkflow(),
      this.createUserQueryWorkflow()
    ];

    const ids: string[] = [];
    for (const template of templates) {
      const id = await this.createWorkflow(template);
      ids.push(id);
    }

    return ids;
  }

  // Workflow Statistics
  getWorkflowStats(): {
    total: number;
    enabled: number;
    disabled: number;
    byTriggerType: Record<string, number>;
    recentExecutions: WorkflowExecution[];
  } {
    const workflows = Array.from(this.workflows.values());
    const executions = Array.from(this.executions.values());
    
    const enabled = workflows.filter(w => w.enabled).length;
    const disabled = workflows.length - enabled;
    
    const byTriggerType: Record<string, number> = {};
    workflows.forEach(w => {
      byTriggerType[w.trigger.type] = (byTriggerType[w.trigger.type] || 0) + 1;
    });

    // Get recent executions (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentExecutions = executions
      .filter(exec => exec.startedAt > oneDayAgo)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, 10);

    return {
      total: workflows.length,
      enabled,
      disabled,
      byTriggerType,
      recentExecutions
    };
  }

  // Helper Methods
  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup old executions
  async cleanupExecutions(olderThanHours: number = 168): Promise<number> { // Default 7 days
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const executions = Array.from(this.executions.entries());
    
    let cleaned = 0;
    executions.forEach(([id, execution]) => {
      if (execution.completedAt && execution.completedAt < cutoffDate) {
        this.executions.delete(id);
        cleaned++;
      }
    });

    return cleaned;
  }
}