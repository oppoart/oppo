import { PrismaClient } from '@prisma/client';
import { healthChecker } from '../../lib/monitoring/health/HealthChecker';
import { logger } from '../../lib/logging/Logger';

export interface ServiceMetrics {
  serviceId: string;
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  uptime: number;
  errorRate: number;
  lastCheck: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  metadata?: Record<string, any>;
}

export interface SystemOverview {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: ServiceMetrics[];
  systemHealth: {
    cpu: number;
    memory: number;
    uptime: number;
    nodeVersion: string;
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  service: string;
  timestamp: Date;
  acknowledged: boolean;
  details?: Record<string, any>;
}

/**
 * Comprehensive Monitoring Service
 * Tracks system health, service metrics, and alerts
 */
export class MonitoringService {
  private prisma: PrismaClient;
  private metrics = new Map<string, ServiceMetrics>();
  private alerts: Alert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Start monitoring services
   */
  startMonitoring(intervalMs = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
        await this.updateServiceMetrics();
        await this.checkThresholds();
      } catch (error) {
        logger.error('Monitoring cycle failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, intervalMs);

    // Start health checker
    healthChecker.startPeriodicChecks(intervalMs);
    
    logger.info('Monitoring service started', { intervalMs });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    healthChecker.stopPeriodicChecks();
    logger.info('Monitoring service stopped');
  }

  /**
   * Register a service for monitoring
   */
  registerService(serviceId: string, serviceName: string): void {
    this.metrics.set(serviceId, {
      serviceId,
      serviceName,
      status: 'healthy',
      responseTime: 0,
      uptime: 0,
      errorRate: 0,
      lastCheck: new Date(),
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    });

    logger.info('Service registered for monitoring', { serviceId, serviceName });
  }

  /**
   * Record service request metric
   */
  recordRequest(
    serviceId: string, 
    success: boolean, 
    responseTime: number,
    metadata?: Record<string, any>
  ): void {
    const metric = this.metrics.get(serviceId);
    if (!metric) {
      logger.warn('Attempt to record metrics for unregistered service', { serviceId });
      return;
    }

    metric.totalRequests++;
    if (success) {
      metric.successfulRequests++;
    } else {
      metric.failedRequests++;
    }

    metric.responseTime = (metric.responseTime + responseTime) / 2; // Simple rolling average
    metric.errorRate = (metric.failedRequests / metric.totalRequests) * 100;
    metric.lastCheck = new Date();
    
    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata };
    }

    // Update status based on error rate and response time
    metric.status = this.calculateServiceStatus(metric);

    this.metrics.set(serviceId, metric);
  }

  /**
   * Get service metrics
   */
  getServiceMetrics(serviceId: string): ServiceMetrics | undefined {
    return this.metrics.get(serviceId);
  }

  /**
   * Get all service metrics
   */
  getAllServiceMetrics(): ServiceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get system overview
   */
  async getSystemOverview(): Promise<SystemOverview> {
    const services = this.getAllServiceMetrics();
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyServices > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices > 0) {
      overallStatus = 'degraded';
    }

    // Get system health data
    const memUsage = process.memoryUsage();
    const systemHealth = {
      cpu: await this.getCpuUsage(),
      memory: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      uptime: process.uptime(),
      nodeVersion: process.version
    };

    return {
      overallStatus,
      timestamp: new Date(),
      services,
      systemHealth,
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Create an alert
   */
  createAlert(
    severity: Alert['severity'],
    message: string,
    service: string,
    details?: Record<string, any>
  ): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      message,
      service,
      timestamp: new Date(),
      acknowledged: false,
      details
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn('Alert created', {
      alertId: alert.id,
      severity: alert.severity,
      service: alert.service,
      message: alert.message
    });

    // Store critical alerts in database
    if (severity === 'critical' || severity === 'error') {
      this.storeAlert(alert).catch(error => {
        logger.error('Failed to store alert', { error: error.message });
      });
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info('Alert acknowledged', { alertId });
      return true;
    }
    return false;
  }

  /**
   * Get active (unacknowledged) alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return this.alerts;
  }

  /**
   * Perform health checks on all registered services
   */
  private async performHealthChecks(): Promise<void> {
    const healthResults = await healthChecker.checkHealth();
    
    // Update service metrics based on health check results
    for (const check of healthResults.checks) {
      const metric = this.metrics.get(check.name);
      if (metric) {
        metric.status = check.status;
        metric.responseTime = check.duration;
        metric.lastCheck = new Date(check.timestamp);
        
        if (check.metadata) {
          metric.metadata = { ...metric.metadata, healthCheck: check.metadata };
        }

        this.metrics.set(check.name, metric);
      }
    }
  }

  /**
   * Update service metrics
   */
  private async updateServiceMetrics(): Promise<void> {
    const uptime = process.uptime();
    
    for (const [serviceId, metric] of this.metrics.entries()) {
      metric.uptime = uptime;
      this.metrics.set(serviceId, metric);
    }
  }

  /**
   * Check thresholds and create alerts
   */
  private async checkThresholds(): Promise<void> {
    for (const metric of this.metrics.values()) {
      // High error rate threshold
      if (metric.errorRate > 50) {
        this.createAlert(
          'critical',
          `High error rate: ${metric.errorRate.toFixed(2)}%`,
          metric.serviceId,
          { errorRate: metric.errorRate, threshold: 50 }
        );
      } else if (metric.errorRate > 25) {
        this.createAlert(
          'warning',
          `Elevated error rate: ${metric.errorRate.toFixed(2)}%`,
          metric.serviceId,
          { errorRate: metric.errorRate, threshold: 25 }
        );
      }

      // High response time threshold
      if (metric.responseTime > 5000) {
        this.createAlert(
          'error',
          `High response time: ${metric.responseTime.toFixed(2)}ms`,
          metric.serviceId,
          { responseTime: metric.responseTime, threshold: 5000 }
        );
      } else if (metric.responseTime > 2000) {
        this.createAlert(
          'warning',
          `Elevated response time: ${metric.responseTime.toFixed(2)}ms`,
          metric.serviceId,
          { responseTime: metric.responseTime, threshold: 2000 }
        );
      }

      // Service down threshold
      const lastCheckAge = Date.now() - metric.lastCheck.getTime();
      if (lastCheckAge > 300000) { // 5 minutes
        this.createAlert(
          'critical',
          `Service appears to be down`,
          metric.serviceId,
          { lastCheckMinutesAgo: Math.round(lastCheckAge / 60000) }
        );
      }
    }

    // System-wide checks
    const memUsage = process.memoryUsage();
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memoryUsagePercent > 90) {
      this.createAlert(
        'critical',
        `Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`,
        'system',
        { memoryUsage: memoryUsagePercent, threshold: 90 }
      );
    } else if (memoryUsagePercent > 80) {
      this.createAlert(
        'warning',
        `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
        'system',
        { memoryUsage: memoryUsagePercent, threshold: 80 }
      );
    }
  }

  /**
   * Calculate service status based on metrics
   */
  private calculateServiceStatus(metric: ServiceMetrics): 'healthy' | 'degraded' | 'unhealthy' {
    if (metric.errorRate > 50 || metric.responseTime > 5000) {
      return 'unhealthy';
    } else if (metric.errorRate > 25 || metric.responseTime > 2000) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Get CPU usage (simplified)
   */
  private async getCpuUsage(): Promise<number> {
    // Simple CPU usage calculation using process.cpuUsage()
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    const totalUsage = endUsage.user + endUsage.system;
    const totalTime = 100 * 1000; // 100ms in microseconds
    
    return Math.min(100, (totalUsage / totalTime) * 100);
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: Alert): Promise<void> {
    try {
      await this.prisma.systemAlert.create({
        data: {
          id: alert.id,
          severity: alert.severity,
          message: alert.message,
          service: alert.service,
          details: alert.details || {},
          acknowledged: alert.acknowledged,
          createdAt: alert.timestamp
        }
      });
    } catch (error) {
      logger.error('Failed to store alert in database', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    totalAlerts: number;
    activeAlerts: number;
  } {
    const services = this.getAllServiceMetrics();
    const activeAlerts = this.getActiveAlerts();

    return {
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      degradedServices: services.filter(s => s.status === 'degraded').length,
      unhealthyServices: services.filter(s => s.status === 'unhealthy').length,
      totalAlerts: this.alerts.length,
      activeAlerts: activeAlerts.length
    };
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; services: number }> {
    const overview = await this.getSystemOverview();
    
    return {
      status: overview.overallStatus,
      timestamp: overview.timestamp.toISOString(),
      services: overview.services.length
    };
  }
}

export const monitoringService = new MonitoringService(new PrismaClient());