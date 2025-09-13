import { logger } from '../../logging/Logger';

export interface FallbackConfig<T> {
  name?: string;
  shouldFallback?: (error: Error) => boolean;
  onFallback?: (error: Error, fallbackValue: T) => void;
  timeout?: number;
}

export class FallbackStrategy<T> {
  private config: Required<FallbackConfig<T>>;

  constructor(config: Partial<FallbackConfig<T>> = {}) {
    this.config = {
      name: 'default',
      shouldFallback: () => true,
      onFallback: () => {},
      timeout: 30000, // 30 seconds
      ...config,
    };
  }

  async execute(
    primary: () => Promise<T>,
    fallback: () => Promise<T> | T
  ): Promise<T> {
    try {
      // Try primary operation with timeout
      const result = await this.withTimeout(primary(), this.config.timeout);
      return result;
    } catch (primaryError) {
      // Check if we should use fallback
      if (!this.config.shouldFallback(primaryError as Error)) {
        throw primaryError;
      }

      logger.warn('Primary operation failed, executing fallback', {
        fallbackName: this.config.name,
        primaryError: (primaryError as Error).message,
      });

      try {
        const fallbackResult = await Promise.resolve(fallback());
        
        this.config.onFallback(primaryError as Error, fallbackResult);
        
        logger.info('Fallback executed successfully', {
          fallbackName: this.config.name,
        });

        return fallbackResult;
      } catch (fallbackError) {
        logger.error('Fallback also failed', {
          fallbackName: this.config.name,
          primaryError: (primaryError as Error).message,
          fallbackError: (fallbackError as Error).message,
        });

        // Throw the original error since fallback failed
        throw primaryError;
      }
    }
  }

  private async withTimeout<U>(promise: Promise<U>, timeoutMs: number): Promise<U> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  }
}

// Predefined fallback strategies
export class FallbackStrategies {
  // Cache-based fallback
  static cache<T>(cache: Map<string, T>, cacheKey: string): FallbackStrategy<T> {
    return new FallbackStrategy<T>({
      name: 'cache',
      shouldFallback: (error) => !error.message.includes('validation'),
      onFallback: (error, value) => {
        logger.info('Using cached value as fallback', {
          cacheKey,
          error: error.message,
        });
      },
    });
  }

  // Default value fallback
  static defaultValue<T>(defaultValue: T): FallbackStrategy<T> {
    return new FallbackStrategy<T>({
      name: 'default-value',
      onFallback: (error, value) => {
        logger.info('Using default value as fallback', {
          defaultValue,
          error: error.message,
        });
      },
    });
  }

  // Empty result fallback
  static empty<T extends any[]>(): FallbackStrategy<T> {
    return new FallbackStrategy<T>({
      name: 'empty',
      onFallback: (error) => {
        logger.info('Using empty result as fallback', {
          error: error.message,
        });
      },
    });
  }

  // Degraded service fallback
  static degraded<T>(degradedOperation: () => Promise<T>): FallbackStrategy<T> {
    return new FallbackStrategy<T>({
      name: 'degraded-service',
      shouldFallback: (error) => !error.message.includes('authentication'),
      onFallback: (error) => {
        logger.warn('Using degraded service as fallback', {
          error: error.message,
        });
      },
    });
  }

  // Cached with expiry fallback
  static cachedWithExpiry<T>(
    cache: Map<string, { value: T; expiry: number }>,
    cacheKey: string,
    allowExpired: boolean = true
  ): FallbackStrategy<T> {
    return new FallbackStrategy<T>({
      name: 'cached-with-expiry',
      shouldFallback: (error) => {
        const cached = cache.get(cacheKey);
        if (!cached) return false;
        
        const isExpired = Date.now() > cached.expiry;
        return !isExpired || allowExpired;
      },
      onFallback: (error, value) => {
        const cached = cache.get(cacheKey);
        const isExpired = cached && Date.now() > cached.expiry;
        
        logger.info('Using cached value as fallback', {
          cacheKey,
          isExpired,
          error: error.message,
        });
      },
    });
  }
}

// Utility function for simple fallback
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
  config?: Partial<FallbackConfig<T>>
): Promise<T> {
  const strategy = new FallbackStrategy<T>(config);
  return strategy.execute(primary, fallback);
}

// Multi-level fallback for cascading fallbacks
export class MultiLevelFallback<T> {
  private operations: Array<() => Promise<T> | T>;
  private config: FallbackConfig<T>;

  constructor(operations: Array<() => Promise<T> | T>, config: Partial<FallbackConfig<T>> = {}) {
    this.operations = operations;
    this.config = {
      name: 'multi-level',
      shouldFallback: () => true,
      onFallback: () => {},
      timeout: 30000,
      ...config,
    };
  }

  async execute(): Promise<T> {
    const errors: Error[] = [];

    for (let i = 0; i < this.operations.length; i++) {
      const operation = this.operations[i];
      const operationName = `level-${i + 1}`;

      try {
        logger.debug(`Attempting ${operationName}`, {
          fallbackName: this.config.name,
          level: i + 1,
          totalLevels: this.operations.length,
        });

        const result = await Promise.resolve(operation?.());
        
        if (result === undefined) {
          throw new Error('Operation returned undefined');
        }
        
        if (i > 0) {
          logger.info(`Fallback level ${i + 1} succeeded`, {
            fallbackName: this.config.name,
            level: i + 1,
            previousErrors: errors.length,
          });
        }

        return result;
      } catch (error) {
        errors.push(error as Error);
        
        logger.warn(`Fallback level ${i + 1} failed`, {
          fallbackName: this.config.name,
          level: i + 1,
          error: (error as Error).message,
        });

        // If this is the last operation, throw
        if (i === this.operations.length - 1) {
          logger.error('All fallback levels failed', {
            fallbackName: this.config.name,
            totalLevels: this.operations.length,
            errors: errors.map(e => e.message),
          });

          throw errors[0]; // Throw the first (primary) error
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('No operations provided');
  }
}

// Decorator for adding fallback to methods
export function WithFallback<T>(fallback: () => Promise<T> | T, config?: Partial<FallbackConfig<T>>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const strategy = new FallbackStrategy<T>({
        name: `${target.constructor.name}.${propertyName}`,
        ...config,
      });
      
      return strategy.execute(
        () => method.apply(this, args),
        fallback
      );
    };
  };
}

// Graceful degradation utility
export class GracefulDegradation<T> {
  private levels: Array<{
    operation: () => Promise<T>;
    quality: number;
    name: string;
  }>;

  constructor() {
    this.levels = [];
  }

  addLevel(
    operation: () => Promise<T>,
    quality: number,
    name: string
  ): this {
    this.levels.push({ operation, quality, name });
    // Sort by quality (highest first)
    this.levels.sort((a, b) => b.quality - a.quality);
    return this;
  }

  async execute(): Promise<{ result: T; quality: number; level: string }> {
    for (const level of this.levels) {
      try {
        logger.debug('Attempting service level', {
          level: level.name,
          quality: level.quality,
        });

        const result = await level.operation();
        
        logger.info('Service level succeeded', {
          level: level.name,
          quality: level.quality,
        });

        return {
          result,
          quality: level.quality,
          level: level.name,
        };
      } catch (error) {
        logger.warn('Service level failed, trying next', {
          level: level.name,
          quality: level.quality,
          error: (error as Error).message,
        });
      }
    }

    throw new Error('All service levels failed');
  }
}