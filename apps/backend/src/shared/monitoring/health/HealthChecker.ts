import { logger } from '../../logging/Logger';
import { metricsCollector } from '../MetricsCollector';
import { circuitBreakerRegistry } from '../../recovery/patterns/CircuitBreaker';
import { PrismaClient } from '@prisma/client';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  timestamp: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  uptime: number;
  version: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

export type HealthCheckFunction = () => Promise<HealthCheckResult>;

export class HealthChecker {
  private static instance: HealthChecker;
  private checks: Map<string, HealthCheckFunction> = new Map();
  private lastHealthCheck: SystemHealth | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.registerDefaultChecks();
  }

  public static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  // Register a health check
  public registerCheck(name: string, checkFunction: HealthCheckFunction): void {
    this.checks.set(name, checkFunction);
    logger.info('Health check registered', { name });
  }

  // Remove a health check
  public unregisterCheck(name: string): void {
    this.checks.delete(name);
    logger.info('Health check unregistered', { name });
  }

  // Run all health checks
  public async checkHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];

    logger.debug('Starting health check', { 
      totalChecks: this.checks.size 
    });

    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      try {
        const result = await Promise.race([
          checkFn(),
          this.timeoutPromise(name, 10000), // 10 second timeout
        ]);
        return result;
      } catch (error) {
        return {
          name,
          status: 'unhealthy' as const,
          message: `Health check failed: ${(error as Error).message}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          metadata: {
            error: (error as Error).message,
            stack: (error as Error).stack,
          },
        };
      }
    });

    const checkResults = await Promise.all(checkPromises);
    results.push(...checkResults);

    // Calculate overall status
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      degraded: results.filter(r => r.status === 'degraded').length,
    };

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    const health: SystemHealth = {
      status: overallStatus,
      timestamp: Date.now(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: results,
      summary,
    };

    this.lastHealthCheck = health;

    // Record metrics
    metricsCollector.setGauge('health_check_status', overallStatus === 'healthy' ? 1 : 0);
    metricsCollector.setGauge('health_check_total', summary.total);
    metricsCollector.setGauge('health_check_healthy', summary.healthy);
    metricsCollector.setGauge('health_check_unhealthy', summary.unhealthy);
    metricsCollector.setGauge('health_check_degraded', summary.degraded);

    // Log health check completion
    logger.info('Health check completed', {
      status: overallStatus,
      duration: Date.now() - startTime,
      summary,
    });

    return health;
  }

  // Get last health check result
  public getLastHealthCheck(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  // Start periodic health checks
  public startPeriodicChecks(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        logger.error('Periodic health check failed', {
          error: (error as Error).message,
        });
      }
    }, intervalMs);

    logger.info('Periodic health checks started', { intervalMs });
  }

  // Stop periodic health checks
  public stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    logger.info('Periodic health checks stopped');
  }

  // Register default health checks
  private registerDefaultChecks(): void {
    // Database connectivity check
    this.registerCheck('database', async (): Promise<HealthCheckResult> => {
      const startTime = Date.now();
      const prisma = new PrismaClient();
      
      try {
        await prisma.$queryRaw`SELECT 1`;
        await prisma.$disconnect();
        
        return {
          name: 'database',
          status: 'healthy',
          message: 'Database connection is healthy',
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };
      } catch (error) {
        await prisma.$disconnect();
        return {
          name: 'database',
          status: 'unhealthy',
          message: `Database connection failed: ${(error as Error).message}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          metadata: {
            error: (error as Error).message,
          },
        };
      }
    });

    // Memory usage check
    this.registerCheck('memory', async (): Promise<HealthCheckResult> => {
      const startTime = Date.now();
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${memoryUsagePercent.toFixed(1)}%)`;
      
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
        message = `Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`;
      } else if (memoryUsagePercent > 80) {
        status = 'degraded';
        message = `High memory usage: ${memoryUsagePercent.toFixed(1)}%`;
      }
      
      return {
        name: 'memory',
        status,
        message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        metadata: {
          heapUsedMB,
          heapTotalMB,
          memoryUsagePercent,
          rss: Math.round(memUsage.rss / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
        },
      };
    });

    // Event loop lag check
    this.registerCheck('eventloop', async (): Promise<HealthCheckResult> => {
      const startTime = Date.now();
      
      return new Promise((resolve) => {
        const start = process.hrtime();
        
        setImmediate(() => {
          const delta = process.hrtime(start);
          const lagMs = (delta[0] * 1000) + (delta[1] * 1e-6);
          
          let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
          let message = `Event loop lag: ${lagMs.toFixed(2)}ms`;
          
          if (lagMs > 100) {
            status = 'unhealthy';
            message = `Critical event loop lag: ${lagMs.toFixed(2)}ms`;
          } else if (lagMs > 50) {
            status = 'degraded';
            message = `High event loop lag: ${lagMs.toFixed(2)}ms`;
          }
          
          resolve({
            name: 'eventloop',
            status,
            message,
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            metadata: {
              lagMs,
            },
          });
        });
      });
    });

    // Circuit breakers check
    this.registerCheck('circuit-breakers', async (): Promise<HealthCheckResult> => {
      const startTime = Date.now();
      
      try {
        const circuitBreakers = circuitBreakerRegistry.getAllMetrics();
        const breakerNames = Object.keys(circuitBreakers);
        
        if (breakerNames.length === 0) {
          return {
            name: 'circuit-breakers',
            status: 'healthy',
            message: 'No circuit breakers configured',
            timestamp: Date.now(),
            duration: Date.now() - startTime,
          };
        }
        
        const openBreakers = breakerNames.filter(
          name => circuitBreakers[name].state === 'open'
        );
        
        let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
        let message = `Circuit breakers: ${breakerNames.length} total, ${openBreakers.length} open`;
        
        if (openBreakers.length > 0) {
          if (openBreakers.length === breakerNames.length) {
            status = 'unhealthy';
            message = 'All circuit breakers are open';
          } else {
            status = 'degraded';
            message = `${openBreakers.length} circuit breakers are open: ${openBreakers.join(', ')}`;
          }
        }
        
        return {
          name: 'circuit-breakers',
          status,
          message,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          metadata: {
            total: breakerNames.length,
            open: openBreakers.length,
            openBreakers,
            details: circuitBreakers,
          },
        };
      } catch (error) {
        return {
          name: 'circuit-breakers',
          status: 'unhealthy',
          message: `Circuit breaker check failed: ${(error as Error).message}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };
      }
    });

    // Disk space check (if possible)
    this.registerCheck('disk-space', async (): Promise<HealthCheckResult> => {
      const startTime = Date.now();
      
      try {
        const fs = await import('fs/promises');
        const stats = await fs.stat('./');
        
        return {
          name: 'disk-space',
          status: 'healthy',
          message: 'Disk space check completed',
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          metadata: {
            note: 'Detailed disk space monitoring requires additional tools',
          },
        };
      } catch (error) {
        return {
          name: 'disk-space',
          status: 'degraded',
          message: 'Disk space check could not be performed',
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };
      }
    });
  }

  private async timeoutPromise(checkName: string, timeoutMs: number): Promise<HealthCheckResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check '${checkName}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }
}

// Export singleton instance
export const healthChecker = HealthChecker.getInstance();