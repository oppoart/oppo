import { MonitoringService } from '../../monitoring/MonitoringService';
import { DiscoveryResult } from '../../../../../apps/backend/src/types/discovery';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let testDataDir: string;

  beforeEach(async () => {
    testDataDir = path.join(__dirname, '../../../temp/monitoring-test');
    monitoringService = new MonitoringService(testDataDir, 7); // 7 days retention
    await monitoringService.initialize();
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('initialize', () => {
    it('should create data directory', async () => {
      const stats = await fs.stat(testDataDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should load existing data if available', async () => {
      // Create test data
      const metricsPath = path.join(testDataDir, 'metrics.json');
      const testMetrics = [{
        sourceId: 'test-source',
        sourceName: 'Test Source',
        sourceType: 'test',
        totalRuns: 5,
        successfulRuns: 4,
        failedRuns: 1,
        totalOpportunitiesFound: 10,
        averageOpportunitiesPerRun: 2,
        averageProcessingTime: 5000,
        successRate: 80,
        lastRunTime: new Date().toISOString(),
        errorCount: 1,
        warningCount: 0,
        performanceMetrics: {
          p50ResponseTime: 4000,
          p90ResponseTime: 7000,
          p95ResponseTime: 8000,
          maxResponseTime: 10000,
          minResponseTime: 3000
        }
      }];

      await fs.writeFile(metricsPath, JSON.stringify(testMetrics));

      // Initialize new service
      const newService = new MonitoringService(testDataDir);
      await newService.initialize();

      const metrics = newService.getSourceMetrics('test-source');
      expect(metrics).toBeTruthy();
      expect(metrics!.totalRuns).toBe(5);
      expect(metrics!.successRate).toBe(80);
    });
  });

  describe('recordDiscoveryResult', () => {
    const createTestResult = (
      sourceId: string = 'test-source',
      errors: string[] = [],
      opportunities: number = 5,
      processingTime: number = 5000
    ): DiscoveryResult => ({
      sourceId,
      sourceName: 'Test Source',
      sourceType: 'test',
      opportunities: new Array(opportunities).fill(null).map((_, i) => ({
        title: `Opportunity ${i + 1}`,
        description: `Test opportunity ${i + 1}`,
        url: `https://example.com/opportunity/${i + 1}`,
        organization: 'Test Org',
        sourceType: 'test' as const,
        status: 'new' as const,
        processed: false,
        applied: false,
        starred: false,
        tags: ['test']
      })),
      errors,
      processingTimeMs: processingTime,
      metadata: {}
    });

    it('should record successful discovery result', async () => {
      const result = createTestResult();
      await monitoringService.recordDiscoveryResult(result);

      const metrics = monitoringService.getSourceMetrics('test-source');
      expect(metrics).toBeTruthy();
      expect(metrics!.totalRuns).toBe(1);
      expect(metrics!.successfulRuns).toBe(1);
      expect(metrics!.failedRuns).toBe(0);
      expect(metrics!.totalOpportunitiesFound).toBe(5);
      expect(metrics!.averageOpportunitiesPerRun).toBe(5);
      expect(metrics!.successRate).toBe(100);
      expect(metrics!.averageProcessingTime).toBe(5000);
    });

    it('should record failed discovery result', async () => {
      const result = createTestResult('test-source', ['Test error'], 0);
      await monitoringService.recordDiscoveryResult(result);

      const metrics = monitoringService.getSourceMetrics('test-source');
      expect(metrics).toBeTruthy();
      expect(metrics!.totalRuns).toBe(1);
      expect(metrics!.successfulRuns).toBe(0);
      expect(metrics!.failedRuns).toBe(1);
      expect(metrics!.errorCount).toBe(1);
      expect(metrics!.successRate).toBe(0);
    });

    it('should update metrics for multiple runs', async () => {
      // First run - success
      await monitoringService.recordDiscoveryResult(createTestResult('test-source', [], 5, 4000));
      
      // Second run - success  
      await monitoringService.recordDiscoveryResult(createTestResult('test-source', [], 3, 6000));
      
      // Third run - failure
      await monitoringService.recordDiscoveryResult(createTestResult('test-source', ['Error'], 0, 2000));

      const metrics = monitoringService.getSourceMetrics('test-source');
      expect(metrics!.totalRuns).toBe(3);
      expect(metrics!.successfulRuns).toBe(2);
      expect(metrics!.failedRuns).toBe(1);
      expect(metrics!.totalOpportunitiesFound).toBe(8);
      expect(metrics!.averageOpportunitiesPerRun).toBe(8 / 3);
      expect(metrics!.successRate).toBe(200 / 3);
      expect(metrics!.averageProcessingTime).toBe(4000); // (4000 + 6000 + 2000) / 3
    });

    it('should update performance metrics correctly', async () => {
      const times = [1000, 5000, 3000, 8000, 2000];
      
      for (let i = 0; i < times.length; i++) {
        await monitoringService.recordDiscoveryResult(
          createTestResult('test-source', [], 1, times[i])
        );
      }

      const metrics = monitoringService.getSourceMetrics('test-source');
      const sorted = [...times].sort((a, b) => a - b);
      
      expect(metrics!.performanceMetrics.minResponseTime).toBe(Math.min(...times));
      expect(metrics!.performanceMetrics.maxResponseTime).toBe(Math.max(...times));
      expect(metrics!.performanceMetrics.p50ResponseTime).toBe(sorted[2]); // Middle value
    });
  });

  describe('getSystemMetrics', () => {
    it('should calculate system metrics correctly', async () => {
      // Add data for multiple sources
      await monitoringService.recordDiscoveryResult(createTestResult('source1', [], 5, 3000));
      await monitoringService.recordDiscoveryResult(createTestResult('source2', [], 3, 4000));
      await monitoringService.recordDiscoveryResult(createTestResult('source3', ['Error'], 0, 2000));

      const systemMetrics = await monitoringService.getSystemMetrics();
      
      expect(systemMetrics.totalSources).toBe(3);
      expect(systemMetrics.activeSources).toBe(3); // All ran today
      expect(systemMetrics.healthySources).toBe(2); // 2 out of 3 have >80% success rate
      expect(systemMetrics.totalDiscoveryRuns).toBe(3);
      expect(systemMetrics.totalOpportunitiesFound).toBe(8);
      expect(systemMetrics.systemHealthScore).toBeGreaterThan(0);
    });

    it('should calculate time-based stats correctly', async () => {
      // Record results
      await monitoringService.recordDiscoveryResult(createTestResult('source1', [], 5));
      await monitoringService.recordDiscoveryResult(createTestResult('source2', [], 3));

      const systemMetrics = await monitoringService.getSystemMetrics();
      
      expect(systemMetrics.dailyStats.runsToday).toBe(2);
      expect(systemMetrics.dailyStats.opportunitiesFoundToday).toBe(8);
      expect(systemMetrics.dailyStats.errorsToday).toBe(0);
    });
  });

  describe('getHistoricalData', () => {
    it('should return historical data with filters', async () => {
      // Add historical data
      await monitoringService.recordDiscoveryResult(createTestResult('source1', [], 5));
      await monitoringService.recordDiscoveryResult(createTestResult('source2', [], 3));

      const allData = monitoringService.getHistoricalData();
      expect(allData).toHaveLength(2);

      const source1Data = monitoringService.getHistoricalData('source1');
      expect(source1Data).toHaveLength(1);
      expect(source1Data[0].sourceId).toBe('source1');
      expect(source1Data[0].opportunitiesFound).toBe(5);

      const recentData = monitoringService.getHistoricalData(
        undefined,
        new Date(Date.now() - 1000 * 60 * 60), // Last hour
        new Date()
      );
      expect(recentData).toHaveLength(2);
    });
  });

  describe('getPerformanceTrends', () => {
    it('should return performance trends data', async () => {
      // Add some data
      await monitoringService.recordDiscoveryResult(createTestResult('source1', [], 5, 3000));
      await monitoringService.recordDiscoveryResult(createTestResult('source1', [], 3, 4000));

      const trends = monitoringService.getPerformanceTrends(7);
      
      expect(trends.dates).toHaveLength(7);
      expect(trends.opportunitiesFound).toHaveLength(7);
      expect(trends.processingTimes).toHaveLength(7);
      expect(trends.successRates).toHaveLength(7);

      // Today should have data
      const todayIndex = trends.dates.length - 1;
      expect(trends.opportunitiesFound[todayIndex]).toBe(8);
      expect(trends.successRates[todayIndex]).toBe(100);
    });
  });

  describe('alerts', () => {
    it('should generate alerts for low success rate', async () => {
      // Configure alerts
      monitoringService.updateAlertConfig({
        enabled: true,
        thresholds: {
          successRateBelow: 80,
          responseTimeAbove: 10000,
          errorRateAbove: 20,
          noOpportunitiesFoundHours: 2
        }
      });

      // Create failing results
      for (let i = 0; i < 5; i++) {
        await monitoringService.recordDiscoveryResult(
          createTestResult('source1', ['Error'], 0)
        );
      }

      const alerts = monitoringService.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const successRateAlert = alerts.find(a => 
        a.message.includes('Success rate') && a.type === 'warning'
      );
      expect(successRateAlert).toBeTruthy();
    });

    it('should generate alerts for high response times', async () => {
      monitoringService.updateAlertConfig({
        enabled: true,
        thresholds: {
          successRateBelow: 50,
          responseTimeAbove: 5000, // 5 seconds
          errorRateAbove: 50,
          noOpportunitiesFoundHours: 2
        }
      });

      await monitoringService.recordDiscoveryResult(
        createTestResult('source1', [], 5, 10000) // 10 seconds
      );

      const alerts = monitoringService.getAlerts();
      const responseTimeAlert = alerts.find(a => 
        a.message.includes('Response time') && a.type === 'warning'
      );
      expect(responseTimeAlert).toBeTruthy();
    });

    it('should allow resolving alerts', async () => {
      monitoringService.updateAlertConfig({ enabled: true });

      // Generate an alert
      for (let i = 0; i < 5; i++) {
        await monitoringService.recordDiscoveryResult(
          createTestResult('source1', ['Error'], 0)
        );
      }

      const alerts = monitoringService.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const alertId = alerts[0].id;
      await monitoringService.resolveAlert(alertId);

      const unresolvedAlerts = monitoringService.getAlerts(true);
      expect(unresolvedAlerts.find(a => a.id === alertId)).toBeFalsy();
    });
  });

  // Helper function to create test discovery results
  const createTestResult = (
    sourceId: string = 'test-source',
    errors: string[] = [],
    opportunities: number = 5,
    processingTime: number = 5000
  ): DiscoveryResult => ({
    sourceId,
    sourceName: 'Test Source',
    sourceType: 'test',
    opportunities: new Array(opportunities).fill(null).map((_, i) => ({
      title: `Opportunity ${i + 1}`,
      description: `Test opportunity ${i + 1}`,
      url: `https://example.com/opportunity/${i + 1}`,
      organization: 'Test Org',
      sourceType: 'test' as const,
      status: 'new' as const,
      processed: false,
      applied: false,
      starred: false,
      tags: ['test']
    })),
    errors,
    processingTimeMs: processingTime,
    metadata: {}
  });
});