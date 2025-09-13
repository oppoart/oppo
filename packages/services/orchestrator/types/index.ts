export interface OrchestratorConfig {
  scheduling: {
    scanInterval: string;
    alertCheckInterval: string;
    cleanupInterval: string;
    maxConcurrentScans: number;
  };
  agent: {
    model: string;
    maxToolCalls: number;
    timeout: number;
    temperature: number;
    vectorStorePath: string;
    maxTokens?: number;
  };
  events: {
    maxRetries: number;
    retryDelay: number;
    deadLetterQueueSize: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}

export interface OrchestrationEvent {
  id: string;
  type: EventType;
  data: any;
  timestamp: Date;
  source: string;
  retryCount?: number;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export type EventType = 
  | 'SCAN_SOURCES'
  | 'OPPORTUNITY_FOUND'
  | 'OPPORTUNITY_ANALYZED'
  | 'OPPORTUNITY_STORED'
  | 'DEADLINE_ALERT'
  | 'USER_QUERY'
  | 'WORKFLOW_COMPLETE'
  | 'ERROR_OCCURRED';

export interface WorkflowPattern {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  enabled: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: 'cron' | 'event' | 'manual' | 'webhook';
  config: {
    cron?: string;
    eventType?: EventType;
    endpoint?: string;
    webhook?: WebhookConfig;
  };
}

export interface WorkflowStep {
  id: string;
  action: 'call_service' | 'emit_event' | 'wait' | 'condition' | 'tool_use';
  config: {
    service?: string;
    method?: string;
    params?: any;
    eventType?: EventType;
    delay?: number;
    condition?: string;
    toolName?: string;
  };
  retries?: number;
  timeout?: number;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  handler: ToolHandler;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}

export type ToolHandler = (params: any) => Promise<any>;

export interface AgentQuery {
  id: string;
  question: string;
  context?: Record<string, any>;
  maxToolCalls?: number;
  temperature?: number;
  userId?: string;
}

export interface AgentResponse {
  id: string;
  answer: string;
  toolCalls: ToolCall[];
  sources: string[];
  confidence: number;
  processingTime: number;
}

export interface ToolCall {
  toolName: string;
  parameters: any;
  result: any;
  duration: number;
  success: boolean;
  error?: string;
}

export interface OrchestratorEvents {
  'workflow.started': (workflow: WorkflowPattern, context: any) => void;
  'workflow.completed': (workflow: WorkflowPattern, result: any) => void;
  'workflow.failed': (workflow: WorkflowPattern, error: Error) => void;
  'event.processed': (event: OrchestrationEvent) => void;
  'event.failed': (event: OrchestrationEvent, error: Error) => void;
  'agent.query': (query: AgentQuery) => void;
  'agent.response': (response: AgentResponse) => void;
  'tool.called': (call: ToolCall) => void;
  'error': (error: Error) => void;
}

export interface OrchestratorStats {
  eventsProcessed: number;
  workflowsExecuted: number;
  agentQueries: number;
  toolCalls: number;
  errors: number;
  averageResponseTime: number;
  uptime: number;
  lastActivity?: Date;
}

export interface ScheduledTask {
  id: string;
  name: string;
  cron: string;
  enabled: boolean;
  workflowId: string;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  metadata?: Record<string, any>;
}

export interface EventSubscription {
  id: string;
  eventType: EventType;
  handler: (event: OrchestrationEvent) => Promise<void>;
  filter?: (event: OrchestrationEvent) => boolean;
  priority: number;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: Date;
  hits: number;
  createdAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  context: any;
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  steps: WorkflowStepExecution[];
}

export interface WorkflowStepExecution {
  stepId: string;
  status: WorkflowStatus;
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  duration?: number;
}

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WebhookConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  secret?: string;
  timeout?: number;
  retries?: number;
}