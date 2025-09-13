import { EventEmitter } from 'events';
import { Queue, Worker, Job } from 'bullmq';
import { CronJob } from 'cron';
import express from 'express';
import { createHash, createHmac } from 'crypto';
import fetch from 'node-fetch';
import { WebSocketManager } from './WebSocketManager';
import { 
  OrchestratorConfig, 
  OrchestrationEvent, 
  EventType, 
  WorkflowPattern, 
  WorkflowStep,
  ScheduledTask,
  EventSubscription,
  OrchestratorEvents,
  OrchestratorStats,
  WebhookConfig
} from '../types';

export class OrchestrationEngine extends EventEmitter {
  private config: OrchestratorConfig;
  private eventQueue: Queue;
  private worker: Worker;
  private scheduledJobs: Map<string, CronJob> = new Map();
  private subscriptions: Map<EventType, EventSubscription[]> = new Map();
  private workflows: Map<string, WorkflowPattern> = new Map();
  private isInitialized: boolean = false;
  private stats: OrchestratorStats;
  private startTime: Date;
  private webhookServer?: express.Express;
  private webhookHandlers: Map<string, WorkflowPattern> = new Map();
  private wsManager?: WebSocketManager;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    
    this.config = {
      scheduling: {
        scanInterval: '24h',
        alertCheckInterval: '1h', 
        cleanupInterval: '7d',
        maxConcurrentScans: 3,
        ...config.scheduling
      },
      agent: {
        model: 'gpt-3.5-turbo',
        maxToolCalls: 5,
        timeout: 30000,
        temperature: 0.7,
        vectorStorePath: './data/vectors',
        ...config.agent
      },
      events: {
        maxRetries: 3,
        retryDelay: 5000,
        deadLetterQueueSize: 100,
        ...config.events
      },
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 1000,
        ...config.cache
      }
    };

    this.startTime = new Date();
    this.stats = this.initializeStats();
    
    // Initialize BullMQ components
    this.eventQueue = new Queue('orchestrator-events', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: this.config.events.maxRetries,
        backoff: {
          type: 'exponential',
          delay: this.config.events.retryDelay,
        },
      },
    });

    this.worker = new Worker('orchestrator-events', this.processEvent.bind(this), {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      concurrency: this.config.scheduling.maxConcurrentScans,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing Orchestration Engine...');

    try {
      // Setup event handlers
      this.setupEventHandlers();
      
      // Register default workflows
      await this.registerDefaultWorkflows();
      
      // Start scheduled tasks
      await this.startScheduledTasks();
      
      // Setup webhook handlers
      await this.setupWebhookHandlers();
      
      // Setup WebSocket manager
      this.setupWebSocketManager();
      
      // Setup error handling
      this.setupErrorHandling();

      this.isInitialized = true;
      console.log('Orchestration Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Orchestration Engine:', error);
      throw error;
    }
  }

  // Event Management
  async emitEvent(event: Omit<OrchestrationEvent, 'id' | 'timestamp'>): Promise<string> {
    const fullEvent: OrchestrationEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };

    // Add to queue for processing
    await this.eventQueue.add('process-event', fullEvent, {
      priority: this.getPriority(fullEvent.priority),
      delay: 0,
    });

    return fullEvent.id;
  }

  subscribe(eventType: EventType, handler: EventSubscription['handler'], options?: {
    filter?: EventSubscription['filter'];
    priority?: number;
  }): string {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      eventType,
      handler,
      filter: options?.filter,
      priority: options?.priority || 0,
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subs = this.subscriptions.get(eventType)!;
    subs.push(subscription);
    
    // Sort by priority (higher first)
    subs.sort((a, b) => b.priority - a.priority);

    return subscription.id;
  }

  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  // Workflow Management
  async registerWorkflow(workflow: WorkflowPattern): Promise<void> {
    this.workflows.set(workflow.id, workflow);
    
    // If it's a cron-triggered workflow, schedule it
    if (workflow.trigger.type === 'cron' && workflow.trigger.config.cron) {
      this.scheduleWorkflow(workflow);
    }
    
    // If it's a webhook-triggered workflow, register the webhook handler
    if (workflow.trigger.type === 'webhook' && workflow.trigger.config.endpoint) {
      this.registerWebhookHandler(workflow);
    }
    
    console.log(`Registered workflow: ${workflow.name}`);
  }

  async executeWorkflow(workflowId: string, context: any = {}): Promise<any> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow is disabled: ${workflowId}`);
    }

    this.emit('workflow.started', workflow, context);
    this.stats.workflowsExecuted++;

    // Notify via WebSocket
    this.wsManager?.notifyWorkflowStarted(workflow, context);

    try {
      const result = await this.executeWorkflowSteps(workflow, context);
      this.emit('workflow.completed', workflow, result);
      this.wsManager?.notifyWorkflowCompleted(workflow, result);
      return result;
    } catch (error) {
      this.emit('workflow.failed', workflow, error);
      this.wsManager?.notifyWorkflowFailed(workflow, error as Error);
      throw error;
    }
  }

  // Statistics and Monitoring
  getStats(): OrchestratorStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime.getTime(),
      lastActivity: new Date(),
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      queue: boolean;
      worker: boolean;
      scheduledJobs: number;
      workflows: number;
    };
  }> {
    try {
      const queueHealth = await this.eventQueue.isPaused();
      const workerHealth = !this.worker.isRunning();
      
      return {
        status: (!queueHealth && !workerHealth) ? 'healthy' : 'degraded',
        details: {
          queue: !queueHealth,
          worker: !workerHealth,
          scheduledJobs: this.scheduledJobs.size,
          workflows: this.workflows.size,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          queue: false,
          worker: false,
          scheduledJobs: 0,
          workflows: 0,
        },
      };
    }
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Orchestration Engine...');

    // Stop all scheduled jobs
    for (const [id, job] of this.scheduledJobs.entries()) {
      job.stop();
    }
    this.scheduledJobs.clear();

    // Stop webhook server
    if (this.webhookServer) {
      console.log('Stopping webhook server...');
      // Assume we have the server instance stored somewhere to close it
    }

    // Stop WebSocket manager
    if (this.wsManager) {
      await this.wsManager.shutdown();
    }

    // Close BullMQ components
    await this.worker.close();
    await this.eventQueue.close();

    // Clear subscriptions
    this.subscriptions.clear();
    this.webhookHandlers.clear();

    // Remove all listeners
    this.removeAllListeners();

    this.isInitialized = false;
    console.log('Orchestration Engine shutdown complete');
  }

  // WebSocket Management

  private setupWebSocketManager(): void {
    const wsPort = parseInt(process.env.WEBSOCKET_PORT || '3002');
    this.wsManager = new WebSocketManager(wsPort);

    // Forward events to WebSocket clients
    this.on('event.processed', (event) => {
      this.wsManager?.notifyEventProcessed(event);
    });

    this.on('workflow.started', (workflow, context) => {
      this.wsManager?.notifyWorkflowStarted(workflow, context);
    });

    this.on('workflow.completed', (workflow, result) => {
      this.wsManager?.notifyWorkflowCompleted(workflow, result);
    });

    this.on('workflow.failed', (workflow, error) => {
      this.wsManager?.notifyWorkflowFailed(workflow, error);
    });

    this.on('agent.response', (response) => {
      this.wsManager?.notifyAgentResponse(response);
    });

    this.on('tool.called', (toolCall) => {
      this.wsManager?.notifyToolCall(toolCall);
    });
  }

  getWebSocketStats() {
    return this.wsManager?.getStats();
  }

  // Webhook Management

  private async setupWebhookHandlers(): Promise<void> {
    if (!this.webhookServer) {
      this.webhookServer = express();
      this.webhookServer.use(express.json());
      this.webhookServer.use(express.raw({ type: 'application/octet-stream' }));
    }

    const port = process.env.WEBHOOK_PORT || 3001;
    this.webhookServer.listen(port, () => {
      console.log(`Webhook server listening on port ${port}`);
    });

    // Setup existing webhook handlers for registered workflows
    for (const workflow of this.workflows.values()) {
      if (workflow.trigger.type === 'webhook' && workflow.trigger.config.endpoint) {
        this.registerWebhookHandler(workflow);
      }
    }
  }

  private registerWebhookHandler(workflow: WorkflowPattern): void {
    if (!this.webhookServer || !workflow.trigger.config.endpoint) {
      return;
    }

    const endpoint = workflow.trigger.config.endpoint;
    this.webhookHandlers.set(endpoint, workflow);

    // Register the webhook endpoint
    this.webhookServer.post(endpoint, async (req, res) => {
      try {
        const webhookConfig = workflow.trigger.config.webhook;
        
        // Verify webhook signature if secret is provided
        if (webhookConfig?.secret) {
          const isValid = this.verifyWebhookSignature(req, webhookConfig.secret);
          if (!isValid) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
          }
        }

        // Execute the workflow with webhook payload as context
        const context = {
          webhook: {
            headers: req.headers,
            body: req.body,
            query: req.query
          },
          trigger: 'webhook'
        };

        await this.executeWorkflow(workflow.id, context);
        
        res.status(200).json({ success: true, workflowId: workflow.id });
      } catch (error) {
        console.error(`Webhook handler failed for ${endpoint}:`, error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });

    console.log(`Registered webhook handler: ${endpoint} -> ${workflow.name}`);
  }

  private verifyWebhookSignature(req: any, secret: string): boolean {
    const signature = req.headers['x-signature'] || req.headers['x-hub-signature'];
    if (!signature) return false;

    const payload = JSON.stringify(req.body);
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return signature.includes(expectedSignature);
  }

  async triggerWebhook(config: WebhookConfig, data: any): Promise<boolean> {
    try {
      const response = await fetch(config.endpoint, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(config.timeout || 30000)
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook trigger failed:', error);
      return false;
    }
  }

  // Private Methods

  private async processEvent(job: Job): Promise<void> {
    const event = job.data as OrchestrationEvent;
    const startTime = Date.now();

    try {
      // Get subscribers for this event type
      const subscribers = this.subscriptions.get(event.type) || [];
      
      // Process each subscription
      for (const subscription of subscribers) {
        // Apply filter if provided
        if (subscription.filter && !subscription.filter(event)) {
          continue;
        }

        try {
          await subscription.handler(event);
        } catch (error) {
          console.error(`Subscription handler failed for event ${event.id}:`, error);
          this.emit('event.failed', event, error as Error);
          this.stats.errors++;
        }
      }

      this.emit('event.processed', event);
      this.stats.eventsProcessed++;
      
      // Update average response time
      const processingTime = Date.now() - startTime;
      this.updateAverageResponseTime(processingTime);

      // Notify WebSocket clients
      this.wsManager?.notifyEventProcessed(event);
      
    } catch (error) {
      console.error(`Failed to process event ${event.id}:`, error);
      this.emit('event.failed', event, error as Error);
      this.stats.errors++;
      throw error;
    }
  }

  private async executeWorkflowSteps(workflow: WorkflowPattern, context: any): Promise<any> {
    let result = context;

    for (const step of workflow.steps) {
      try {
        result = await this.executeWorkflowStep(step, result);
      } catch (error) {
        if (step.retries && step.retries > 0) {
          // Implement retry logic
          for (let i = 0; i < step.retries; i++) {
            try {
              await this.delay(this.config.events.retryDelay);
              result = await this.executeWorkflowStep(step, result);
              break; // Success, exit retry loop
            } catch (retryError) {
              if (i === step.retries - 1) {
                throw retryError; // Last retry failed
              }
            }
          }
        } else {
          throw error;
        }
      }
    }

    return result;
  }

  private async executeWorkflowStep(step: WorkflowStep, context: any): Promise<any> {
    const timeout = step.timeout || this.config.agent.timeout;
    
    return Promise.race([
      this.doExecuteWorkflowStep(step, context),
      this.createTimeout(timeout)
    ]);
  }

  private async doExecuteWorkflowStep(step: WorkflowStep, context: any): Promise<any> {
    switch (step.action) {
      case 'emit_event':
        if (step.config.eventType) {
          await this.emitEvent({
            type: step.config.eventType,
            data: step.config.params || context,
            source: 'workflow'
          });
        }
        return context;

      case 'wait':
        if (step.config.delay) {
          await this.delay(step.config.delay);
        }
        return context;

      case 'call_service':
        // This would integrate with other services
        return await this.callService(step.config.service!, step.config.method!, step.config.params || context);

      case 'condition':
        // Evaluate condition and potentially modify context
        return this.evaluateCondition(step.config.condition!, context);

      case 'tool_use':
        // This would integrate with the RAG agent's tools
        return await this.useTool(step.config.toolName!, step.config.params || context);

      default:
        throw new Error(`Unknown workflow step action: ${step.action}`);
    }
  }

  private async registerDefaultWorkflows(): Promise<void> {
    // Daily source scan workflow
    const dailyScanWorkflow: WorkflowPattern = {
      id: 'daily-source-scan',
      name: 'Daily Source Scan',
      enabled: true,
      trigger: {
        type: 'cron',
        config: {
          cron: '0 0 * * *' // Daily at midnight
        }
      },
      steps: [
        {
          id: 'emit-scan-event',
          action: 'emit_event',
          config: {
            eventType: 'SCAN_SOURCES',
            params: { trigger: 'scheduled' }
          }
        }
      ]
    };

    // Deadline alert workflow
    const deadlineAlertWorkflow: WorkflowPattern = {
      id: 'deadline-alerts',
      name: 'Deadline Alert Check',
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
          id: 'emit-alerts',
          action: 'emit_event',
          config: {
            eventType: 'DEADLINE_ALERT'
          }
        }
      ]
    };

    await this.registerWorkflow(dailyScanWorkflow);
    await this.registerWorkflow(deadlineAlertWorkflow);
  }

  private scheduleWorkflow(workflow: WorkflowPattern): void {
    if (workflow.trigger.type !== 'cron' || !workflow.trigger.config.cron) {
      return;
    }

    const job = new CronJob(
      workflow.trigger.config.cron,
      () => {
        this.executeWorkflow(workflow.id).catch(error => {
          console.error(`Scheduled workflow ${workflow.name} failed:`, error);
        });
      },
      null,
      true,
      'UTC'
    );

    this.scheduledJobs.set(workflow.id, job);
  }

  private async startScheduledTasks(): Promise<void> {
    for (const workflow of this.workflows.values()) {
      if (workflow.enabled && workflow.trigger.type === 'cron') {
        this.scheduleWorkflow(workflow);
      }
    }
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`Event processed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Event processing failed: ${job?.id}`, err);
      this.stats.errors++;
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
      this.emit('error', err);
    });
  }

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception in Orchestrator:', error);
      this.emit('error', error);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection in Orchestrator:', reason);
      this.emit('error', new Error(`Unhandled rejection: ${reason}`));
    });
  }

  // Helper Methods

  private initializeStats(): OrchestratorStats {
    return {
      eventsProcessed: 0,
      workflowsExecuted: 0,
      agentQueries: 0,
      toolCalls: 0,
      errors: 0,
      averageResponseTime: 0,
      uptime: 0,
    };
  }

  private updateAverageResponseTime(newTime: number): void {
    const totalEvents = this.stats.eventsProcessed;
    if (totalEvents === 0) {
      this.stats.averageResponseTime = newTime;
    } else {
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * (totalEvents - 1) + newTime) / totalEvents;
    }
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPriority(priority?: 'low' | 'medium' | 'high'): number {
    switch (priority) {
      case 'high': return 10;
      case 'medium': return 5;
      case 'low': return 1;
      default: return 5;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    );
  }

  private async callService(service: string, method: string, params: any): Promise<any> {
    // This would integrate with other services in the system
    // For now, return a placeholder
    console.log(`Calling service: ${service}.${method}`, params);
    return { success: true, data: params };
  }

  private evaluateCondition(condition: string, context: any): any {
    // Simple condition evaluation - in production, use a proper expression evaluator
    try {
      const func = new Function('context', `return ${condition}`);
      return func(context);
    } catch (error) {
      console.error(`Failed to evaluate condition: ${condition}`, error);
      return context;
    }
  }

  private async useTool(toolName: string, params: any): Promise<any> {
    // This would integrate with the RAG agent's tools
    // For now, return a placeholder
    console.log(`Using tool: ${toolName}`, params);
    return { toolResult: true, data: params };
  }
}