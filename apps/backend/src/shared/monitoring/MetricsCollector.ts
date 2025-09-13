import { logger } from '../logging/Logger';
import { loggerConfig } from '../logging/LoggerConfig';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  labels: Record<string, string>;
  type: MetricType;
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

export interface HistogramBucket {
  le: number; // Less than or equal to
  count: number;
}

export interface HistogramMetric extends Metric {
  type: MetricType.HISTOGRAM;
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

export interface SummaryQuantile {
  quantile: number;
  value: number;
}

export interface SummaryMetric extends Metric {
  type: MetricType.SUMMARY;
  quantiles: SummaryQuantile[];
  sum: number;
  count: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, Metric> = new Map();
  private histograms: Map<string, HistogramData> = new Map();
  private summaries: Map<string, SummaryData> = new Map();
  private collectionInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCollection();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // Counter methods
  public incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);
    
    const metric: Metric = {
      name,
      value: (existing?.value || 0) + value,
      timestamp: Date.now(),
      labels,
      type: MetricType.COUNTER,
    };
    
    this.metrics.set(key, metric);
  }

  // Gauge methods
  public setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      labels,
      type: MetricType.GAUGE,
    };
    
    this.metrics.set(key, metric);
  }

  public incrementGauge(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);
    
    this.setGauge(name, (existing?.value || 0) + value, labels);
  }

  public decrementGauge(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);
    
    this.setGauge(name, (existing?.value || 0) - value, labels);
  }

  // Histogram methods
  public observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, new HistogramData(name, labels));
    }
    
    const histogram = this.histograms.get(key)!;
    histogram.observe(value);
    
    // Update metric
    const metric: HistogramMetric = {
      name,
      value: histogram.count,
      timestamp: Date.now(),
      labels,
      type: MetricType.HISTOGRAM,
      buckets: histogram.getBuckets(),
      sum: histogram.sum,
      count: histogram.count,
    };
    
    this.metrics.set(key, metric);
  }

  // Summary methods
  public observeSummary(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    
    if (!this.summaries.has(key)) {
      this.summaries.set(key, new SummaryData(name, labels));
    }
    
    const summary = this.summaries.get(key)!;
    summary.observe(value);
    
    // Update metric
    const metric: SummaryMetric = {
      name,
      value: summary.count,
      timestamp: Date.now(),
      labels,
      type: MetricType.SUMMARY,
      quantiles: summary.getQuantiles(),
      sum: summary.sum,
      count: summary.count,
    };
    
    this.metrics.set(key, metric);
  }

  // Application-specific metrics
  public recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number
  ): void {
    const labels = { method, path, status: statusCode.toString() };
    
    // Increment request counter
    this.incrementCounter('http_requests_total', labels);
    
    // Record response time
    this.observeHistogram('http_request_duration_seconds', duration / 1000, labels);
    
    // Track status codes
    this.incrementCounter('http_responses_total', { status: statusCode.toString() });
    
    // Track errors
    if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', { 
        status: statusCode.toString(),
        category: statusCode >= 500 ? 'server' : 'client'
      });
    }
  }

  public recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    success: boolean
  ): void {
    const labels = { operation, table, status: success ? 'success' : 'error' };
    
    // Increment query counter
    this.incrementCounter('database_queries_total', labels);
    
    // Record query time
    this.observeHistogram('database_query_duration_seconds', duration / 1000, labels);
    
    // Track slow queries
    if (duration > loggerConfig.slowQueryThreshold) {
      this.incrementCounter('database_slow_queries_total', { operation, table });
    }
  }

  public recordExternalApiCall(
    service: string,
    endpoint: string,
    statusCode: number,
    duration: number
  ): void {
    const labels = { service, endpoint, status: statusCode.toString() };
    
    // Increment API call counter
    this.incrementCounter('external_api_calls_total', labels);
    
    // Record response time
    this.observeHistogram('external_api_duration_seconds', duration / 1000, labels);
    
    // Track failures
    if (statusCode >= 400) {
      this.incrementCounter('external_api_errors_total', { service, status: statusCode.toString() });
    }
  }

  public recordCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    cache: string = 'default'
  ): void {
    this.incrementCounter('cache_operations_total', { operation, cache });
  }

  public recordAuthEvent(
    event: 'login' | 'logout' | 'failed_login' | 'token_refresh',
    method: string = 'unknown'
  ): void {
    this.incrementCounter('auth_events_total', { event, method });
  }

  public recordBusinessMetric(name: string, value: number, labels: Record<string, string> = {}): void {
    this.setGauge(`business_${name}`, value, labels);
  }

  // System metrics collection
  public collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Memory metrics
    this.setGauge('nodejs_memory_heap_used_bytes', memUsage.heapUsed);
    this.setGauge('nodejs_memory_heap_total_bytes', memUsage.heapTotal);
    this.setGauge('nodejs_memory_external_bytes', memUsage.external);
    this.setGauge('nodejs_memory_rss_bytes', memUsage.rss);
    
    // CPU metrics (in microseconds)
    this.setGauge('nodejs_cpu_user_seconds_total', cpuUsage.user / 1000000);
    this.setGauge('nodejs_cpu_system_seconds_total', cpuUsage.system / 1000000);
    
    // Process metrics
    this.setGauge('nodejs_process_uptime_seconds', process.uptime());
    
    // Event loop lag (if available)
    if (process.hrtime) {
      const start = process.hrtime();
      setImmediate(() => {
        const delta = process.hrtime(start);
        const nanosec = delta[0] * 1e9 + delta[1];
        this.setGauge('nodejs_eventloop_lag_seconds', nanosec / 1e9);
      });
    }
  }

  // Get metrics
  public getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  public getMetric(name: string, labels: Record<string, string> = {}): Metric | undefined {
    const key = this.getMetricKey(name, labels);
    return this.metrics.get(key);
  }

  public getMetricsByName(name: string): Metric[] {
    return this.getMetrics().filter(metric => metric.name === name);
  }

  public getMetricsByLabel(labelKey: string, labelValue: string): Metric[] {
    return this.getMetrics().filter(metric => metric.labels[labelKey] === labelValue);
  }

  // Export metrics in Prometheus format
  public exportPrometheus(): string {
    const lines: string[] = [];
    const metricGroups = new Map<string, Metric[]>();
    
    // Group metrics by name
    for (const metric of this.getMetrics()) {
      if (!metricGroups.has(metric.name)) {
        metricGroups.set(metric.name, []);
      }
      metricGroups.get(metric.name)!.push(metric);
    }
    
    // Export each group
    for (const [name, metrics] of metricGroups) {
      const firstMetric = metrics[0];
      
      // Add help and type comments
      lines.push(`# HELP ${name} ${this.getMetricHelp(name)}`);
      lines.push(`# TYPE ${name} ${firstMetric?.type || 'counter'}`);
      
      // Add metric lines
      for (const metric of metrics) {
        if (metric.type === MetricType.HISTOGRAM) {
          const hist = metric as HistogramMetric;
          // Buckets
          for (const bucket of hist.buckets) {
            const labels = this.formatLabels({ ...metric.labels, le: bucket.le.toString() });
            lines.push(`${name}_bucket${labels} ${bucket.count}`);
          }
          // Sum and count
          const baseLabels = this.formatLabels(metric.labels);
          lines.push(`${name}_sum${baseLabels} ${hist.sum}`);
          lines.push(`${name}_count${baseLabels} ${hist.count}`);
        } else if (metric.type === MetricType.SUMMARY) {
          const summ = metric as SummaryMetric;
          // Quantiles
          for (const quantile of summ.quantiles) {
            const labels = this.formatLabels({ ...metric.labels, quantile: quantile.quantile.toString() });
            lines.push(`${name}${labels} ${quantile.value}`);
          }
          // Sum and count
          const baseLabels = this.formatLabels(metric.labels);
          lines.push(`${name}_sum${baseLabels} ${summ.sum}`);
          lines.push(`${name}_count${baseLabels} ${summ.count}`);
        } else {
          const labels = this.formatLabels(metric.labels);
          lines.push(`${name}${labels} ${metric.value}`);
        }
      }
      
      lines.push(''); // Empty line between metric groups
    }
    
    return lines.join('\n');
  }

  // Clear metrics
  public clear(): void {
    this.metrics.clear();
    this.histograms.clear();
    this.summaries.clear();
  }

  public clearMetric(name: string, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    this.metrics.delete(key);
    this.histograms.delete(key);
    this.summaries.delete(key);
  }

  // Start/stop collection
  public startCollection(intervalMs: number = 15000): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
  }

  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  private getMetricKey(name: string, labels: Record<string, string>): string {
    const sortedLabels = Object.keys(labels).sort().map(key => `${key}="${labels[key]}"`).join(',');
    return `${name}{${sortedLabels}}`;
  }

  private formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return '';
    }
    
    const formattedLabels = Object.keys(labels)
      .sort()
      .map(key => `${key}="${labels[key]}"`)
      .join(',');
    
    return `{${formattedLabels}}`;
  }

  private getMetricHelp(name: string): string {
    const helpTexts: Record<string, string> = {
      'http_requests_total': 'Total number of HTTP requests',
      'http_request_duration_seconds': 'HTTP request duration in seconds',
      'http_responses_total': 'Total number of HTTP responses by status code',
      'http_errors_total': 'Total number of HTTP errors',
      'database_queries_total': 'Total number of database queries',
      'database_query_duration_seconds': 'Database query duration in seconds',
      'database_slow_queries_total': 'Total number of slow database queries',
      'external_api_calls_total': 'Total number of external API calls',
      'external_api_duration_seconds': 'External API call duration in seconds',
      'external_api_errors_total': 'Total number of external API errors',
      'cache_operations_total': 'Total number of cache operations',
      'auth_events_total': 'Total number of authentication events',
      'nodejs_memory_heap_used_bytes': 'Node.js heap memory used in bytes',
      'nodejs_memory_heap_total_bytes': 'Node.js heap memory total in bytes',
      'nodejs_memory_external_bytes': 'Node.js external memory in bytes',
      'nodejs_memory_rss_bytes': 'Node.js RSS memory in bytes',
      'nodejs_cpu_user_seconds_total': 'Node.js CPU user time in seconds',
      'nodejs_cpu_system_seconds_total': 'Node.js CPU system time in seconds',
      'nodejs_process_uptime_seconds': 'Node.js process uptime in seconds',
      'nodejs_eventloop_lag_seconds': 'Node.js event loop lag in seconds',
    };
    
    return helpTexts[name] || `Metric ${name}`;
  }
}

// Helper classes for histogram and summary data
class HistogramData {
  public sum: number = 0;
  public count: number = 0;
  private buckets: Map<number, number> = new Map();
  private bucketBounds: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, Infinity];
  
  constructor(private name: string, private labels: Record<string, string>) {
    for (const bound of this.bucketBounds) {
      this.buckets.set(bound, 0);
    }
  }

  observe(value: number): void {
    this.sum += value;
    this.count++;
    
    for (const bound of this.bucketBounds) {
      if (value <= bound) {
        this.buckets.set(bound, this.buckets.get(bound)! + 1);
      }
    }
  }

  getBuckets(): HistogramBucket[] {
    return Array.from(this.buckets.entries()).map(([le, count]) => ({ le, count }));
  }
}

class SummaryData {
  public sum: number = 0;
  public count: number = 0;
  private observations: number[] = [];
  private quantiles: number[] = [0.5, 0.9, 0.95, 0.99];
  
  constructor(private name: string, private labels: Record<string, string>) {}

  observe(value: number): void {
    this.sum += value;
    this.count++;
    this.observations.push(value);
    
    // Keep only recent observations (last 1000)
    if (this.observations.length > 1000) {
      this.observations = this.observations.slice(-1000);
    }
  }

  getQuantiles(): SummaryQuantile[] {
    if (this.observations.length === 0) {
      return this.quantiles.map(q => ({ quantile: q, value: 0 }));
    }
    
    const sorted = [...this.observations].sort((a, b) => a - b);
    
    return this.quantiles.map(q => ({
      quantile: q,
      value: this.calculateQuantile(sorted, q),
    }));
  }

  private calculateQuantile(sortedValues: number[], quantile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil(sortedValues.length * quantile) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))] || 0;
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();