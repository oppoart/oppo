import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import {
  VectorStoreIndex,
  Document,
  Settings,
  OpenAI,
  serviceContextFromDefaults,
  RetrieverQueryEngine,
  Response,
  TextNode,
  NodeWithScore
} from 'llamaindex';
import {
  OrchestratorConfig,
  AgentQuery,
  AgentResponse,
  Tool,
  ToolCall,
  OrchestratorEvents,
  CacheEntry
} from '../types';

export class RAGAgent extends EventEmitter {
  private config: OrchestratorConfig['agent'];
  private prisma: PrismaClient;
  private index?: VectorStoreIndex;
  private queryEngine?: RetrieverQueryEngine;
  private tools: Map<string, Tool> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private isInitialized: boolean = false;
  private documents: Document[] = [];

  constructor(
    prisma: PrismaClient,
    config: OrchestratorConfig['agent']
  ) {
    super();
    this.prisma = prisma;
    this.config = config;

    // Setup cache cleanup interval
    setInterval(() => this.cleanupCache(), 60000); // Every minute
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing RAG Agent...');

    try {
      // Configure LlamaIndex settings
      this.configureLlamaIndex();
      
      // Load and index documents
      await this.loadDocuments();
      
      // Create vector index
      await this.createVectorIndex();
      
      // Register default tools
      await this.registerDefaultTools();
      
      this.isInitialized = true;
      console.log('RAG Agent initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RAG Agent:', error);
      throw error;
    }
  }

  async query(query: AgentQuery): Promise<AgentResponse> {
    if (!this.isInitialized) {
      throw new Error('RAG Agent is not initialized');
    }

    const startTime = Date.now();
    const toolCalls: ToolCall[] = [];

    this.emit('agent.query', query);

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(query.question, query.context);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Process query with RAG
      let answer = '';
      let sources: string[] = [];
      let confidence = 0.8;

      // Step 1: Initial RAG query
      if (this.queryEngine) {
        const ragResponse = await this.queryEngine.query(query.question);
        answer = ragResponse.response;
        sources = ragResponse.sourceNodes?.map((node: NodeWithScore) => 
          node.node.id_ || 'unknown'
        ) || [];
      }

      // Step 2: Determine if tools are needed
      const toolsNeeded = await this.identifyNeededTools(query.question, answer);
      
      // Step 3: Execute tools if needed
      for (const toolName of toolsNeeded.slice(0, query.maxToolCalls || this.config.maxToolCalls)) {
        const tool = this.tools.get(toolName);
        if (!tool) {
          console.warn(`Tool not found: ${toolName}`);
          continue;
        }

        const toolCall = await this.executeTool(tool, query, answer);
        toolCalls.push(toolCall);

        if (toolCall.success && toolCall.result) {
          // Integrate tool result into answer
          answer = await this.integrateToolResult(answer, toolCall);
          confidence = Math.min(confidence + 0.1, 1.0);
        }
      }

      const response: AgentResponse = {
        id: this.generateResponseId(),
        answer,
        toolCalls,
        sources,
        confidence,
        processingTime: Date.now() - startTime
      };

      // Cache the response
      this.setCache(cacheKey, response);

      this.emit('agent.response', response);
      return response;

    } catch (error) {
      console.error('RAG Agent query failed:', error);
      throw error;
    }
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    console.log(`Registered tool: ${tool.name}`);
  }

  unregisterTool(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }


  // Private Methods

  private configureLlamaIndex(): void {
    // Configure OpenAI
    Settings.llm = new OpenAI({
      model: this.config.model || 'gpt-3.5-turbo',
      temperature: this.config.temperature || 0.7,
      maxTokens: this.config.maxTokens || 1000,
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  private async loadDocuments(): Promise<void> {
    try {
      // Load artist profiles
      const profiles = await this.prisma.artistProfile.findMany({
        include: {
          user: true
        }
      });

      // Load opportunities
      const opportunities = await this.prisma.opportunity.findMany({
        take: 1000,
        orderBy: { createdAt: 'desc' }
      });

      // Convert to LlamaIndex Documents
      this.documents = [
        // Profile documents
        ...profiles.map(profile => new Document({
          text: this.profileToText(profile),
          id_: `profile_${profile.id}`,
          metadata: {
            type: 'profile',
            id: profile.id,
            userId: profile.userId
          }
        })),
        
        // Opportunity documents
        ...opportunities.map(opp => new Document({
          text: this.opportunityToText(opp),
          id_: `opportunity_${opp.id}`,
          metadata: {
            type: 'opportunity',
            id: opp.id,
            relevanceScore: opp.relevanceScore,
            status: opp.status,
            deadline: opp.deadline
          }
        }))
      ];
      
      console.log(`Loaded ${this.documents.length} documents`);
    } catch (error) {
      console.error('Failed to load documents:', error);
      throw error;
    }
  }

  private async createVectorIndex(): Promise<void> {
    try {
      // Create vector store index from documents
      this.index = await VectorStoreIndex.fromDocuments(this.documents);
      
      // Create query engine
      this.queryEngine = this.index.asQueryEngine({
        similarityTopK: 5,
        responseMode: 'compact'
      });
      
      console.log('Vector index created successfully');
    } catch (error) {
      console.error('Failed to create vector index:', error);
      throw error;
    }
  }

  async reindexDocuments(): Promise<void> {
    console.log('Reindexing documents...');
    await this.loadDocuments();
    await this.createVectorIndex();
    console.log('Documents reindexed successfully');
  }

  private profileToText(profile: any): string {
    return `Artist Profile: ${profile.bio || ''} 
            Artistic Practice: ${profile.artisticPractice || ''}
            Medium: ${profile.medium || ''}
            Career Stage: ${profile.careerStage || ''}
            Location: ${profile.location || ''}
            Website: ${profile.website || ''}`;
  }

  private opportunityToText(opportunity: any): string {
    return `Opportunity: ${opportunity.title || ''}
            Organization: ${opportunity.organization || ''}
            Description: ${opportunity.description || ''}
            Type: ${opportunity.type || ''}
            Deadline: ${opportunity.deadline || ''}
            Status: ${opportunity.status || ''}
            Relevance Score: ${opportunity.relevanceScore || 0}`;
  }

  private async registerDefaultTools(): Promise<void> {
    // Database query tools
    this.registerTool({
      name: 'get_upcoming_deadline_opportunities',
      description: 'Get opportunities with deadlines within specified days',
      parameters: [
        {
          name: 'days',
          type: 'number',
          description: 'Number of days to look ahead',
          required: false,
          default: 7
        }
      ],
      handler: async (params) => {
        const days = params.days || 7;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const opportunities = await this.prisma.opportunity.findMany({
          where: {
            deadline: {
              gte: new Date(),
              lte: futureDate
            }
          },
          orderBy: { deadline: 'asc' }
        });

        return {
          opportunities,
          count: opportunities.length,
          dateRange: `${new Date().toISOString().split('T')[0]} to ${futureDate.toISOString().split('T')[0]}`
        };
      }
    });

    this.registerTool({
      name: 'get_high_relevance_opportunities',
      description: 'Get opportunities above relevance threshold',
      parameters: [
        {
          name: 'threshold',
          type: 'number',
          description: 'Minimum relevance score (0-100)',
          required: false,
          default: 80
        }
      ],
      handler: async (params) => {
        const threshold = params.threshold || 80;
        
        const opportunities = await this.prisma.opportunity.findMany({
          where: {
            relevanceScore: {
              gte: threshold
            }
          },
          orderBy: { relevanceScore: 'desc' },
          take: 20
        });

        return {
          opportunities,
          count: opportunities.length,
          threshold
        };
      }
    });

    this.registerTool({
      name: 'get_opportunities_by_status',
      description: 'Get opportunities filtered by status',
      parameters: [
        {
          name: 'status',
          type: 'string',
          description: 'Status to filter by',
          required: true
        }
      ],
      handler: async (params) => {
        const opportunities = await this.prisma.opportunity.findMany({
          where: {
            status: params.status
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        });

        return {
          opportunities,
          count: opportunities.length,
          status: params.status
        };
      }
    });

    // Analysis tools
    this.registerTool({
      name: 'summarize_opportunity',
      description: 'Create a concise summary of an opportunity',
      parameters: [
        {
          name: 'id',
          type: 'string',
          description: 'Opportunity ID',
          required: true
        }
      ],
      handler: async (params) => {
        const opportunity = await this.prisma.opportunity.findUnique({
          where: { id: params.id }
        });

        if (!opportunity) {
          throw new Error(`Opportunity not found: ${params.id}`);
        }

        const summary = {
          title: opportunity.title,
          organization: opportunity.organization,
          type: opportunity.type,
          deadline: opportunity.deadline,
          relevanceScore: opportunity.relevanceScore,
          status: opportunity.status,
          keyPoints: this.extractKeyPoints(opportunity.description || ''),
          applicationTips: this.generateApplicationTips(opportunity)
        };

        return summary;
      }
    });

    this.registerTool({
      name: 'compare_opportunities',
      description: 'Compare multiple opportunities for best fit',
      parameters: [
        {
          name: 'opportunityIds',
          type: 'array',
          description: 'Array of opportunity IDs to compare',
          required: true
        }
      ],
      handler: async (params) => {
        const opportunities = await this.prisma.opportunity.findMany({
          where: {
            id: { in: params.opportunityIds }
          }
        });

        const comparison = opportunities.map(opp => ({
          id: opp.id,
          title: opp.title,
          relevanceScore: opp.relevanceScore || 0,
          deadline: opp.deadline,
          applicationFee: opp.applicationFee || 0,
          competitiveness: this.assessCompetitiveness(opp),
          fit: this.assessFit(opp)
        }));

        // Sort by combined score
        comparison.sort((a, b) => 
          ((b.relevanceScore + b.fit - b.competitiveness) / 3) - 
          ((a.relevanceScore + a.fit - a.competitiveness) / 3)
        );

        return {
          comparison,
          recommendation: comparison[0],
          count: comparison.length
        };
      }
    });
  }

  private async identifyNeededTools(question: string, currentAnswer: string): Promise<string[]> {
    const tools: string[] = [];
    const questionLower = question.toLowerCase();

    // Simple keyword-based tool identification
    if (questionLower.includes('deadline') || questionLower.includes('due soon')) {
      tools.push('get_upcoming_deadline_opportunities');
    }

    if (questionLower.includes('high') && (questionLower.includes('relevance') || questionLower.includes('score'))) {
      tools.push('get_high_relevance_opportunities');
    }

    if (questionLower.includes('status') || questionLower.includes('applied') || questionLower.includes('reviewing')) {
      tools.push('get_opportunities_by_status');
    }

    if (questionLower.includes('compare') || questionLower.includes('which is better')) {
      tools.push('compare_opportunities');
    }

    if (questionLower.includes('summary') || questionLower.includes('summarize')) {
      tools.push('summarize_opportunity');
    }

    return tools;
  }

  private async executeTool(tool: Tool, query: AgentQuery, currentAnswer: string): Promise<ToolCall> {
    const startTime = Date.now();
    
    try {
      // Extract parameters from query (simplified implementation)
      const params = this.extractToolParameters(tool, query.question, query.context);
      
      const result = await tool.handler(params);
      
      const toolCall: ToolCall = {
        toolName: tool.name,
        parameters: params,
        result,
        duration: Date.now() - startTime,
        success: true
      };

      this.emit('tool.called', toolCall);
      return toolCall;

    } catch (error) {
      const toolCall: ToolCall = {
        toolName: tool.name,
        parameters: {},
        result: null,
        duration: Date.now() - startTime,
        success: false,
        error: (error as Error).message
      };

      this.emit('tool.called', toolCall);
      return toolCall;
    }
  }

  private extractToolParameters(tool: Tool, question: string, context?: any): any {
    const params: any = {};

    // Simple parameter extraction based on tool requirements
    for (const param of tool.parameters) {
      if (param.required && !context?.[param.name]) {
        // Try to extract from question
        if (param.name === 'days' && question.includes('days')) {
          const match = question.match(/(\d+)\s*days?/i);
          if (match) {
            params[param.name] = parseInt(match[1]);
          }
        } else if (param.name === 'status') {
          const statusMatch = question.match(/(new|reviewing|applying|submitted|rejected)/i);
          if (statusMatch) {
            params[param.name] = statusMatch[1].toLowerCase();
          }
        }
      }
      
      // Use default if available and not provided
      if (params[param.name] === undefined && param.default !== undefined) {
        params[param.name] = param.default;
      }
      
      // Use context if available
      if (context && context[param.name] !== undefined) {
        params[param.name] = context[param.name];
      }
    }

    return params;
  }

  private async integrateToolResult(currentAnswer: string, toolCall: ToolCall): Promise<string> {
    if (!toolCall.success || !toolCall.result) {
      return currentAnswer;
    }

    // Simple integration - append tool result
    const toolSummary = this.summarizeToolResult(toolCall);
    return `${currentAnswer}\n\n${toolSummary}`;
  }

  private summarizeToolResult(toolCall: ToolCall): string {
    switch (toolCall.toolName) {
      case 'get_upcoming_deadline_opportunities':
        const deadlines = toolCall.result.opportunities || [];
        return `I found ${deadlines.length} opportunities with upcoming deadlines. ${
          deadlines.slice(0, 3).map((opp: any) => 
            `• ${opp.title} (${opp.organization}) - Due: ${opp.deadline}`
          ).join('\n')
        }`;

      case 'get_high_relevance_opportunities':
        const highRel = toolCall.result.opportunities || [];
        return `I found ${highRel.length} high-relevance opportunities. ${
          highRel.slice(0, 3).map((opp: any) => 
            `• ${opp.title} (Score: ${opp.relevanceScore})`
          ).join('\n')
        }`;

      default:
        return `Tool ${toolCall.toolName} returned: ${JSON.stringify(toolCall.result).substring(0, 200)}...`;
    }
  }

  // Helper methods
  
  private extractKeyPoints(description: string): string[] {
    // Simple key point extraction
    const sentences = description.split('.').filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  private generateApplicationTips(opportunity: any): string[] {
    const tips = [];
    
    if (opportunity.applicationFee && opportunity.applicationFee > 0) {
      tips.push(`Application fee: $${opportunity.applicationFee}`);
    }
    
    if (opportunity.deadline) {
      const daysUntil = Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      tips.push(`${daysUntil} days until deadline - plan accordingly`);
    }
    
    if (opportunity.relevanceScore && opportunity.relevanceScore > 80) {
      tips.push('High relevance match - prioritize this application');
    }
    
    return tips;
  }

  private assessCompetitiveness(opportunity: any): number {
    // Simple competitiveness assessment (0-100)
    let score = 50; // baseline
    
    if (opportunity.applicationFee && opportunity.applicationFee > 50) {
      score += 20; // Higher fees often mean more competitive
    }
    
    if (opportunity.organization && opportunity.organization.includes('Foundation')) {
      score += 15; // Foundations tend to be competitive
    }
    
    return Math.min(score, 100);
  }

  private assessFit(opportunity: any): number {
    // Return relevance score as fit assessment
    return opportunity.relevanceScore || 50;
  }

  // Cache management
  
  private getCacheKey(question: string, context?: any): string {
    const contextStr = context ? JSON.stringify(context) : '';
    return `${question}_${contextStr}`;
  }

  private getFromCache(key: string): AgentResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }
    
    entry.hits++;
    return entry.value;
  }

  private setCache(key: string, value: AgentResponse): void {
    const expiresAt = new Date(Date.now() + 300000); // 5 minutes
    this.cache.set(key, {
      key,
      value,
      expiresAt,
      hits: 0,
      createdAt: new Date()
    });
  }

  private cleanupCache(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  private generateResponseId(): string {
    return `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}