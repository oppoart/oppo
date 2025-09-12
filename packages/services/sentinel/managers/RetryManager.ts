import { EventEmitter } from 'events';

/**
 * Retry strategy types
 */
export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_DELAY = 'fixed_delay',
  FIBONACCI = 'fibonacci',
  CUSTOM = 'custom'
}

/**
 * Error types that should be retried
 */
export enum RetryableErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  RATE_LIMITED = 'rate_limited',
  SERVER_ERROR = 'server_error',
  TEMPORARY_FAILURE = 'temporary_failure',
  CONNECTION_ERROR = 'connection_error'
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  strategy: RetryStrategy;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  jitterPercent: number; // 0-100
  retryableErrors: RetryableErrorType[];
  customRetryCondition?: (error: Error, attempt: number) => boolean;
  customDelayFunction?: (attempt: number, baseDelay: number) => number;
  enableMetrics: boolean;
}

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number;
  timestamp: Date;
  error?: Error;
  delay: number;
  success: boolean;
}

/**
 * Retry operation context
 */
export interface RetryContext {
  operationId: string;
  operationName: string;
  startTime: Date;
  attempts: RetryAttempt[];
  config: RetryConfig;
  metadata?: Record<string, any>;
}

/**
 * Retry metrics
 */
export interface RetryMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalAttempts: number;
  averageAttempts: number;
  averageRetryTime: number;
  errorTypeBreakdown: Record<RetryableErrorType, number>;
  strategyStats: Record<RetryStrategy, {
    operations: number;
    successRate: number;
    averageAttempts: number;
  }>;
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

interface CircuitBreaker {
  state: CircuitBreakerState;
  failures: number;
  lastFailure: Date;
  nextAttempt: Date;
  threshold: number;
  timeout: number;
}

/**
 * RetryManager handles intelligent retry logic with exponential backoff
 * Prevents overwhelming target servers with failed requests
 */
export class RetryManager extends EventEmitter {
  private defaultConfig: RetryConfig;
  private activeOperations: Map<string, RetryContext> = new Map();
  private completedOperations: RetryContext[] = [];
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private metrics: RetryMetrics;

  constructor(config: Partial<RetryConfig> = {}) {
    super();

    this.defaultConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      backoffMultiplier: 2,
      jitterEnabled: true,
      jitterPercent: 10,
      retryableErrors: [
        RetryableErrorType.NETWORK_ERROR,
        RetryableErrorType.TIMEOUT,
        RetryableErrorType.RATE_LIMITED,
        RetryableErrorType.SERVER_ERROR,
        RetryableErrorType.TEMPORARY_FAILURE,
        RetryableErrorType.CONNECTION_ERROR
      ],
      enableMetrics: true,
      ...config
    };

    this.metrics = this.initializeMetrics();
  }

  /**
   * Execute an operation with retry logic
   */
  async executeWithRetry<T>(
    operationName: string,
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    const context: RetryContext = {
      operationId,
      operationName,
      startTime: new Date(),
      attempts: [],
      config: mergedConfig,
      metadata: {}
    };

    this.activeOperations.set(operationId, context);
    this.metrics.totalOperations++;

    try {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(operationName)) {
        throw new Error(`Circuit breaker is open for operation: ${operationName}`);
      }

      const result = await this.attemptOperation(operation, context);
      
      // Operation succeeded
      this.metrics.successfulOperations++;
      this.recordSuccess(operationName);
      this.emit('operationSucceeded', context);
      
      return result;

    } catch (error) {
      // All retries failed
      this.metrics.failedOperations++;
      this.recordFailure(operationName);
      this.emit('operationFailed', context, error);
      
      throw error;

    } finally {
      // Move to completed operations
      this.activeOperations.delete(operationId);
      this.completedOperations.push(context);
      
      // Update metrics
      if (this.defaultConfig.enableMetrics) {
        this.updateMetrics(context);
      }

      // Clean up old completed operations
      this.cleanupOldOperations();
    }
  }

  /**
   * Create a retry wrapper function
   */
  createRetryWrapper<T extends any[], R>(
    operationName: string,
    originalFunction: (...args: T) => Promise<R>,
    config: Partial<RetryConfig> = {}
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      return this.executeWithRetry(
        operationName,
        () => originalFunction(...args),
        config
      );
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active operations
   */
  getActiveOperations(): RetryContext[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Get completed operations (recent)
   */
  getCompletedOperations(limit: number = 100): RetryContext[] {
    return this.completedOperations.slice(-limit);
  }

  /**
   * Check if a specific error should be retried
   */
  shouldRetryError(error: Error, config: RetryConfig = this.defaultConfig): boolean {
    // Check custom retry condition first
    if (config.customRetryCondition) {
      return config.customRetryCondition(error, 0);
    }

    // Check error type
    const errorType = this.classifyError(error);
    return config.retryableErrors.includes(errorType);
  }

  /**
   * Calculate delay for next retry attempt
   */
  calculateDelay(
    attempt: number,
    config: RetryConfig = this.defaultConfig
  ): number {
    let delay: number;

    if (config.customDelayFunction) {
      delay = config.customDelayFunction(attempt, config.baseDelay);
    } else {
      switch (config.strategy) {
        case RetryStrategy.EXPONENTIAL_BACKOFF:
          delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
          break;
          
        case RetryStrategy.LINEAR_BACKOFF:
          delay = config.baseDelay * attempt;
          break;
          
        case RetryStrategy.FIXED_DELAY:
          delay = config.baseDelay;
          break;
          
        case RetryStrategy.FIBONACCI:
          delay = config.baseDelay * this.fibonacci(attempt);
          break;
          
        default:
          delay = config.baseDelay;
      }
    }

    // Apply max delay limit
    delay = Math.min(delay, config.maxDelay);

    // Apply jitter if enabled
    if (config.jitterEnabled) {
      const jitterAmount = delay * (config.jitterPercent / 100);
      const jitterOffset = (Math.random() - 0.5) * 2 * jitterAmount;
      delay += jitterOffset;
    }

    return Math.max(0, Math.round(delay));
  }

  /**
   * Reset circuit breaker for an operation
   */
  resetCircuitBreaker(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.state = CircuitBreakerState.CLOSED;
      breaker.failures = 0;
      this.emit('circuitBreakerReset', operationName);
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(operationName: string): {
    state: CircuitBreakerState;
    failures: number;
    nextAttempt?: Date;
  } | null {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) return null;

    return {
      state: breaker.state,
      failures: breaker.failures,
      nextAttempt: breaker.state === CircuitBreakerState.OPEN ? breaker.nextAttempt : undefined
    };
  }

  /**
   * Update default configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.defaultConfig };
  }

  // =====================================
  // Private methods
  // =====================================

  /**
   * Attempt operation with retries
   */
  private async attemptOperation<T>(
    operation: () => Promise<T>,
    context: RetryContext
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= context.config.maxAttempts; attempt++) {
      const attemptStart = new Date();
      
      try {
        // Execute the operation
        const result = await operation();
        
        // Success! Record the attempt
        const attemptInfo: RetryAttempt = {
          attemptNumber: attempt,
          timestamp: attemptStart,
          delay: 0,
          success: true
        };
        
        context.attempts.push(attemptInfo);
        this.metrics.totalAttempts++;
        
        this.emit('attemptSucceeded', context, attempt);
        
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Record the failed attempt
        const attemptInfo: RetryAttempt = {
          attemptNumber: attempt,
          timestamp: attemptStart,
          error: lastError,
          delay: 0,
          success: false
        };
        
        context.attempts.push(attemptInfo);
        this.metrics.totalAttempts++;
        
        // Check if we should retry this error
        if (!this.shouldRetryError(lastError, context.config)) {
          this.emit('attemptFailed', context, attempt, lastError);
          throw lastError;
        }

        // Check if this is the last attempt
        if (attempt >= context.config.maxAttempts) {
          this.emit('attemptFailed', context, attempt, lastError);
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, context.config);
        attemptInfo.delay = delay;

        this.emit('attemptFailed', context, attempt, lastError);
        console.log(
          `Retry attempt ${attempt}/${context.config.maxAttempts} failed for ${context.operationName}. ` +
          `Retrying in ${delay}ms. Error: ${lastError.message}`
        );

        // Wait before next attempt
        if (delay > 0) {
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Classify error type for retry decisions
   */
  private classifyError(error: Error): RetryableErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('enotfound') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      name.includes('networkerror')
    ) {
      return RetryableErrorType.NETWORK_ERROR;
    }

    // Timeout errors
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      name.includes('timeout')
    ) {
      return RetryableErrorType.TIMEOUT;
    }

    // Rate limiting
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429')
    ) {
      return RetryableErrorType.RATE_LIMITED;
    }

    // Server errors (5xx)
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('server error') ||
      message.includes('internal server error') ||
      message.includes('bad gateway') ||
      message.includes('service unavailable') ||
      message.includes('gateway timeout')
    ) {
      return RetryableErrorType.SERVER_ERROR;
    }

    // Connection errors
    if (
      message.includes('connection') ||
      message.includes('socket') ||
      message.includes('econnaborted')
    ) {
      return RetryableErrorType.CONNECTION_ERROR;
    }

    // Default to temporary failure
    return RetryableErrorType.TEMPORARY_FAILURE;
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(operationName: string): boolean {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) return false;

    if (breaker.state === CircuitBreakerState.OPEN) {
      // Check if we should transition to half-open
      if (new Date() >= breaker.nextAttempt) {
        breaker.state = CircuitBreakerState.HALF_OPEN;
        this.emit('circuitBreakerHalfOpen', operationName);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record operation success for circuit breaker
   */
  private recordSuccess(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      if (breaker.state === CircuitBreakerState.HALF_OPEN) {
        breaker.state = CircuitBreakerState.CLOSED;
        breaker.failures = 0;
        this.emit('circuitBreakerClosed', operationName);
      }
    }
  }

  /**
   * Record operation failure for circuit breaker
   */
  private recordFailure(operationName: string): void {
    let breaker = this.circuitBreakers.get(operationName);
    
    if (!breaker) {
      breaker = {
        state: CircuitBreakerState.CLOSED,
        failures: 0,
        lastFailure: new Date(),
        nextAttempt: new Date(),
        threshold: 5, // Open after 5 failures
        timeout: 60000 // 1 minute timeout
      };
      this.circuitBreakers.set(operationName, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = new Date();

    if (breaker.failures >= breaker.threshold && breaker.state === CircuitBreakerState.CLOSED) {
      breaker.state = CircuitBreakerState.OPEN;
      breaker.nextAttempt = new Date(Date.now() + breaker.timeout);
      this.emit('circuitBreakerOpened', operationName);
    }
  }

  /**
   * Calculate fibonacci number for fibonacci backoff
   */
  private fibonacci(n: number): number {
    if (n <= 1) return n;
    
    let a = 0;
    let b = 1;
    
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    
    return b;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): RetryMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalAttempts: 0,
      averageAttempts: 0,
      averageRetryTime: 0,
      errorTypeBreakdown: {} as Record<RetryableErrorType, number>,
      strategyStats: {} as Record<RetryStrategy, {
        operations: number;
        successRate: number;
        averageAttempts: number;
      }>
    };
  }

  /**
   * Update metrics with completed operation
   */
  private updateMetrics(context: RetryContext): void {
    const totalTime = new Date().getTime() - context.startTime.getTime();
    const attempts = context.attempts.length;

    // Update averages
    this.metrics.averageAttempts = 
      ((this.metrics.averageAttempts * (this.metrics.totalOperations - 1)) + attempts) / 
      this.metrics.totalOperations;

    this.metrics.averageRetryTime =
      ((this.metrics.averageRetryTime * (this.metrics.totalOperations - 1)) + totalTime) /
      this.metrics.totalOperations;

    // Update error type breakdown
    for (const attempt of context.attempts) {
      if (attempt.error) {
        const errorType = this.classifyError(attempt.error);
        this.metrics.errorTypeBreakdown[errorType] = 
          (this.metrics.errorTypeBreakdown[errorType] || 0) + 1;
      }
    }

    // Update strategy stats
    const strategy = context.config.strategy;
    if (!this.metrics.strategyStats[strategy]) {
      this.metrics.strategyStats[strategy] = {
        operations: 0,
        successRate: 0,
        averageAttempts: 0
      };
    }

    const strategyStats = this.metrics.strategyStats[strategy];
    strategyStats.operations++;
    
    const wasSuccessful = context.attempts[context.attempts.length - 1]?.success || false;
    strategyStats.successRate = 
      ((strategyStats.successRate * (strategyStats.operations - 1)) + (wasSuccessful ? 1 : 0)) /
      strategyStats.operations;

    strategyStats.averageAttempts =
      ((strategyStats.averageAttempts * (strategyStats.operations - 1)) + attempts) /
      strategyStats.operations;
  }

  /**
   * Clean up old completed operations to prevent memory leaks
   */
  private cleanupOldOperations(): void {
    const maxOperations = 1000;
    if (this.completedOperations.length > maxOperations) {
      this.completedOperations = this.completedOperations.slice(-maxOperations / 2);
    }
  }
}