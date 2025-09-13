import { EventEmitter } from 'events';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  SYSTEM = 'system',
  NETWORK = 'network',
  DATABASE = 'database',
  API = 'api',
  VALIDATION = 'validation',
  WORKFLOW = 'workflow',
  AGENT = 'agent',
  SECURITY = 'security'
}

export interface OrchestratorError {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  error: Error;
  context?: any;
  source: string;
  stackTrace?: string;
  resolved: boolean;
  resolvedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface ErrorStats {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCategory: Record<ErrorCategory, number>;
  recent: OrchestratorError[];
  resolved: number;
  unresolved: number;
}

export class ErrorHandler extends EventEmitter {
  private errors: Map<string, OrchestratorError> = new Map();
  private maxStoredErrors: number = 1000;
  private retryDelays: Record<ErrorSeverity, number> = {
    [ErrorSeverity.LOW]: 5000,      // 5 seconds
    [ErrorSeverity.MEDIUM]: 10000,  // 10 seconds
    [ErrorSeverity.HIGH]: 30000,    // 30 seconds
    [ErrorSeverity.CRITICAL]: 60000 // 60 seconds
  };

  constructor() {
    super();
    this.setupGlobalHandlers();
  }

  // Error Handling
  async handleError(
    error: Error,
    category: ErrorCategory,
    severity: ErrorSeverity,
    source: string,
    context?: any
  ): Promise<string> {
    const errorId = this.generateErrorId();
    const orchestratorError: OrchestratorError = {
      id: errorId,
      timestamp: new Date(),
      category,
      severity,
      message: error.message,
      error,
      context,
      source,
      stackTrace: error.stack,
      resolved: false,
      retryCount: 0,
      maxRetries: this.getMaxRetries(severity)
    };

    // Store error
    this.errors.set(errorId, orchestratorError);
    this.maintainErrorStorage();

    // Log error
    this.logError(orchestratorError);

    // Emit error event
    this.emit('error', orchestratorError);

    // Handle based on severity
    await this.processBySeverity(orchestratorError);

    return errorId;
  }

  // Retry Logic
  async retryOperation<T>(
    operation: () => Promise<T>,
    category: ErrorCategory,
    severity: ErrorSeverity,
    source: string,
    maxRetries?: number
  ): Promise<T> {
    const maxAttempts = maxRetries || this.getMaxRetries(severity);
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts) {
          // Final attempt failed
          await this.handleError(lastError, category, severity, source, { 
            attempt, 
            maxAttempts,
            finalAttempt: true 
          });
          throw lastError;
        }

        // Log retry attempt
        console.warn(`Attempt ${attempt}/${maxAttempts} failed for ${source}:`, lastError.message);
        
        // Wait before retry
        const delay = this.calculateRetryDelay(severity, attempt);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  // Error Resolution
  async resolveError(errorId: string, resolution?: string): Promise<boolean> {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.resolved = true;
    error.resolvedAt = new Date();
    if (resolution) {
      error.context = { ...error.context, resolution };
    }

    this.errors.set(errorId, error);
    this.emit('error.resolved', error);

    console.log(`Error ${errorId} resolved: ${error.message}`);
    return true;
  }

  async resolveErrorsBySource(source: string): Promise<number> {
    let resolved = 0;
    for (const [id, error] of this.errors.entries()) {
      if (error.source === source && !error.resolved) {
        await this.resolveError(id, 'Bulk resolution by source');
        resolved++;
      }
    }
    return resolved;
  }

  // Error Recovery Strategies
  async attemptRecovery(error: OrchestratorError): Promise<boolean> {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        return await this.recoverFromNetworkError(error);
      
      case ErrorCategory.DATABASE:
        return await this.recoverFromDatabaseError(error);
      
      case ErrorCategory.API:
        return await this.recoverFromApiError(error);
      
      case ErrorCategory.WORKFLOW:
        return await this.recoverFromWorkflowError(error);
      
      case ErrorCategory.AGENT:
        return await this.recoverFromAgentError(error);
      
      default:
        return false;
    }
  }

  // Error Queries
  getError(id: string): OrchestratorError | undefined {
    return this.errors.get(id);
  }

  getErrorsByCategory(category: ErrorCategory): OrchestratorError[] {
    return Array.from(this.errors.values())
      .filter(error => error.category === category);
  }

  getErrorsBySeverity(severity: ErrorSeverity): OrchestratorError[] {
    return Array.from(this.errors.values())
      .filter(error => error.severity === severity);
  }

  getRecentErrors(hours: number = 24): OrchestratorError[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.errors.values())
      .filter(error => error.timestamp > since)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getUnresolvedErrors(): OrchestratorError[] {
    return Array.from(this.errors.values())
      .filter(error => !error.resolved);
  }

  // Error Statistics
  getErrorStats(): ErrorStats {
    const errors = Array.from(this.errors.values());
    
    const bySeverity = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };

    const byCategory = {
      [ErrorCategory.SYSTEM]: 0,
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.DATABASE]: 0,
      [ErrorCategory.API]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.WORKFLOW]: 0,
      [ErrorCategory.AGENT]: 0,
      [ErrorCategory.SECURITY]: 0
    };

    errors.forEach(error => {
      bySeverity[error.severity]++;
      byCategory[error.category]++;
    });

    const resolved = errors.filter(e => e.resolved).length;
    const recent = this.getRecentErrors(1); // Last hour

    return {
      total: errors.length,
      bySeverity,
      byCategory,
      recent,
      resolved,
      unresolved: errors.length - resolved
    };
  }

  // Health Check
  async healthCheck(): Promise<{
    healthy: boolean;
    criticalErrors: number;
    unresolvedErrors: number;
    errorRate: number; // errors per hour
  }> {
    const stats = this.getErrorStats();
    const criticalErrors = stats.bySeverity[ErrorSeverity.CRITICAL];
    const recentErrors = this.getRecentErrors(1).length;
    
    return {
      healthy: criticalErrors === 0 && stats.unresolved < 10,
      criticalErrors,
      unresolvedErrors: stats.unresolved,
      errorRate: recentErrors
    };
  }

  // Cleanup
  async cleanup(olderThanHours: number = 168): Promise<number> { // Default 7 days
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [id, error] of this.errors.entries()) {
      if (error.timestamp < cutoff && error.resolved) {
        this.errors.delete(id);
        cleaned++;
      }
    }

    console.log(`Cleaned up ${cleaned} resolved errors older than ${olderThanHours} hours`);
    return cleaned;
  }

  // Private Methods

  private setupGlobalHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleError(
        error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.CRITICAL,
        'process.uncaughtException'
      ).catch(console.error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.handleError(
        error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        'process.unhandledRejection'
      ).catch(console.error);
    });
  }

  private async processBySeverity(error: OrchestratorError): Promise<void> {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.emit('critical.error', error);
        // Could send alerts, stop services, etc.
        break;
      
      case ErrorSeverity.HIGH:
        this.emit('high.error', error);
        // Could trigger recovery attempts
        await this.attemptRecovery(error);
        break;
      
      case ErrorSeverity.MEDIUM:
        this.emit('medium.error', error);
        break;
      
      case ErrorSeverity.LOW:
        // Just log, no special action needed
        break;
    }
  }

  private async recoverFromNetworkError(error: OrchestratorError): Promise<boolean> {
    // Implement network recovery logic
    console.log(`Attempting recovery from network error: ${error.id}`);
    // Could include: retry connection, switch endpoints, etc.
    return false;
  }

  private async recoverFromDatabaseError(error: OrchestratorError): Promise<boolean> {
    // Implement database recovery logic
    console.log(`Attempting recovery from database error: ${error.id}`);
    // Could include: reconnect, clear bad connections, etc.
    return false;
  }

  private async recoverFromApiError(error: OrchestratorError): Promise<boolean> {
    // Implement API recovery logic
    console.log(`Attempting recovery from API error: ${error.id}`);
    // Could include: refresh tokens, switch API keys, etc.
    return false;
  }

  private async recoverFromWorkflowError(error: OrchestratorError): Promise<boolean> {
    // Implement workflow recovery logic
    console.log(`Attempting recovery from workflow error: ${error.id}`);
    // Could include: restart workflow, skip failed step, etc.
    return false;
  }

  private async recoverFromAgentError(error: OrchestratorError): Promise<boolean> {
    // Implement agent recovery logic
    console.log(`Attempting recovery from agent error: ${error.id}`);
    // Could include: reset agent state, clear cache, etc.
    return false;
  }

  private logError(error: OrchestratorError): void {
    const logLevel = this.getLogLevel(error.severity);
    const message = `[${error.category.toUpperCase()}] ${error.source}: ${error.message}`;
    
    switch (logLevel) {
      case 'error':
        console.error(message, error.context);
        break;
      case 'warn':
        console.warn(message, error.context);
        break;
      case 'info':
        console.info(message, error.context);
        break;
      default:
        console.log(message, error.context);
    }
  }

  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  private getMaxRetries(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 5;
      case ErrorSeverity.HIGH: return 3;
      case ErrorSeverity.MEDIUM: return 2;
      case ErrorSeverity.LOW: return 1;
      default: return 1;
    }
  }

  private calculateRetryDelay(severity: ErrorSeverity, attempt: number): number {
    const baseDelay = this.retryDelays[severity];
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 300000); // Max 5 minutes
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private maintainErrorStorage(): void {
    if (this.errors.size > this.maxStoredErrors) {
      // Remove oldest resolved errors first
      const sortedErrors = Array.from(this.errors.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
      
      for (const [id, error] of sortedErrors) {
        if (error.resolved && this.errors.size > this.maxStoredErrors * 0.8) {
          this.errors.delete(id);
        }
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}