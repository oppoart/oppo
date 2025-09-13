import { logger } from '../../logging/Logger';
import { RetryStrategy, RetryConfig } from '../RetryStrategy';
import { CircuitBreaker, CircuitBreakerConfig } from '../patterns/CircuitBreaker';
import { FallbackStrategy, FallbackConfig } from '../patterns/Fallback';
import { AppError } from '../../errors/AppError';
import { ErrorCodes } from '../../errors/ErrorCodes';

export interface RecoveryConfig {
  retry?: Partial<RetryConfig>;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  fallback?: {
    strategy: () => Promise<any> | any;
    config?: Partial<FallbackConfig<any>>;
  };
  timeout?: number;
  name?: string;
}

export interface RecoveryResult<T> {
  result: T;
  strategy: 'primary' | 'retry' | 'fallback';
  attempts: number;
  totalTime: number;
  errors: Error[];
  circuitBreakerUsed: boolean;
}

export class RecoveryManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  async execute<T>(
    operation: () => Promise<T>,
    config: RecoveryConfig = {}
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();
    const operationName = config.name || 'unnamed-operation';
    const errors: Error[] = [];
    let circuitBreakerUsed = false;

    logger.debug('Starting recovery manager execution', {
      operationName,
      hasRetry: !!config.retry,
      hasCircuitBreaker: !!config.circuitBreaker,
      hasFallback: !!config.fallback,
      timeout: config.timeout,
    });

    // Wrap operation with timeout if specified
    const timeoutWrapper = config.timeout 
      ? (op: () => Promise<T>) => this.withTimeout(op(), config.timeout!)
      : (op: () => Promise<T>) => op();

    // Get or create circuit breaker if configured
    let circuitBreaker: CircuitBreaker | undefined;
    if (config.circuitBreaker) {
      const breakerName = config.circuitBreaker.name || operationName;
      circuitBreaker = this.getOrCreateCircuitBreaker(breakerName, config.circuitBreaker);
      circuitBreakerUsed = true;
    }

    // Primary operation with circuit breaker and retry
    const primaryOperation = async (): Promise<RecoveryResult<T>> => {
      const wrappedOperation = () => timeoutWrapper(operation);
      
      try {
        let result: T;
        let attempts = 1;

        if (config.retry) {
          // Execute with retry strategy
          const retryStrategy = new RetryStrategy(config.retry);
          const retryResult = await (circuitBreaker 
            ? circuitBreaker.execute(() => retryStrategy.execute(wrappedOperation, operationName))
            : retryStrategy.execute(wrappedOperation, operationName)
          );
          
          result = retryResult.result;
          attempts = retryResult.attempts;
          errors.push(...retryResult.errors);
        } else {
          // Execute without retry
          result = await (circuitBreaker 
            ? circuitBreaker.execute(wrappedOperation)
            : wrappedOperation()
          );
        }

        return {
          result,
          strategy: attempts > 1 ? 'retry' : 'primary',
          attempts,
          totalTime: Date.now() - startTime,
          errors,
          circuitBreakerUsed,
        };
      } catch (error) {
        errors.push(error as Error);
        throw error;
      }
    };

    // Try primary operation (with retry and circuit breaker)
    try {
      return await primaryOperation();
    } catch (primaryError) {
      logger.warn('Primary operation failed', {
        operationName,
        error: (primaryError as Error).message,
        attempts: config.retry?.maxAttempts || 1,
        circuitBreakerUsed,
      });

      // Try fallback if configured
      if (config.fallback) {
        try {
          logger.info('Attempting fallback strategy', { operationName });

          const fallbackStrategy = new FallbackStrategy({
            name: `${operationName}-fallback`,
            ...config.fallback.config,
          });

          const fallbackResult = await fallbackStrategy.execute(
            () => { throw primaryError; }, // Primary always fails at this point
            config.fallback.strategy
          );

          return {
            result: fallbackResult,
            strategy: 'fallback',
            attempts: errors.length,
            totalTime: Date.now() - startTime,
            errors,
            circuitBreakerUsed,
          };
        } catch (fallbackError) {
          logger.error('Fallback strategy also failed', {
            operationName,
            primaryError: (primaryError as Error).message,
            fallbackError: (fallbackError as Error).message,
          });

          errors.push(fallbackError as Error);
        }
      }

      // All strategies failed
      const totalTime = Date.now() - startTime;
      
      logger.error('All recovery strategies failed', {
        operationName,
        totalTime,
        attempts: errors.length,
        errors: errors.map(e => e.message),
        circuitBreakerUsed,
      });

      throw new AppError(
        `Operation '${operationName}' failed after all recovery attempts`,
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        {
          metadata: {
            operationName,
            totalTime,
            attempts: errors.length,
            primaryError: (primaryError as Error).message,
            circuitBreakerUsed,
          }
        }
      );
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  }

  private getOrCreateCircuitBreaker(
    name: string,
    config: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker({ ...config, name }));
    }
    return this.circuitBreakers.get(name)!;
  }

  // Health check methods
  public getCircuitBreakerStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [name, breaker] of this.circuitBreakers) {
      status[name] = breaker.getMetrics();
    }
    
    return status;
  }

  public resetCircuitBreaker(name?: string): void {
    if (name) {
      const breaker = this.circuitBreakers.get(name);
      if (breaker) {
        breaker.reset();
        logger.info('Circuit breaker reset', { name });
      }
    } else {
      for (const [breakerName, breaker] of this.circuitBreakers) {
        breaker.reset();
        logger.info('Circuit breaker reset', { name: breakerName });
      }
    }
  }

  public getHealth(): {
    healthy: boolean;
    circuitBreakers: Record<string, any>;
    summary: {
      total: number;
      open: number;
      halfOpen: number;
      closed: number;
    };
  } {
    const circuitBreakers = this.getCircuitBreakerStatus();
    const summary = {
      total: this.circuitBreakers.size,
      open: 0,
      halfOpen: 0,
      closed: 0,
    };

    for (const status of Object.values(circuitBreakers)) {
      switch (status.state) {
        case 'open':
          summary.open++;
          break;
        case 'half-open':
          summary.halfOpen++;
          break;
        case 'closed':
          summary.closed++;
          break;
      }
    }

    const healthy = summary.open === 0; // System is healthy if no circuit breakers are open

    return {
      healthy,
      circuitBreakers,
      summary,
    };
  }
}

// Singleton instance
export const recoveryManager = new RecoveryManager();

// Utility function for easy recovery execution
export async function withRecovery<T>(
  operation: () => Promise<T>,
  config: RecoveryConfig = {}
): Promise<T> {
  const result = await recoveryManager.execute(operation, config);
  return result.result;
}

// Decorator for adding recovery to methods
export function WithRecovery(config: RecoveryConfig = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const operationName = config.name || `${target.constructor.name}.${propertyName}`;
      const finalConfig = {
        ...config,
        name: operationName,
      };
      
      const result = await recoveryManager.execute(
        () => method.apply(this, args),
        finalConfig
      );
      
      return result.result;
    };
  };
}

// Predefined recovery configurations
export const RecoveryConfigs = {
  // Quick operations (UI responsiveness)
  quick: {
    retry: {
      maxAttempts: 2,
      initialDelay: 100,
      maxDelay: 500,
      backoffMultiplier: 2,
    },
    timeout: 3000,
  } as RecoveryConfig,

  // Standard operations
  standard: {
    retry: {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
    },
    circuitBreaker: {
      failureThreshold: 50, // 50% failure rate
      recoveryTimeout: 30000,
    },
    timeout: 15000,
  } as RecoveryConfig,

  // Critical operations with aggressive recovery
  critical: {
    retry: {
      maxAttempts: 5,
      initialDelay: 500,
      maxDelay: 10000,
      backoffMultiplier: 1.5,
    },
    circuitBreaker: {
      failureThreshold: 70, // 70% failure rate
      recoveryTimeout: 60000,
      minimumThroughput: 5,
    },
    timeout: 30000,
  } as RecoveryConfig,

  // External API calls
  external: {
    retry: {
      maxAttempts: 4,
      initialDelay: 1000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      jitter: true,
    },
    circuitBreaker: {
      failureThreshold: 60,
      recoveryTimeout: 45000,
      minimumThroughput: 10,
    },
    timeout: 20000,
  } as RecoveryConfig,

  // Database operations
  database: {
    retry: {
      maxAttempts: 3,
      initialDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 1.5,
    },
    circuitBreaker: {
      failureThreshold: 80, // Higher threshold for DB
      recoveryTimeout: 20000,
      minimumThroughput: 5,
    },
    timeout: 10000,
  } as RecoveryConfig,
};