import { logger } from '../../logging/Logger';
import { AppError } from '../../errors/AppError';
import { ErrorCodes } from '../../errors/ErrorCodes';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  minimumThroughput: number;
  name: string;
  onStateChange?: (state: CircuitBreakerState, name: string) => void;
  isFailure?: (error: Error) => boolean;
}

export enum CircuitBreakerState {
  CLOSED = 'closed',       // Normal operation
  OPEN = 'open',          // Failing fast
  HALF_OPEN = 'half-open' // Testing recovery
}

interface CircuitBreakerMetrics {
  totalRequests: number;
  failedRequests: number;
  successRequests: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export class CircuitBreaker {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private metrics: CircuitBreakerMetrics;
  private stateChangeTime: number;
  private requestQueue: Array<{ timestamp: number; success: boolean }> = [];

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      monitoringWindow: 60000, // 1 minute
      minimumThroughput: 10,
      name: 'default',
      onStateChange: () => {},
      isFailure: (error: Error) => true,
      ...config,
    };

    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      successRequests: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
    };

    this.stateChangeTime = Date.now();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.cleanupOldRequests();

    // Check if circuit breaker should allow the request
    if (!this.canExecute()) {
      throw new AppError(
        `Circuit breaker '${this.config.name}' is OPEN`,
        503,
        ErrorCodes.SERVICE_UNAVAILABLE,
        {
          metadata: {
            circuitBreakerName: this.config.name,
            state: this.state,
            metrics: this.getMetrics(),
          }
        }
      );
    }

    const startTime = Date.now();
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.onFailure(error as Error, executionTime);
      throw error;
    }
  }

  private canExecute(): boolean {
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;
      
      case CircuitBreakerState.OPEN:
        // Check if recovery timeout has passed
        if (Date.now() - this.stateChangeTime >= this.config.recoveryTimeout) {
          this.changeState(CircuitBreakerState.HALF_OPEN);
          return true;
        }
        return false;
      
      case CircuitBreakerState.HALF_OPEN:
        return true;
      
      default:
        return false;
    }
  }

  private onSuccess(): void {
    this.recordRequest(true);
    this.metrics.successRequests++;
    this.metrics.lastSuccessTime = Date.now();
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;

    // Reset circuit breaker if in half-open state
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.changeState(CircuitBreakerState.CLOSED);
    }
  }

  private onFailure(error: Error, executionTime?: number): void {
    // Only count as failure if it matches the failure condition
    if (!this.config.isFailure(error)) {
      return;
    }

    this.recordRequest(false);
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = Date.now();
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;

    logger.warn('Circuit breaker recorded failure', {
      circuitBreakerName: this.config.name,
      error: error.message,
      executionTime,
      consecutiveFailures: this.metrics.consecutiveFailures,
      state: this.state,
    });

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.changeState(CircuitBreakerState.OPEN);
    }
  }

  private shouldOpenCircuit(): boolean {
    // Need minimum throughput to make a decision
    if (this.metrics.totalRequests < this.config.minimumThroughput) {
      return false;
    }

    // Calculate failure rate in the monitoring window
    const recentRequests = this.getRecentRequests();
    if (recentRequests.length < this.config.minimumThroughput) {
      return false;
    }

    const failedRequests = recentRequests.filter(r => !r.success).length;
    const failureRate = failedRequests / recentRequests.length;

    return failureRate >= (this.config.failureThreshold / 100);
  }

  private recordRequest(success: boolean): void {
    const now = Date.now();
    this.requestQueue.push({ timestamp: now, success });
    this.metrics.totalRequests++;
  }

  private cleanupOldRequests(): void {
    const cutoffTime = Date.now() - this.config.monitoringWindow;
    this.requestQueue = this.requestQueue.filter(req => req.timestamp >= cutoffTime);
  }

  private getRecentRequests(): Array<{ timestamp: number; success: boolean }> {
    const cutoffTime = Date.now() - this.config.monitoringWindow;
    return this.requestQueue.filter(req => req.timestamp >= cutoffTime);
  }

  private changeState(newState: CircuitBreakerState): void {
    if (this.state === newState) {
      return;
    }

    const oldState = this.state;
    this.state = newState;
    this.stateChangeTime = Date.now();

    logger.info('Circuit breaker state changed', {
      circuitBreakerName: this.config.name,
      oldState,
      newState,
      metrics: this.getMetrics(),
    });

    this.config.onStateChange(newState, this.config.name);

    // Reset metrics on state change
    if (newState === CircuitBreakerState.CLOSED) {
      this.resetMetrics();
    }
  }

  private resetMetrics(): void {
    this.metrics.consecutiveFailures = 0;
    this.metrics.consecutiveSuccesses = 0;
  }

  // Public methods for monitoring
  public getState(): CircuitBreakerState {
    return this.state;
  }

  public getMetrics(): CircuitBreakerMetrics & { 
    state: CircuitBreakerState; 
    failureRate: number; 
    recentRequests: number;
  } {
    const recentRequests = this.getRecentRequests();
    const failedRequests = recentRequests.filter(r => !r.success).length;
    const failureRate = recentRequests.length > 0 ? failedRequests / recentRequests.length : 0;

    return {
      ...this.metrics,
      state: this.state,
      failureRate,
      recentRequests: recentRequests.length,
    };
  }

  public reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.stateChangeTime = Date.now();
    this.requestQueue = [];
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      successRequests: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
    };

    logger.info('Circuit breaker reset', {
      circuitBreakerName: this.config.name,
    });
  }

  public forceOpen(): void {
    this.changeState(CircuitBreakerState.OPEN);
  }

  public forceClose(): void {
    this.changeState(CircuitBreakerState.CLOSED);
  }
}

// Circuit breaker registry for managing multiple circuit breakers
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  public static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  public getOrCreate(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({
        ...config,
        name,
        onStateChange: (state, breakerName) => {
          logger.info('Circuit breaker state change', {
            name: breakerName,
            state,
          });
          config?.onStateChange?.(state, breakerName);
        },
      });
      
      this.breakers.set(name, breaker);
    }
    
    return this.breakers.get(name)!;
  }

  public get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  public getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  public getAllMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    
    return metrics;
  }

  public reset(name?: string): void {
    if (name) {
      const breaker = this.breakers.get(name);
      if (breaker) {
        breaker.reset();
      }
    } else {
      for (const breaker of this.breakers.values()) {
        breaker.reset();
      }
    }
  }
}

// Decorator for adding circuit breaker to methods
export function WithCircuitBreaker(config?: Partial<CircuitBreakerConfig>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const breakerName = config?.name || `${target.constructor.name}.${propertyName}`;
    
    descriptor.value = async function (...args: any[]) {
      const registry = CircuitBreakerRegistry.getInstance();
      const breaker = registry.getOrCreate(breakerName, config);
      
      return breaker.execute(() => method.apply(this, args));
    };
  };
}

// Predefined circuit breakers
export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance();