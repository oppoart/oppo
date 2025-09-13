import { logger } from '../logging/Logger';
import { metricsCollector } from '../monitoring/MetricsCollector';
import { healthChecker } from '../monitoring/health/HealthChecker';
import { performanceTracker } from '../monitoring/PerformanceTracker';
import { securityEventLogger } from '../security/SecurityEventLogger';
import { threatMonitor } from '../security/monitors/ThreatMonitor';
import { setupGlobalErrorHandlers } from '../errors/ErrorHandler';
import { recoveryManager } from '../recovery/strategies/RecoveryManager';
import { env } from '../../config/env';

export interface SystemConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  enableSecurity: boolean;
  enableHealthChecks: boolean;
  enablePerformanceTracking: boolean;
  logLevel: string;
  metricsInterval: number;
  healthCheckInterval: number;
  securityMonitoring: boolean;
}

export class SystemInitializer {
  private static instance: SystemInitializer;
  private isInitialized: boolean = false;
  private config: SystemConfig;

  private constructor() {
    this.config = {
      enableLogging: true,
      enableMetrics: env.NODE_ENV === 'production',
      enableSecurity: true,
      enableHealthChecks: true,
      enablePerformanceTracking: true,
      logLevel: env.LOG_LEVEL || 'info',
      metricsInterval: 15000, // 15 seconds
      healthCheckInterval: 30000, // 30 seconds
      securityMonitoring: true,
    };
  }

  public static getInstance(): SystemInitializer {
    if (!SystemInitializer.instance) {
      SystemInitializer.instance = new SystemInitializer();
    }
    return SystemInitializer.instance;
  }

  public async initialize(config?: Partial<SystemConfig>): Promise<void> {
    if (this.isInitialized) {
      logger.warn('System already initialized');
      return;
    }

    // Merge configuration
    this.config = { ...this.config, ...config };

    logger.info('Starting OPPO system initialization', {
      config: this.config,
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    });

    try {
      // Initialize core systems in order
      await this.initializeErrorHandling();
      await this.initializeLogging();
      await this.initializeMetrics();
      await this.initializeSecurity();
      await this.initializePerformanceTracking();
      await this.initializeHealthChecks();
      await this.initializeRecoveryStrategies();

      // System is now ready
      this.isInitialized = true;

      logger.info('OPPO system initialization completed successfully', {
        startupTime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        environment: env.NODE_ENV,
      });

      // Log system health summary
      await this.logSystemHealth();

    } catch (error) {
      logger.fatal('System initialization failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      
      process.exit(1);
    }
  }

  private async initializeErrorHandling(): Promise<void> {
    logger.info('Initializing error handling system');
    
    // Setup global error handlers
    setupGlobalErrorHandlers();
    
    logger.info('Error handling system initialized');
  }

  private async initializeLogging(): Promise<void> {
    if (!this.config.enableLogging) {
      return;
    }

    logger.info('Initializing logging system');
    
    // Logging system is already initialized when imported
    // Start collecting system metrics for logging
    // logger.startCollection(this.config.metricsInterval); // Method not implemented
    
    logger.info('Logging system initialized', {
      level: this.config.logLevel,
      environment: env.NODE_ENV,
      enableFile: env.NODE_ENV === 'production',
    });
  }

  private async initializeMetrics(): Promise<void> {
    if (!this.config.enableMetrics) {
      return;
    }

    logger.info('Initializing metrics collection system');
    
    // Start metrics collection
    metricsCollector.startCollection(this.config.metricsInterval);
    
    // Record startup metrics
    metricsCollector.setGauge('system_startup_timestamp', Date.now());
    metricsCollector.setGauge('nodejs_process_start_time_seconds', Date.now() / 1000);
    metricsCollector.incrementCounter('system_startup_total');
    
    logger.info('Metrics collection system initialized', {
      interval: this.config.metricsInterval,
    });
  }

  private async initializeSecurity(): Promise<void> {
    if (!this.config.enableSecurity) {
      return;
    }

    logger.info('Initializing security monitoring system');
    
    // Security systems are already initialized when imported
    // Log security system startup
    securityEventLogger.logEvent(
      'SECURITY_CONFIGURATION_CHANGE' as any,
      'LOW' as any,
      'Security monitoring system initialized',
      undefined,
      {
        features: ['threat_monitoring', 'security_event_logging', 'request_analysis'],
        environment: env.NODE_ENV,
      }
    );
    
    logger.info('Security monitoring system initialized');
  }

  private async initializePerformanceTracking(): Promise<void> {
    if (!this.config.enablePerformanceTracking) {
      return;
    }

    logger.info('Initializing performance tracking system');
    
    // Performance tracker is already initialized when imported
    // Record initial memory usage
    const memUsage = process.memoryUsage();
    metricsCollector.setGauge('startup_memory_heap_used_bytes', memUsage.heapUsed);
    metricsCollector.setGauge('startup_memory_heap_total_bytes', memUsage.heapTotal);
    
    logger.info('Performance tracking system initialized');
  }

  private async initializeHealthChecks(): Promise<void> {
    if (!this.config.enableHealthChecks) {
      return;
    }

    logger.info('Initializing health monitoring system');
    
    // Start periodic health checks
    healthChecker.startPeriodicChecks(this.config.healthCheckInterval);
    
    // Run initial health check
    const initialHealth = await healthChecker.checkHealth();
    
    logger.info('Health monitoring system initialized', {
      status: initialHealth.status,
      checks: initialHealth.summary,
      interval: this.config.healthCheckInterval,
    });
  }

  private async initializeRecoveryStrategies(): Promise<void> {
    logger.info('Initializing recovery management system');
    
    // Recovery manager is already initialized when imported
    // Log available recovery strategies
    logger.info('Recovery management system initialized', {
      circuitBreakers: recoveryManager.getCircuitBreakerStatus(),
    });
  }

  private async logSystemHealth(): Promise<void> {
    try {
      const health = await healthChecker.checkHealth();
      const metrics = metricsCollector.getMetrics();
      const memUsage = process.memoryUsage();
      
      logger.info('System health summary', {
        health: {
          status: health.status,
          uptime: health.uptime,
          checks: health.summary,
        },
        metrics: {
          total: metrics.length,
          lastCollected: Date.now(),
        },
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
        },
        process: {
          pid: process.pid,
          uptime: process.uptime(),
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      });
    } catch (error) {
      logger.error('Failed to log system health summary', {
        error: (error as Error).message,
      });
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    logger.info('Starting graceful system shutdown');
    
    try {
      // Stop health checks
      if (this.config.enableHealthChecks) {
        healthChecker.stopPeriodicChecks();
      }
      
      // Stop metrics collection
      if (this.config.enableMetrics) {
        metricsCollector.stopCollection();
      }
      
      // Stop security monitoring
      if (this.config.enableSecurity) {
        securityEventLogger.stop();
      }
      
      // Stop logging system
      if (this.config.enableLogging) {
        await logger.close();
      }
      
      // Record shutdown metrics
      metricsCollector.setGauge('system_shutdown_timestamp', Date.now());
      metricsCollector.incrementCounter('system_shutdown_total');
      
      logger.info('System shutdown completed successfully');
      
    } catch (error) {
      logger.error('Error during system shutdown', {
        error: (error as Error).message,
      });
    } finally {
      this.isInitialized = false;
    }
  }

  public getHealth(): {
    initialized: boolean;
    uptime: number;
    config: SystemConfig;
  } {
    return {
      initialized: this.isInitialized,
      uptime: process.uptime(),
      config: this.config,
    };
  }

  public isSystemReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const systemInitializer = SystemInitializer.getInstance();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, starting graceful shutdown');
  await systemInitializer.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, starting graceful shutdown');
  await systemInitializer.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception, shutting down', {
    error: error.message,
    stack: error.stack,
  });
  
  // Try to shutdown gracefully, but don't wait too long
  setTimeout(() => {
    process.exit(1);
  }, 5000);
  
  systemInitializer.shutdown().finally(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled promise rejection, shutting down', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  
  // Try to shutdown gracefully, but don't wait too long
  setTimeout(() => {
    process.exit(1);
  }, 5000);
  
  systemInitializer.shutdown().finally(() => {
    process.exit(1);
  });
});