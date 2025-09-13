import { RESEARCH_SESSION_STATUSES } from '../../../../../packages/shared/src/constants/research.constants';

export interface ResearchSession {
  id: string;
  serviceId: string;
  profileId: string;
  status: keyof typeof RESEARCH_SESSION_STATUSES;
  progress: number;
  results: any[];
  error?: string;
  startedAt: Date;
  updatedAt: Date;
  options?: Record<string, any>;
}

export interface ServiceExecutionOptions {
  maxQueries?: number;
  limit?: number;
  priority?: 'low' | 'medium' | 'high';
  opportunityTypes?: string[];
  locations?: string[];
  sources?: string[];
}

export interface ServiceExecutionResult {
  data: any;
  metadata?: {
    executionTime: number;
    itemsProcessed: number;
    errors?: string[];
  };
}

export interface ServiceExecutor {
  execute(profileId: string, options?: ServiceExecutionOptions): Promise<ServiceExecutionResult>;
  validate(options?: ServiceExecutionOptions): boolean;
  getServiceId(): string;
}

export interface SessionManagerOptions {
  cleanupInterval?: number;
  sessionTimeout?: number;
  maxSessions?: number;
}

export interface ResearchServiceConfig {
  sessionManager: SessionManagerOptions;
  defaultOptions: ServiceExecutionOptions;
  enableMetrics?: boolean;
  enableLogging?: boolean;
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  failedSessions: number;
  averageExecutionTime: number;
}

export interface ServiceHealth {
  serviceId: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime?: number;
  errorRate?: number;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  serviceIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeResults?: boolean;
}

export interface ExportData {
  profile: {
    id: string;
    name: string;
  };
  exportDate: string;
  services: {
    serviceId: string;
    sessionId: string;
    status: string;
    resultsCount: number;
    startedAt: Date;
    results?: any[];
  }[];
  totalResults: number;
  metadata?: {
    exportFormat: string;
    generatedBy: string;
    version: string;
  };
}

export type SessionStatusUpdate = (
  sessionId: string,
  status: keyof typeof RESEARCH_SESSION_STATUSES,
  progress?: number,
  error?: string
) => void;

export type ProgressCallback = (sessionId: string, progress: number) => void;