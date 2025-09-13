import { logger } from '../logging/Logger';
import { metricsCollector } from './MetricsCollector';
import { loggerConfig } from '../logging/LoggerConfig';

export interface PerformanceTrackingConfig {
  name: string;
  trackMemory: boolean;
  trackCpu: boolean;
  logSlowOperations: boolean;
  slowThreshold: number;
  sampleRate: number;
  labels: Record<string, string>;
}

export interface PerformanceMeasurement {
  name: string;
  duration: number;
  memoryUsage?: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: NodeJS.MemoryUsage;
  };
  cpuUsage?: {
    before: NodeJS.CpuUsage;
    after: NodeJS.CpuUsage;
    delta: NodeJS.CpuUsage;
  };
  timestamp: number;
  labels: Record<string, string>;
}

export class PerformanceTracker {
  private activeMeasurements: Map<string, {
    startTime: number;
    startMemory?: NodeJS.MemoryUsage;
    startCpu?: NodeJS.CpuUsage;
    config: PerformanceTrackingConfig;
  }> = new Map();

  private measurements: PerformanceMeasurement[] = [];
  private maxMeasurements: number = 1000;

  // Start tracking performance for an operation
  public start(config: Partial<PerformanceTrackingConfig> & { name: string }): string {
    const measurementId = `${config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullConfig: PerformanceTrackingConfig = {
      trackMemory: true,
      trackCpu: true,
      logSlowOperations: true,
      slowThreshold: loggerConfig.performanceThreshold,
      sampleRate: 1.0,
      labels: {},
      ...config,
    };

    // Check sample rate
    if (Math.random() > fullConfig.sampleRate) {
      return measurementId; // Return ID but don't track
    }

    const measurement = {
      startTime: Date.now(),
      startMemory: fullConfig.trackMemory ? process.memoryUsage() : undefined,
      startCpu: fullConfig.trackCpu ? process.cpuUsage() : undefined,
      config: fullConfig,
    };

    this.activeMeasurements.set(measurementId, measurement);

    logger.debug('Performance tracking started', {
      measurementId,
      name: fullConfig.name,
      labels: fullConfig.labels,
    });

    return measurementId;
  }

  // Stop tracking and record measurement
  public end(measurementId: string): PerformanceMeasurement | null {
    const measurement = this.activeMeasurements.get(measurementId);
    if (!measurement) {
      logger.warn('Performance measurement not found', { measurementId });
      return null;
    }

    this.activeMeasurements.delete(measurementId);

    const endTime = Date.now();
    const duration = endTime - measurement.startTime;
    
    const result: PerformanceMeasurement = {
      name: measurement.config.name,
      duration,
      timestamp: endTime,
      labels: measurement.config.labels,
    };

    // Calculate memory usage delta
    if (measurement.startMemory && measurement.config.trackMemory) {
      const endMemory = process.memoryUsage();
      result.memoryUsage = {
        before: measurement.startMemory,
        after: endMemory,
        delta: {
          rss: endMemory.rss - measurement.startMemory.rss,
          heapTotal: endMemory.heapTotal - measurement.startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - measurement.startMemory.heapUsed,
          external: endMemory.external - measurement.startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - measurement.startMemory.arrayBuffers,
        },
      };
    }

    // Calculate CPU usage delta
    if (measurement.startCpu && measurement.config.trackCpu) {
      const endCpu = process.cpuUsage(measurement.startCpu);
      result.cpuUsage = {
        before: measurement.startCpu,
        after: process.cpuUsage(),
        delta: endCpu,
      };
    }

    // Record metrics
    this.recordMetrics(result);

    // Log if slow
    if (measurement.config.logSlowOperations && duration > measurement.config.slowThreshold) {
      this.logSlowOperation(result);
    }

    // Store measurement
    this.storeMeasurement(result);

    logger.debug('Performance tracking completed', {
      measurementId,
      name: result.name,
      duration,
      labels: result.labels,
    });

    return result;
  }

  // Measure a function execution
  public async measure<T>(
    fn: () => Promise<T>,
    config: Partial<PerformanceTrackingConfig> & { name: string }
  ): Promise<{ result: T; measurement: PerformanceMeasurement }> {
    const measurementId = this.start(config);
    
    try {
      const result = await fn();
      const measurement = this.end(measurementId);
      
      return {
        result,
        measurement: measurement!,
      };
    } catch (error) {
      const measurement = this.end(measurementId);
      
      // Log error with performance context
      if (measurement) {
        logger.error('Operation failed with performance data', {
          name: measurement.name,
          duration: measurement.duration,
          error: (error as Error).message,
          labels: measurement.labels,
        });
      }
      
      throw error;
    }
  }

  // Measure synchronous function execution
  public measureSync<T>(
    fn: () => T,
    config: Partial<PerformanceTrackingConfig> & { name: string }
  ): { result: T; measurement: PerformanceMeasurement } {
    const measurementId = this.start(config);
    
    try {
      const result = fn();
      const measurement = this.end(measurementId);
      
      return {
        result,
        measurement: measurement!,
      };
    } catch (error) {
      const measurement = this.end(measurementId);
      
      // Log error with performance context
      if (measurement) {
        logger.error('Synchronous operation failed with performance data', {
          name: measurement.name,
          duration: measurement.duration,
          error: (error as Error).message,
          labels: measurement.labels,
        });
      }
      
      throw error;
    }
  }

  // Track database query performance
  public async trackDatabaseQuery<T>(
    operation: string,
    table: string,
    query: () => Promise<T>
  ): Promise<T> {
    const config = {
      name: 'database_query',
      labels: { operation, table },
      slowThreshold: loggerConfig.slowQueryThreshold,
    };

    const { result, measurement } = await this.measure(query, config);
    
    // Record database-specific metrics
    metricsCollector.recordDatabaseQuery(
      operation,
      table,
      measurement.duration,
      true
    );

    return result;
  }

  // Track HTTP request performance
  public async trackHttpRequest<T>(
    method: string,
    path: string,
    handler: () => Promise<T>
  ): Promise<T> {
    const config = {
      name: 'http_request',
      labels: { method, path },
    };

    const { result, measurement } = await this.measure(handler, config);

    return result;
  }

  // Track external API call performance
  public async trackExternalApiCall<T>(
    service: string,
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const config = {
      name: 'external_api_call',
      labels: { service, endpoint },
    };

    const { result, measurement } = await this.measure(apiCall, config);
    
    return result;
  }

  // Get performance statistics
  public getStatistics(name?: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
    totalMemoryAllocated: number;
    totalCpuTime: number;
  } {
    const filteredMeasurements = name 
      ? this.measurements.filter(m => m.name === name)
      : this.measurements;

    if (filteredMeasurements.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        totalMemoryAllocated: 0,
        totalCpuTime: 0,
      };
    }

    const durations = filteredMeasurements.map(m => m.duration).sort((a, b) => a - b);
    
    return {
      count: filteredMeasurements.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50Duration: this.calculatePercentile(durations, 0.5),
      p95Duration: this.calculatePercentile(durations, 0.95),
      p99Duration: this.calculatePercentile(durations, 0.99),
      totalMemoryAllocated: filteredMeasurements.reduce((sum, m) => {
        return sum + (m.memoryUsage?.delta.heapUsed || 0);
      }, 0),
      totalCpuTime: filteredMeasurements.reduce((sum, m) => {
        return sum + ((m.cpuUsage?.delta.user || 0) + (m.cpuUsage?.delta.system || 0));
      }, 0),
    };
  }

  // Get recent measurements
  public getRecentMeasurements(count: number = 100): PerformanceMeasurement[] {
    return this.measurements.slice(-count);
  }

  // Get measurements by name
  public getMeasurementsByName(name: string): PerformanceMeasurement[] {
    return this.measurements.filter(m => m.name === name);
  }

  // Get slow operations
  public getSlowOperations(threshold?: number): PerformanceMeasurement[] {
    const slowThreshold = threshold || loggerConfig.performanceThreshold;
    return this.measurements.filter(m => m.duration > slowThreshold);
  }

  // Clear measurements
  public clearMeasurements(): void {
    this.measurements = [];
    logger.info('Performance measurements cleared');
  }

  // Private methods
  private recordMetrics(measurement: PerformanceMeasurement): void {
    // Record duration histogram
    metricsCollector.observeHistogram(
      'performance_operation_duration_seconds',
      measurement.duration / 1000,
      { name: measurement.name, ...measurement.labels }
    );

    // Record memory usage if available
    if (measurement.memoryUsage) {
      metricsCollector.observeHistogram(
        'performance_memory_allocated_bytes',
        measurement.memoryUsage.delta.heapUsed,
        { name: measurement.name, ...measurement.labels }
      );
    }

    // Record CPU usage if available
    if (measurement.cpuUsage) {
      const totalCpuTime = measurement.cpuUsage.delta.user + measurement.cpuUsage.delta.system;
      metricsCollector.observeHistogram(
        'performance_cpu_time_seconds',
        totalCpuTime / 1000000, // Convert microseconds to seconds
        { name: measurement.name, ...measurement.labels }
      );
    }
  }

  private logSlowOperation(measurement: PerformanceMeasurement): void {
    const context = {
      name: measurement.name,
      duration: measurement.duration,
      labels: measurement.labels,
      memoryDelta: measurement.memoryUsage?.delta,
      cpuDelta: measurement.cpuUsage?.delta,
    };

    logger.logPerformance('Slow operation detected', {
      duration: measurement.duration,
      memoryUsage: measurement.memoryUsage ? {
        heapUsed: measurement.memoryUsage.after.heapUsed,
        heapTotal: measurement.memoryUsage.after.heapTotal,
        external: measurement.memoryUsage.after.external,
        rss: measurement.memoryUsage.after.rss,
        arrayBuffers: measurement.memoryUsage.after.arrayBuffers || 0,
      } : undefined,
    }, context);
  }

  private storeMeasurement(measurement: PerformanceMeasurement): void {
    this.measurements.push(measurement);
    
    // Trim old measurements
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements = this.measurements.slice(-this.maxMeasurements);
    }
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))] || 0;
  }
}

// Decorator for automatic performance tracking
export function TrackPerformance(config?: Partial<PerformanceTrackingConfig>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const tracker = new PerformanceTracker();
    
    if (method.constructor.name === 'AsyncFunction') {
      // Async method
      descriptor.value = async function (...args: any[]) {
        const finalConfig = {
          name: `${target.constructor.name}.${propertyName}`,
          ...config,
        };
        
        const { result } = await tracker.measure(
          () => method.apply(this, args),
          finalConfig
        );
        
        return result;
      };
    } else {
      // Sync method
      descriptor.value = function (...args: any[]) {
        const finalConfig = {
          name: `${target.constructor.name}.${propertyName}`,
          ...config,
        };
        
        const { result } = tracker.measureSync(
          () => method.apply(this, args),
          finalConfig
        );
        
        return result;
      };
    }
  };
}

// Export singleton instance
export const performanceTracker = new PerformanceTracker();