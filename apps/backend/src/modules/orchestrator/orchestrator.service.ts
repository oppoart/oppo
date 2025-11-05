import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderManager, UseCase } from '@oppo/provider-manager';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private providerManager: ProviderManager;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    // Initialize ProviderManager with config from environment
    this.providerManager = new ProviderManager({
      openai: {
        apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        defaultModel: this.configService.get<string>('AI_MODEL_PRIMARY') || 'gpt-4',
      },
      anthropic: {
        apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
      },
    });
    this.logger.log('Orchestrator service initialized with ProviderManager');
  }

  // Scheduled tasks
  @Cron(CronExpression.EVERY_HOUR)
  async runHourlyTasks() {
    this.logger.log('Running hourly tasks');
    
    // Trigger sentinel to check sources
    this.eventEmitter.emit('sentinel.check_sources', {
      type: 'scheduled',
      frequency: 'hourly',
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyTasks() {
    this.logger.log('Running daily tasks');
    
    // Trigger archivist maintenance
    this.eventEmitter.emit('archivist.run_maintenance', {
      type: 'scheduled',
      frequency: 'daily',
    });
  }

  // Event orchestration
  @OnEvent('orchestrator.opportunity_discovered')
  async handleOpportunityDiscovered(opportunity: any) {
    this.logger.log('Orchestrating opportunity processing', { opportunityId: opportunity.id });
    
    // Step 1: Store in archivist
    this.eventEmitter.emit('archivist.store_opportunity', opportunity);
    
    // Step 2: Analyze with analyst
    this.eventEmitter.emit('analyst.analyze_opportunity', opportunity);
  }

  @OnEvent('orchestrator.opportunity_analyzed')
  async handleOpportunityAnalyzed(opportunity: any) {
    this.logger.log('Opportunity analyzed', { 
      opportunityId: opportunity.id,
      relevanceScore: opportunity.relevanceScore,
    });
    
    // If high relevance, notify user
    if (opportunity.relevanceScore > 0.7) {
      this.eventEmitter.emit('liaison.notify_user', {
        userId: opportunity.userId,
        type: 'high_relevance_opportunity',
        opportunity,
      });
    }
  }

  // Workflow execution
  async executeWorkflow(workflowId: string, context: any) {
    this.logger.log('Executing workflow', { workflowId });
    
    // TODO: Implement workflow execution
    return {
      success: true,
      workflowId,
      executionId: Math.random().toString(),
      status: 'completed',
    };
  }

  async createWorkflow(workflow: any) {
    // TODO: Implement workflow creation
    return {
      id: Math.random().toString(),
      ...workflow,
      created: new Date(),
    };
  }

  async getWorkflows() {
    // TODO: Implement workflow retrieval
    return [];
  }

  // RAG Agent interaction
  async queryRAGAgent(query: string, context?: any) {
    this.logger.log('Querying RAG agent with ProviderManager', { query });

    try {
      // Build context-aware prompt
      const contextInfo = context
        ? `\n\nContext: ${JSON.stringify(context, null, 2)}`
        : '';

      const prompt = `You are an AI assistant helping artists find opportunities. Answer the following question based on the provided context.

Question: ${query}${contextInfo}

Please provide a helpful, accurate response.`;

      // Use ProviderManager to generate response
      const response = await this.providerManager.generate(prompt, UseCase.RAG_QUERY, {
        temperature: 0.7,
        maxTokens: 500,
      });

      this.logger.log(
        `✅ RAG query completed using ${response.provider} (cost: $${response.cost?.toFixed(4) || 0})`
      );

      // Log cost tracking
      if (response.cost) {
        this.logger.log(`💰 Cost tracking - Provider: ${response.provider}, Cost: $${response.cost.toFixed(4)}`);
      }

      return {
        response: response.text,
        confidence: 0.8, // Can be enhanced with confidence scoring
        sources: [],
        provider: response.provider,
        cost: response.cost,
      };
    } catch (error) {
      this.logger.error(`❌ RAG query failed: ${error.message}`);
      throw new Error(`RAG agent query failed: ${error.message}`);
    }
  }

  async trainRAGAgent(documents: any[]) {
    this.logger.log('Training RAG agent', { documentCount: documents.length });
    
    // TODO: Implement RAG agent training
    return {
      success: true,
      documentsProcessed: documents.length,
    };
  }

  // System health and status
  async getSystemStatus() {
    return {
      status: 'healthy',
      modules: {
        orchestrator: 'active',
        sentinel: 'active',
        analyst: 'active',
        archivist: 'active',
        liaison: 'active',
      },
      lastCheck: new Date(),
    };
  }

  async getActivityLog(limit: number = 100) {
    return this.prisma.userActivity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Missing methods for controller
  async startWorkflow(workflowType: string, params: any) {
    this.logger.log('Starting workflow', { workflowType, params });
    
    // TODO: Implement workflow start logic
    return {
      id: Math.random().toString(),
      type: workflowType,
      status: 'running',
      startedAt: new Date(),
      params,
    };
  }

  async stopWorkflow(workflowId: string) {
    this.logger.log('Stopping workflow', { workflowId });
    
    // TODO: Implement workflow stop logic
    return {
      id: workflowId,
      status: 'stopped',
      stoppedAt: new Date(),
    };
  }

  async getWorkflowStatus(workflowId: string) {
    this.logger.log('Getting workflow status', { workflowId });
    
    // TODO: Implement workflow status retrieval
    return {
      id: workflowId,
      status: 'running',
      progress: 0.5,
      lastUpdated: new Date(),
    };
  }

  async scheduleTask(taskType: string, schedule: string, params: any) {
    this.logger.log('Scheduling task', { taskType, schedule, params });
    
    // TODO: Implement task scheduling
    return {
      id: Math.random().toString(),
      type: taskType,
      schedule,
      params,
      nextRun: new Date(),
      created: new Date(),
    };
  }

  async getScheduledTasks() {
    this.logger.log('Getting scheduled tasks');
    
    // TODO: Implement scheduled tasks retrieval
    return [
      {
        id: '1',
        type: 'discovery',
        schedule: '0 */6 * * *',
        nextRun: new Date(),
        lastRun: new Date(),
      },
      {
        id: '2',
        type: 'maintenance',
        schedule: '0 0 * * *',
        nextRun: new Date(),
        lastRun: new Date(),
      },
    ];
  }

  async queryAgent(question: string, context?: any) {
    return this.queryRAGAgent(question, context);
  }

  async getAgentMetrics() {
    this.logger.log('Getting agent metrics');
    
    // TODO: Implement agent metrics retrieval
    return {
      totalQueries: 0,
      averageResponseTime: 0,
      accuracy: 0,
      lastTraining: null,
      documentsIndexed: 0,
    };
  }
}