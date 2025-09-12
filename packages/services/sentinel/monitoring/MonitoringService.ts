import * as fs from 'fs/promises';
import * as path from 'path';
import { DiscoveryResult } from '../../../../apps/backend/src/types/discovery';

/**
 * Discovery metrics collected per source
 */
export interface DiscoveryMetrics {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalOpportunitiesFound: number;
  averageOpportunitiesPerRun: number;
  averageProcessingTime: number;
  successRate: number;
  lastRunTime: Date | null;
  errorCount: number;
  warningCount: number;
  costMetrics?: {
    totalCost: number;
    costPerOpportunity: number;
    apiCallsUsed: number;
  };
  performanceMetrics: {
    p50ResponseTime: number;
    p90ResponseTime: number;
    p95ResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  };
}

/**
 * System-wide discovery metrics
 */
export interface SystemMetrics {
  totalSources: number;
  activeSources: number;
  healthySources: number;
  totalDiscoveryRuns: number;
  totalOpportunitiesFound: number;
  averageProcessingTimeAcrossAllSources: number;
  systemUptime: number;
  systemHealthScore: number; // 0-100
  resourceUsage: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
  dailyStats: {
    runsToday: number;
    opportunitiesFoundToday: number;
    errorsToday: number;
  };
  weeklyStats: {
    runsThisWeek: number;
    opportunitiesFoundThisWeek: number;
    errorsThisWeek: number;
  };
  monthlyStats: {
    runsThisMonth: number;
    opportunitiesFoundThisMonth: number;
    errorsThisMonth: number;
  };
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  enabled: boolean;
  thresholds: {
    successRateBelow: number; // Alert if success rate drops below this percentage
    responseTimeAbove: number; // Alert if response time goes above this (ms)
    errorRateAbove: number; // Alert if error rate goes above this percentage
    noOpportunitiesFoundHours: number; // Alert if no opportunities found in X hours
  };
  notifications: {
    email?: {
      enabled: boolean;
      recipients: string[];
      smtpConfig?: any;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      secret?: string;
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
  };
}

/**
 * Alert entry
 */
export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  source: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Historical data point
 */
export interface HistoricalDataPoint {
  timestamp: Date;
  sourceId: string;
  opportunitiesFound: number;
  processingTime: number;
  success: boolean;
  errorCount: number;
  cost?: number;
}

/**
 * Monitoring Service for tracking discovery system performance
 */
export class MonitoringService {
  private metricsStorage: Map<string, DiscoveryMetrics> = new Map();
  private alertsStorage: Alert[] = [];
  private historicalData: HistoricalDataPoint[] = [];
  private systemStartTime: Date = new Date();
  private dataDir: string;
  private alertConfig: AlertConfig;
  private retentionDays: number;

  constructor(
    dataDir: string = './monitoring/data',
    retentionDays: number = 30
  ) {
    this.dataDir = dataDir;
    this.retentionDays = retentionDays;
    
    this.alertConfig = {
      enabled: process.env.MONITORING_ENABLED === 'true',
      thresholds: {
        successRateBelow: 70,
        responseTimeAbove: 120000, // 2 minutes
        errorRateAbove: 10,
        noOpportunitiesFoundHours: 6
      },
      notifications: {
        email: {
          enabled: false,
          recipients: []
        },
        webhook: {
          enabled: false,
          url: ''
        },
        slack: {
          enabled: false,
          webhookUrl: '',
          channel: '#alerts'
        }
      }
    };
  }

  /**
   * Initialize monitoring service
   */
  async initialize(): Promise<void> {
    console.log('Initializing Monitoring Service...');
    
    // Create data directory
    await this.ensureDataDirectory();
    
    // Load existing data
    await this.loadMetrics();
    await this.loadHistoricalData();
    await this.loadAlerts();
    
    // Start cleanup routine
    this.startCleanupRoutine();
    
    console.log(`Monitoring service initialized. Tracking ${this.metricsStorage.size} sources.`);
  }

  /**
   * Record discovery result
   */
  async recordDiscoveryResult(result: DiscoveryResult): Promise<void> {
    const sourceId = result.sourceId;
    const isSuccess = result.errors.length === 0;
    const opportunitiesFound = result.opportunities.length;
    const processingTime = result.processingTimeMs;

    // Update or create metrics
    let metrics = this.metricsStorage.get(sourceId);
    if (!metrics) {
      metrics = this.createInitialMetrics(result);
      this.metricsStorage.set(sourceId, metrics);
    }

    // Update metrics
    metrics.totalRuns++;
    metrics.lastRunTime = new Date();
    
    if (isSuccess) {
      metrics.successfulRuns++;
    } else {
      metrics.failedRuns++;
    }

    metrics.totalOpportunitiesFound += opportunitiesFound;
    metrics.averageOpportunitiesPerRun = metrics.totalOpportunitiesFound / metrics.totalRuns;
    metrics.errorCount += result.errors.length;
    
    // Update success rate
    metrics.successRate = (metrics.successfulRuns / metrics.totalRuns) * 100;
    
    // Update processing time
    this.updateProcessingTimeMetrics(metrics, processingTime);

    // Record historical data point
    const dataPoint: HistoricalDataPoint = {
      timestamp: new Date(),
      sourceId: sourceId,
      opportunitiesFound: opportunitiesFound,
      processingTime: processingTime,
      success: isSuccess,
      errorCount: result.errors.length
    };
    
    this.historicalData.push(dataPoint);

    // Check for alerts
    await this.checkAlerts(metrics, result);

    // Save metrics
    await this.saveMetrics();
    await this.saveHistoricalData();
    
    console.log(`Recorded metrics for ${sourceId}: ${opportunitiesFound} opportunities, ${processingTime}ms`);
  }

  /**
   * Get metrics for a specific source
   */
  getSourceMetrics(sourceId: string): DiscoveryMetrics | null {
    return this.metricsStorage.get(sourceId) || null;
  }

  /**
   * Get metrics for all sources
   */
  getAllSourceMetrics(): DiscoveryMetrics[] {
    return Array.from(this.metricsStorage.values());
  }

  /**
   * Get system-wide metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const allMetrics = this.getAllSourceMetrics();
    const now = new Date();
    
    // Calculate basic stats
    const totalSources = allMetrics.length;
    const activeSources = allMetrics.filter(m => 
      m.lastRunTime && (now.getTime() - m.lastRunTime.getTime()) < (24 * 60 * 60 * 1000)
    ).length;
    const healthySources = allMetrics.filter(m => m.successRate >= 80).length;
    
    const totalRuns = allMetrics.reduce((sum, m) => sum + m.totalRuns, 0);
    const totalOpportunities = allMetrics.reduce((sum, m) => sum + m.totalOpportunitiesFound, 0);
    const avgProcessingTime = totalRuns > 0 
      ? allMetrics.reduce((sum, m) => sum + (m.averageProcessingTime * m.totalRuns), 0) / totalRuns
      : 0;

    // Calculate time-based stats
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyData = this.historicalData.filter(d => d.timestamp >= oneDayAgo);
    const weeklyData = this.historicalData.filter(d => d.timestamp >= oneWeekAgo);
    const monthlyData = this.historicalData.filter(d => d.timestamp >= oneMonthAgo);

    // Calculate system health score
    const healthScore = this.calculateSystemHealthScore(allMetrics);
    
    // Get resource usage
    const resourceUsage = await this.getResourceUsage();

    return {
      totalSources,
      activeSources,
      healthySources,
      totalDiscoveryRuns: totalRuns,
      totalOpportunitiesFound: totalOpportunities,
      averageProcessingTimeAcrossAllSources: avgProcessingTime,
      systemUptime: now.getTime() - this.systemStartTime.getTime(),
      systemHealthScore: healthScore,
      resourceUsage,
      dailyStats: {
        runsToday: dailyData.length,
        opportunitiesFoundToday: dailyData.reduce((sum, d) => sum + d.opportunitiesFound, 0),
        errorsToday: dailyData.reduce((sum, d) => sum + d.errorCount, 0)
      },
      weeklyStats: {
        runsThisWeek: weeklyData.length,
        opportunitiesFoundThisWeek: weeklyData.reduce((sum, d) => sum + d.opportunitiesFound, 0),
        errorsThisWeek: weeklyData.reduce((sum, d) => sum + d.errorCount, 0)
      },
      monthlyStats: {
        runsThisMonth: monthlyData.length,
        opportunitiesFoundThisMonth: monthlyData.reduce((sum, d) => sum + d.opportunitiesFound, 0),
        errorsThisMonth: monthlyData.reduce((sum, d) => sum + d.errorCount, 0)
      }
    };
  }

  /**
   * Get historical data for visualization
   */
  getHistoricalData(
    sourceId?: string, 
    fromDate?: Date, 
    toDate?: Date
  ): HistoricalDataPoint[] {
    let data = [...this.historicalData];

    if (sourceId) {
      data = data.filter(d => d.sourceId === sourceId);
    }

    if (fromDate) {
      data = data.filter(d => d.timestamp >= fromDate);
    }

    if (toDate) {
      data = data.filter(d => d.timestamp <= toDate);
    }

    return data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get alerts
   */
  getAlerts(unreadOnly: boolean = false): Alert[] {
    let alerts = [...this.alertsStorage];
    
    if (unreadOnly) {
      alerts = alerts.filter(a => !a.resolved);
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Mark alert as resolved
   */
  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alertsStorage.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      await this.saveAlerts();
    }
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  /**
   * Get performance trend data
   */
  getPerformanceTrends(days: number = 7): {
    dates: string[];
    opportunitiesFound: number[];
    processingTimes: number[];
    successRates: number[];
  } {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const dates: string[] = [];
    const opportunitiesFound: number[] = [];
    const processingTimes: number[] = [];
    const successRates: number[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayData = this.historicalData.filter(d => 
        d.timestamp >= dayStart && d.timestamp <= dayEnd
      );
      
      const totalOpportunities = dayData.reduce((sum, d) => sum + d.opportunitiesFound, 0);
      const avgProcessingTime = dayData.length > 0 
        ? dayData.reduce((sum, d) => sum + d.processingTime, 0) / dayData.length
        : 0;
      const successCount = dayData.filter(d => d.success).length;
      const successRate = dayData.length > 0 ? (successCount / dayData.length) * 100 : 0;
      
      opportunitiesFound.push(totalOpportunities);
      processingTimes.push(avgProcessingTime);
      successRates.push(successRate);
    }
    
    return {
      dates,
      opportunitiesFound,
      processingTimes,
      successRates
    };
  }

  /**
   * Create initial metrics for a new source
   */
  private createInitialMetrics(result: DiscoveryResult): DiscoveryMetrics {
    return {
      sourceId: result.sourceId,
      sourceName: result.sourceName,
      sourceType: result.sourceType,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalOpportunitiesFound: 0,
      averageOpportunitiesPerRun: 0,
      averageProcessingTime: 0,
      successRate: 0,
      lastRunTime: null,
      errorCount: 0,
      warningCount: 0,
      performanceMetrics: {
        p50ResponseTime: 0,
        p90ResponseTime: 0,
        p95ResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Number.MAX_SAFE_INTEGER
      }
    };
  }

  /**
   * Update processing time metrics with percentiles
   */
  private updateProcessingTimeMetrics(metrics: DiscoveryMetrics, newTime: number): void {
    // Get recent processing times for percentile calculation
    const recentTimes = this.historicalData
      .filter(d => d.sourceId === metrics.sourceId)
      .slice(-100) // Last 100 runs
      .map(d => d.processingTime)
      .concat([newTime])
      .sort((a, b) => a - b);

    if (recentTimes.length > 0) {
      metrics.performanceMetrics.minResponseTime = Math.min(
        metrics.performanceMetrics.minResponseTime, 
        newTime
      );
      metrics.performanceMetrics.maxResponseTime = Math.max(
        metrics.performanceMetrics.maxResponseTime, 
        newTime
      );

      // Calculate percentiles
      const p50Index = Math.floor(recentTimes.length * 0.5);
      const p90Index = Math.floor(recentTimes.length * 0.9);
      const p95Index = Math.floor(recentTimes.length * 0.95);

      metrics.performanceMetrics.p50ResponseTime = recentTimes[p50Index];
      metrics.performanceMetrics.p90ResponseTime = recentTimes[p90Index];
      metrics.performanceMetrics.p95ResponseTime = recentTimes[p95Index];
    }

    // Update average
    metrics.averageProcessingTime = (
      (metrics.averageProcessingTime * (metrics.totalRuns - 1)) + newTime
    ) / metrics.totalRuns;
  }

  /**
   * Check for alert conditions
   */
  private async checkAlerts(metrics: DiscoveryMetrics, result: DiscoveryResult): Promise<void> {
    if (!this.alertConfig.enabled) return;

    const alerts: Alert[] = [];

    // Success rate alert
    if (metrics.successRate < this.alertConfig.thresholds.successRateBelow) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'warning',
        source: metrics.sourceId,
        message: `Success rate dropped to ${metrics.successRate.toFixed(1)}% for ${metrics.sourceName}`,
        timestamp: new Date(),
        resolved: false,
        metadata: {
          successRate: metrics.successRate,
          threshold: this.alertConfig.thresholds.successRateBelow
        }
      });
    }

    // Response time alert
    if (result.processingTimeMs > this.alertConfig.thresholds.responseTimeAbove) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'warning',
        source: metrics.sourceId,
        message: `Response time of ${result.processingTimeMs}ms exceeds threshold for ${metrics.sourceName}`,
        timestamp: new Date(),
        resolved: false,
        metadata: {
          responseTime: result.processingTimeMs,
          threshold: this.alertConfig.thresholds.responseTimeAbove
        }
      });
    }

    // Error rate alert
    if (result.errors.length > 0) {
      const recentRuns = this.historicalData
        .filter(d => d.sourceId === metrics.sourceId)
        .slice(-10); // Last 10 runs
      
      const recentErrorRate = recentRuns.length > 0 
        ? (recentRuns.filter(d => d.errorCount > 0).length / recentRuns.length) * 100
        : 0;

      if (recentErrorRate > this.alertConfig.thresholds.errorRateAbove) {
        alerts.push({
          id: this.generateAlertId(),
          type: 'error',
          source: metrics.sourceId,
          message: `Error rate of ${recentErrorRate.toFixed(1)}% exceeds threshold for ${metrics.sourceName}`,
          timestamp: new Date(),
          resolved: false,
          metadata: {
            errorRate: recentErrorRate,
            threshold: this.alertConfig.thresholds.errorRateAbove,
            errors: result.errors
          }
        });
      }
    }

    // No opportunities found alert
    if (result.opportunities.length === 0) {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - this.alertConfig.thresholds.noOpportunitiesFoundHours);
      
      const recentOpportunities = this.historicalData
        .filter(d => d.sourceId === metrics.sourceId && d.timestamp >= hoursAgo)
        .reduce((sum, d) => sum + d.opportunitiesFound, 0);

      if (recentOpportunities === 0) {
        alerts.push({
          id: this.generateAlertId(),
          type: 'warning',
          source: metrics.sourceId,
          message: `No opportunities found in the last ${this.alertConfig.thresholds.noOpportunitiesFoundHours} hours for ${metrics.sourceName}`,
          timestamp: new Date(),
          resolved: false,
          metadata: {
            hoursWithoutOpportunities: this.alertConfig.thresholds.noOpportunitiesFoundHours
          }
        });
      }
    }

    // Add alerts and send notifications
    for (const alert of alerts) {
      this.alertsStorage.push(alert);
      await this.sendNotification(alert);
    }

    if (alerts.length > 0) {
      await this.saveAlerts();
    }
  }

  /**
   * Send alert notification
   */
  private async sendNotification(alert: Alert): Promise<void> {
    try {
      // Webhook notification
      if (this.alertConfig.notifications.webhook?.enabled) {
        await fetch(this.alertConfig.notifications.webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert,
            timestamp: alert.timestamp.toISOString(),
            system: 'Sentinel Discovery System'
          })
        });
      }

      // Slack notification
      if (this.alertConfig.notifications.slack?.enabled) {
        const slackMessage = {
          channel: this.alertConfig.notifications.slack.channel,
          text: `🚨 Alert: ${alert.message}`,
          attachments: [{
            color: alert.type === 'error' ? 'danger' : 'warning',
            fields: [
              { title: 'Source', value: alert.source, short: true },
              { title: 'Type', value: alert.type.toUpperCase(), short: true },
              { title: 'Time', value: alert.timestamp.toISOString(), short: false }
            ]
          }]
        };

        await fetch(this.alertConfig.notifications.slack.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackMessage)
        });
      }

      console.log(`Sent notification for alert: ${alert.message}`);

    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Calculate system health score
   */
  private calculateSystemHealthScore(metrics: DiscoveryMetrics[]): number {
    if (metrics.length === 0) return 0;

    let totalScore = 0;
    let weightedCount = 0;

    for (const metric of metrics) {
      let sourceScore = 0;
      
      // Success rate (40% weight)
      sourceScore += (metric.successRate / 100) * 40;
      
      // Recent activity (30% weight)
      const daysSinceLastRun = metric.lastRunTime 
        ? (Date.now() - metric.lastRunTime.getTime()) / (1000 * 60 * 60 * 24)
        : 30;
      const activityScore = Math.max(0, Math.min(1, (7 - daysSinceLastRun) / 7));
      sourceScore += activityScore * 30;
      
      // Performance (20% weight)
      const avgResponseTime = metric.averageProcessingTime;
      const performanceScore = avgResponseTime < 30000 ? 1 : Math.max(0, 1 - (avgResponseTime - 30000) / 120000);
      sourceScore += performanceScore * 20;
      
      // Error rate (10% weight)
      const errorRate = metric.totalRuns > 0 ? (metric.failedRuns / metric.totalRuns) : 0;
      const errorScore = Math.max(0, 1 - errorRate);
      sourceScore += errorScore * 10;
      
      totalScore += sourceScore * metric.totalRuns; // Weight by usage
      weightedCount += metric.totalRuns;
    }

    return weightedCount > 0 ? Math.round((totalScore / weightedCount)) : 0;
  }

  /**
   * Get system resource usage
   */
  private async getResourceUsage(): Promise<{ memoryUsage: number; cpuUsage: number; diskUsage: number }> {
    try {
      // Node.js memory usage
      const memUsage = process.memoryUsage();
      const memoryUsage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

      // Basic CPU usage estimation (not accurate, would need external tools for real CPU monitoring)
      const cpuUsage = 0; // Placeholder - would integrate with system monitoring tools

      // Disk usage for data directory
      let diskUsage = 0;
      try {
        const stats = await fs.stat(this.dataDir);
        diskUsage = Math.round(stats.size / (1024 * 1024)); // MB
      } catch (error) {
        // Directory might not exist yet
      }

      return { memoryUsage, cpuUsage, diskUsage };

    } catch (error) {
      console.warn('Failed to get resource usage:', error);
      return { memoryUsage: 0, cpuUsage: 0, diskUsage: 0 };
    }
  }

  /**
   * Start cleanup routine for old data
   */
  private startCleanupRoutine(): void {
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    setInterval(async () => {
      await this.cleanupOldData();
    }, cleanupInterval);

    // Initial cleanup
    this.cleanupOldData();
  }

  /**
   * Clean up old data based on retention policy
   */
  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    // Clean historical data
    const beforeCount = this.historicalData.length;
    this.historicalData = this.historicalData.filter(d => d.timestamp >= cutoffDate);
    
    // Clean resolved alerts older than retention period
    this.alertsStorage = this.alertsStorage.filter(a => 
      !a.resolved || a.timestamp >= cutoffDate
    );

    const afterCount = this.historicalData.length;
    
    if (beforeCount !== afterCount) {
      console.log(`Cleaned up ${beforeCount - afterCount} old data points`);
      await this.saveHistoricalData();
      await this.saveAlerts();
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  /**
   * Load metrics from storage
   */
  private async loadMetrics(): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, 'metrics.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const metricsArray = JSON.parse(data);
      
      this.metricsStorage.clear();
      for (const metrics of metricsArray) {
        if (metrics.lastRunTime) {
          metrics.lastRunTime = new Date(metrics.lastRunTime);
        }
        this.metricsStorage.set(metrics.sourceId, metrics);
      }
      
      console.log(`Loaded ${metricsArray.length} metrics from storage`);
    } catch (error) {
      console.log('No existing metrics found, starting fresh');
    }
  }

  /**
   * Save metrics to storage
   */
  private async saveMetrics(): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, 'metrics.json');
      const metricsArray = Array.from(this.metricsStorage.values());
      await fs.writeFile(filePath, JSON.stringify(metricsArray, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  /**
   * Load historical data from storage
   */
  private async loadHistoricalData(): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, 'historical.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const historicalArray = JSON.parse(data);
      
      this.historicalData = historicalArray.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      
      console.log(`Loaded ${historicalArray.length} historical data points`);
    } catch (error) {
      console.log('No existing historical data found, starting fresh');
    }
  }

  /**
   * Save historical data to storage
   */
  private async saveHistoricalData(): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, 'historical.json');
      await fs.writeFile(filePath, JSON.stringify(this.historicalData, null, 2));
    } catch (error) {
      console.error('Failed to save historical data:', error);
    }
  }

  /**
   * Load alerts from storage
   */
  private async loadAlerts(): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, 'alerts.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const alertsArray = JSON.parse(data);
      
      this.alertsStorage = alertsArray.map((alert: any) => ({
        ...alert,
        timestamp: new Date(alert.timestamp),
        resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined
      }));
      
      console.log(`Loaded ${alertsArray.length} alerts from storage`);
    } catch (error) {
      console.log('No existing alerts found, starting fresh');
    }
  }

  /**
   * Save alerts to storage
   */
  private async saveAlerts(): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, 'alerts.json');
      await fs.writeFile(filePath, JSON.stringify(this.alertsStorage, null, 2));
    } catch (error) {
      console.error('Failed to save alerts:', error);
    }
  }
}