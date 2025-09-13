import { errorReporter, ErrorSeverity } from '../ErrorReporter';

export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export class ClientRetryStrategy {
  private config: Required<RetryConfig>;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      delay: 1000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: this.defaultRetryCondition,
      onRetry: () => {},
      ...config,
    };
  }

  async execute<T>(operation: () => Promise<T>, operationName?: string): Promise<T> {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          errorReporter.addBreadcrumb(
            'retry',
            `Operation succeeded on attempt ${attempt}`,
            'info',
            { operationName, totalTime: Date.now() - startTime }
          );
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.config.maxAttempts || !this.config.retryCondition(lastError, attempt)) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        
        errorReporter.addBreadcrumb(
          'retry',
          `Attempt ${attempt} failed, retrying in ${delay}ms`,
          'warning',
          { operationName, error: lastError.message }
        );

        this.config.onRetry(lastError, attempt, delay);
        
        await this.sleep(delay);
      }
    }

    // All attempts failed
    const totalTime = Date.now() - startTime;
    
    errorReporter.captureError(
      lastError!,
      {
        feature: 'retry_strategy',
        operation: operationName,
      },
      ErrorSeverity.HIGH
    );

    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    let delay = this.config.delay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private defaultRetryCondition(error: Error, attempt: number): boolean {
    // Retry on network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }

    // Retry on timeout errors
    if (error.message.includes('timeout') || error.message.includes('TimeoutError')) {
      return true;
    }

    // Retry on server errors (if it's a response error with status)
    const responseError = error as any;
    if (responseError.status >= 500) {
      return true;
    }

    // Retry on rate limiting
    if (responseError.status === 429) {
      return true;
    }

    return false;
  }
}

// Predefined retry strategies
export const RetryStrategies = {
  // Quick retry for UI operations
  quick: new ClientRetryStrategy({
    maxAttempts: 2,
    delay: 500,
    backoffMultiplier: 1.5,
    jitter: false,
  }),

  // Standard retry for API calls
  standard: new ClientRetryStrategy({
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 2,
    jitter: true,
  }),

  // Aggressive retry for critical operations
  aggressive: new ClientRetryStrategy({
    maxAttempts: 5,
    delay: 500,
    backoffMultiplier: 1.8,
    jitter: true,
  }),

  // Patient retry for background operations
  patient: new ClientRetryStrategy({
    maxAttempts: 3,
    delay: 5000,
    backoffMultiplier: 2,
    jitter: true,
  }),
};

// React hook for retry functionality
import { useState, useCallback } from 'react';

interface UseRetryState<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  isRetrying: boolean;
  attempt: number;
}

export function useRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
) {
  const [state, setState] = useState<UseRetryState<T>>({
    isLoading: false,
    isRetrying: false,
    attempt: 0,
  });

  const strategy = new ClientRetryStrategy({
    ...config,
    onRetry: (error, attempt, delay) => {
      setState(prev => ({
        ...prev,
        isRetrying: true,
        attempt,
        error,
      }));
      config.onRetry?.(error, attempt, delay);
    },
  });

  const execute = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      isRetrying: false,
      error: undefined,
      attempt: 0,
    }));

    try {
      const result = await strategy.execute(operation);
      setState(prev => ({
        ...prev,
        data: result,
        isLoading: false,
        isRetrying: false,
        error: undefined,
      }));
      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: error as Error,
      }));
      throw error;
    }
  }, [operation, strategy]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isRetrying: false,
      attempt: 0,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Component retry wrapper
export interface RetryWrapperProps {
  children: (retry: () => void, state: UseRetryState<void>) => React.ReactNode;
  operation: () => Promise<void>;
  config?: Partial<RetryConfig>;
  fallback?: React.ReactNode;
}

export const RetryWrapper: React.FC<RetryWrapperProps> = ({
  children,
  operation,
  config,
  fallback,
}) => {
  const { execute, ...state } = useRetry(operation, config);

  if (state.error && !state.isRetrying && fallback) {
    return <>{fallback}</>;
  }

  return <>{children(execute, { ...state })}</>;
};

// Utility functions
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const strategy = new ClientRetryStrategy(config);
  return strategy.execute(operation);
}

export function retryDecorator(config?: Partial<RetryConfig>) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;
    
    descriptor.value = (async function (this: any, ...args: any[]) {
      const strategy = new ClientRetryStrategy(config);
      return strategy.execute(
        () => method.apply(this, args),
        `${target.constructor.name}.${propertyName}`
      );
    }) as T;

    return descriptor;
  };
}

// Specialized retry strategies for different scenarios

// Network request retry with exponential backoff
export const createNetworkRetryStrategy = (maxAttempts: number = 3) =>
  new ClientRetryStrategy({
    maxAttempts,
    delay: 1000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      // Retry on network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return true;
      }
      
      // Retry on server errors
      const responseError = error as any;
      if (responseError.status >= 500 || responseError.status === 429) {
        return true;
      }
      
      return false;
    },
  });

// Chunk loading retry for code splitting
export const createChunkRetryStrategy = () =>
  new ClientRetryStrategy({
    maxAttempts: 3,
    delay: 2000,
    backoffMultiplier: 1.5,
    jitter: false,
    retryCondition: (error: Error) => {
      return error.name === 'ChunkLoadError' || 
             error.message.includes('Loading chunk') ||
             error.message.includes('Loading CSS chunk');
    },
  });

// Authentication retry with token refresh
export const createAuthRetryStrategy = (refreshToken: () => Promise<void>) =>
  new ClientRetryStrategy({
    maxAttempts: 2,
    delay: 0, // No delay for auth retries
    backoffMultiplier: 1,
    jitter: false,
    retryCondition: (error: Error) => {
      const responseError = error as any;
      return responseError.status === 401;
    },
    onRetry: async (error: Error, attempt: number) => {
      const responseError = error as any;
      if (responseError.status === 401 && attempt === 1) {
        try {
          await refreshToken();
        } catch (refreshError) {
          // If token refresh fails, don't retry
          throw refreshError;
        }
      }
    },
  });