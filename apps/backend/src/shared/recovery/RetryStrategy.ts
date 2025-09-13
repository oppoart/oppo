import { logger } from '../logging/Logger';
import { AppError } from '../errors/AppError';
import { ErrorCodes, isRetryableError } from '../errors/ErrorCodes';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  context?: Record<string, any>;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalTime: number;
  errors: Error[];
}

export class RetryStrategy {
  private config: Required<RetryConfig>;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      initialDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error: Error) => this.isRetryableByDefault(error),
      onRetry: () => {},
      context: {},
      ...config,
    };
  }

  async execute<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let lastError: Error = new Error('No error occurred');

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if not first attempt
        if (attempt > 1) {
          logger.info('Operation succeeded after retry', {
            operationName,
            attempt,
            totalTime: Date.now() - startTime,
            previousErrors: errors.length,
            ...this.config.context,
          });
        }

        return {
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          errors,
        };
      } catch (error) {
        lastError = error as Error;
        errors.push(lastError);

        // Check if we should retry
        if (attempt === this.config.maxAttempts || !this.config.retryCondition(lastError)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);

        // Log retry attempt
        logger.warn('Operation failed, retrying', {
          operationName,
          attempt,
          maxAttempts: this.config.maxAttempts,
          error: lastError.message,
          delayMs: delay,
          ...this.config.context,
        });

        // Call retry callback
        this.config.onRetry(attempt, lastError, delay);

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    // All attempts failed
    const totalTime = Date.now() - startTime;
    
    logger.error('Operation failed after all retry attempts', {
      operationName,
      attempts: this.config.maxAttempts,
      totalTime,
      finalError: lastError!.message,
      allErrors: errors.map(e => e.message),
      ...this.config.context,
    });

    throw new AppError(
      `Operation failed after ${this.config.maxAttempts} attempts: ${lastError!.message}`,
      500,
      ErrorCodes.INTERNAL_SERVER_ERROR,
      {
        metadata: {
          operationName,
          attempts: this.config.maxAttempts,
          totalTime,
          originalError: lastError,
          ...this.config.context,
        }
      }
    );
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff: initialDelay * backoffMultiplier^(attempt-1)
    let delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Cap at maxDelay
    delay = Math.min(delay, this.config.maxDelay);
    
    // Add jitter to avoid thundering herd
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetryableByDefault(error: Error): boolean {
    // Check if it's an AppError with retryable code
    if (error instanceof AppError) {
      return error.isRetryable;
    }

    // Network errors
    if (error.name === 'ENOTFOUND' || 
        error.name === 'ECONNREFUSED' || 
        error.name === 'ETIMEDOUT' ||
        error.name === 'ECONNRESET') {
      return true;
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return true;
    }

    // HTTP errors (if using axios or similar)
    const httpError = error as any;
    if (httpError.response?.status) {
      const status = httpError.response.status;
      // Retry on server errors and some client errors
      return status >= 500 || status === 408 || status === 429;
    }

    // Database connection errors
    if (error.message.includes('connection') && error.message.includes('database')) {
      return true;
    }

    return false;
  }
}

// Predefined retry strategies
export const RetryStrategies = {
  // Quick retry for fast operations
  quick: new RetryStrategy({
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitter: true,
  }),

  // Standard retry for most operations
  standard: new RetryStrategy({
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
  }),

  // Aggressive retry for critical operations
  aggressive: new RetryStrategy({
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  }),

  // Database operations
  database: new RetryStrategy({
    maxAttempts: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitter: true,
    retryCondition: (error: Error) => {
      if (error instanceof AppError) {
        return isRetryableError(error.code);
      }
      // Retry on connection errors, timeouts, deadlocks
      return error.message.includes('connection') ||
             error.message.includes('timeout') ||
             error.message.includes('deadlock') ||
             error.message.includes('P1001') || // Prisma connection error
             error.message.includes('P2024'); // Prisma timeout
    },
  }),

  // External API calls
  external: new RetryStrategy({
    maxAttempts: 4,
    initialDelay: 1000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      const httpError = error as any;
      if (httpError.response?.status) {
        const status = httpError.response.status;
        // Don't retry on client errors (except rate limiting and timeouts)
        return status >= 500 || status === 408 || status === 429 || status === 503;
      }
      return true; // Retry network errors
    },
  }),

  // File operations
  file: new RetryStrategy({
    maxAttempts: 2,
    initialDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 3,
    jitter: false,
    retryCondition: (error: Error) => {
      // Retry on file system errors but not on permission errors
      return error.name === 'EBUSY' ||
             error.name === 'EMFILE' ||
             error.name === 'ENFILE' ||
             error.name === 'EAGAIN';
    },
  }),
};

// Utility function for simple retry with default strategy
export async function retry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>,
  operationName?: string
): Promise<T> {
  const strategy = new RetryStrategy(config);
  const result = await strategy.execute(operation, operationName);
  return result.result;
}

// Decorator for adding retry to methods
export function Retryable(config?: Partial<RetryConfig>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const strategy = new RetryStrategy({
        ...config,
        context: {
          class: target.constructor.name,
          method: propertyName,
          ...config?.context,
        },
      });
      
      const result = await strategy.execute(
        () => method.apply(this, args),
        `${target.constructor.name}.${propertyName}`
      );
      
      return result.result;
    };
  };
}