/**
 * Cost Tracker
 *
 * Tracks cost and performance metrics for all provider operations.
 * Provides statistics per use case, provider, and model.
 */

import {
  UseCase,
  CostStatistics,
  PerformanceMetrics,
  CostAlert,
  CostReportConfig,
} from './types';
import { calculatePercentile } from '../shared/utils';

interface TrackedOperation {
  useCase: UseCase;
  provider: string;
  model: string;
  cost: number;
  latency: number;
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  success: boolean;
  timestamp: Date;
  error?: string;
}

export class CostTracker {
  private operations: TrackedOperation[] = [];
  private costAlerts: Map<UseCase, CostAlert> = new Map();
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Track a single operation
   */
  track(
    useCase: UseCase,
    provider: string,
    response: {
      model: string;
      cost?: number;
      latency: number;
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
    },
    error?: Error
  ): void {
    if (!this.enabled) return;

    const operation: TrackedOperation = {
      useCase,
      provider,
      model: response.model,
      cost: response.cost || 0,
      latency: response.latency,
      tokens: response.usage?.totalTokens,
      promptTokens: response.usage?.promptTokens,
      completionTokens: response.usage?.completionTokens,
      success: !error,
      timestamp: new Date(),
      error: error?.message,
    };

    this.operations.push(operation);

    // Check cost alerts
    this.checkCostAlerts(useCase);
  }

  /**
   * Get cost statistics for a specific use case or all use cases
   */
  getStats(useCase?: UseCase): CostStatistics | Record<UseCase, CostStatistics> {
    if (useCase) {
      return this.calculateStats(
        this.operations.filter(op => op.useCase === useCase)
      );
    }

    // Return stats for all use cases
    const statsByUseCase: Record<string, CostStatistics> = {};

    for (const uc of Object.values(UseCase)) {
      const ops = this.operations.filter(op => op.useCase === uc);
      if (ops.length > 0) {
        statsByUseCase[uc] = this.calculateStats(ops);
      }
    }

    return statsByUseCase as Record<UseCase, CostStatistics>;
  }

  /**
   * Get performance metrics for a specific use case or all use cases
   */
  getPerformanceMetrics(
    useCase?: UseCase
  ): PerformanceMetrics | Record<UseCase, PerformanceMetrics> {
    if (useCase) {
      return this.calculatePerformanceMetrics(
        this.operations.filter(op => op.useCase === useCase),
        useCase
      );
    }

    // Return metrics for all use cases
    const metricsByUseCase: Record<string, PerformanceMetrics> = {};

    for (const uc of Object.values(UseCase)) {
      const ops = this.operations.filter(op => op.useCase === uc);
      if (ops.length > 0) {
        metricsByUseCase[uc] = this.calculatePerformanceMetrics(ops, uc);
      }
    }

    return metricsByUseCase as Record<UseCase, PerformanceMetrics>;
  }

  /**
   * Set cost alert for a use case
   */
  setCostAlert(alert: CostAlert): void {
    this.costAlerts.set(alert.useCase, alert);
  }

  /**
   * Remove cost alert for a use case
   */
  removeCostAlert(useCase: UseCase): void {
    this.costAlerts.delete(useCase);
  }

  /**
   * Get total cost for a time period
   */
  getTotalCost(startDate?: Date, endDate?: Date): number {
    const ops = this.filterByDateRange(this.operations, startDate, endDate);
    return ops.reduce((sum, op) => sum + op.cost, 0);
  }

  /**
   * Get total requests for a time period
   */
  getTotalRequests(startDate?: Date, endDate?: Date): number {
    return this.filterByDateRange(this.operations, startDate, endDate).length;
  }

  /**
   * Generate cost report
   */
  generateCostReport(config: CostReportConfig): string {
    const { startDate, endDate } = this.getPeriodDates(config.period);
    const ops = this.filterByDateRange(this.operations, startDate, endDate);

    if (ops.length === 0) {
      return `No operations found for period: ${config.period}`;
    }

    const totalCost = ops.reduce((sum, op) => sum + op.cost, 0);
    let report = `Cost Report (${config.period})\n`;
    report += `Period: ${startDate.toISOString()} to ${endDate.toISOString()}\n`;
    report += `Total Cost: $${totalCost.toFixed(4)}\n`;
    report += `Total Requests: ${ops.length}\n\n`;

    if (config.groupBy === 'useCase') {
      report += 'By Use Case:\n';
      for (const uc of Object.values(UseCase)) {
        const ucOps = ops.filter(op => op.useCase === uc);
        if (ucOps.length > 0) {
          const ucCost = ucOps.reduce((sum, op) => sum + op.cost, 0);
          const avgCost = ucCost / ucOps.length;
          report += `  - ${uc}: $${ucCost.toFixed(4)} (${ucOps.length} requests, avg $${avgCost.toFixed(4)})\n`;
        }
      }
    } else if (config.groupBy === 'provider') {
      report += 'By Provider:\n';
      const providerCosts = this.groupBy(ops, 'provider');
      for (const [provider, provOps] of Object.entries(providerCosts)) {
        const provCost = provOps.reduce((sum, op) => sum + op.cost, 0);
        report += `  - ${provider}: $${provCost.toFixed(4)} (${provOps.length} requests)\n`;
      }
    } else if (config.groupBy === 'model') {
      report += 'By Model:\n';
      const modelCosts = this.groupBy(ops, 'model');
      for (const [model, modelOps] of Object.entries(modelCosts)) {
        const modelCost = modelOps.reduce((sum, op) => sum + op.cost, 0);
        report += `  - ${model}: $${modelCost.toFixed(4)} (${modelOps.length} requests)\n`;
      }
    }

    return report;
  }

  /**
   * Clear all tracked operations
   */
  clear(): void {
    this.operations = [];
  }

  /**
   * Clear operations older than a specific date
   */
  clearOlderThan(date: Date): void {
    this.operations = this.operations.filter(op => op.timestamp > date);
  }

  // Private helper methods

  private calculateStats(operations: TrackedOperation[]): CostStatistics {
    if (operations.length === 0) {
      return {
        provider: '',
        model: '',
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalCost: 0,
        averageCostPerRequest: 0,
        averageLatency: 0,
        successRate: 0,
      };
    }

    const successful = operations.filter(op => op.success);
    const failed = operations.filter(op => !op.success);
    const totalCost = operations.reduce((sum, op) => sum + op.cost, 0);
    const totalLatency = operations.reduce((sum, op) => sum + op.latency, 0);
    const totalTokens = operations.reduce((sum, op) => sum + (op.tokens || 0), 0);
    const totalPromptTokens = operations.reduce(
      (sum, op) => sum + (op.promptTokens || 0),
      0
    );
    const totalCompletionTokens = operations.reduce(
      (sum, op) => sum + (op.completionTokens || 0),
      0
    );

    // Get most common provider and model
    const providerCounts = this.countOccurrences(operations, 'provider');
    const modelCounts = this.countOccurrences(operations, 'model');
    const provider = Object.keys(providerCounts).sort(
      (a, b) => providerCounts[b]! - providerCounts[a]!
    )[0] || '';
    const model = Object.keys(modelCounts).sort(
      (a, b) => modelCounts[b]! - modelCounts[a]!
    )[0] || '';

    return {
      provider,
      model,
      totalRequests: operations.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      totalCost,
      averageCostPerRequest: totalCost / operations.length,
      averageLatency: totalLatency / operations.length,
      successRate: successful.length / operations.length,
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
    };
  }

  private calculatePerformanceMetrics(
    operations: TrackedOperation[],
    useCase: UseCase
  ): PerformanceMetrics {
    if (operations.length === 0) {
      return {
        useCase,
        provider: '',
        model: '',
        requests: 0,
        averageLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 0,
      };
    }

    const latencies = operations.map(op => op.latency).sort((a, b) => a - b);
    const errors = operations.filter(op => !op.success);
    const lastError = errors[errors.length - 1];

    // Get most common provider and model
    const providerCounts = this.countOccurrences(operations, 'provider');
    const modelCounts = this.countOccurrences(operations, 'model');
    const provider = Object.keys(providerCounts).sort(
      (a, b) => providerCounts[b]! - providerCounts[a]!
    )[0] || '';
    const model = Object.keys(modelCounts).sort(
      (a, b) => modelCounts[b]! - modelCounts[a]!
    )[0] || '';

    return {
      useCase,
      provider,
      model,
      requests: operations.length,
      averageLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      p50Latency: calculatePercentile(latencies, 50),
      p95Latency: calculatePercentile(latencies, 95),
      p99Latency: calculatePercentile(latencies, 99),
      errorRate: errors.length / operations.length,
      lastError: lastError?.error,
      lastErrorTime: lastError?.timestamp,
    };
  }

  private checkCostAlerts(useCase: UseCase): void {
    const alert = this.costAlerts.get(useCase);
    if (!alert) return;

    // Check daily cost for this use case
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOps = this.operations.filter(
      op => op.useCase === useCase && op.timestamp > oneDayAgo
    );
    const dailyCost = recentOps.reduce((sum, op) => sum + op.cost, 0);

    if (dailyCost > alert.dailyLimit) {
      const stats = this.calculateStats(recentOps);
      alert.onExceeded(stats);
    }
  }

  private filterByDateRange(
    operations: TrackedOperation[],
    startDate?: Date,
    endDate?: Date
  ): TrackedOperation[] {
    return operations.filter(op => {
      if (startDate && op.timestamp < startDate) return false;
      if (endDate && op.timestamp > endDate) return false;
      return true;
    });
  }

  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = now;
    let startDate: Date;

    switch (period) {
      case 'hourly':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    return { startDate, endDate };
  }

  private groupBy(
    operations: TrackedOperation[],
    key: keyof TrackedOperation
  ): Record<string, TrackedOperation[]> {
    const grouped: Record<string, TrackedOperation[]> = {};
    for (const op of operations) {
      const groupKey = String(op[key]);
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey]!.push(op);
    }
    return grouped;
  }

  private countOccurrences(
    operations: TrackedOperation[],
    key: keyof TrackedOperation
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const op of operations) {
      const value = String(op[key]);
      counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
  }
}
