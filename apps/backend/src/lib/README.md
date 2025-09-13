# OPPO Comprehensive Error Handling and Logging System

A production-ready error handling, logging, monitoring, and security system built for the OPPO application.

## Features

### 🎯 Core Systems
- **Centralized Logging** with structured JSON logs
- **Comprehensive Error Handling** with detailed error classification
- **Error Recovery Strategies** with retry mechanisms and circuit breakers
- **Performance Monitoring** and metrics collection
- **Security Event Logging** for authentication and authorization
- **Client-Side Error Tracking** with enhanced error boundaries

### 📊 Monitoring & Metrics
- Real-time performance tracking
- Memory and CPU usage monitoring
- Request/response time analysis
- Database query performance tracking
- External API call monitoring
- Health checks with automatic alerts

### 🔒 Security Features
- Threat detection and monitoring
- Suspicious activity analysis
- Attack pattern recognition (XSS, SQL injection, etc.)
- IP-based threat assessment
- Security event logging and alerting

### 🔄 Recovery Mechanisms
- Automatic retry with exponential backoff
- Circuit breaker pattern for service protection
- Graceful degradation strategies
- Multi-level fallback systems

## Quick Start

### 1. Initialize the System

```typescript
import { initializeSystem } from './lib';

// Initialize with default configuration
await initializeSystem();

// Or with custom configuration
await initializeSystem({
  enableLogging: true,
  enableMetrics: true,
  enableSecurity: true,
  logLevel: 'info',
  metricsInterval: 15000,
  healthCheckInterval: 30000
});
```

### 2. Basic Usage

#### Logging
```typescript
import { logger } from './lib';

// Different log levels
logger.info('Application started');
logger.warn('Configuration missing', { config: 'database' });
logger.error('Database connection failed', { error: 'Connection timeout' });
logger.debug('Processing request', { requestId: 'req-123' });

// Specialized logging
logger.logHttp('API call completed', {
  method: 'GET',
  path: '/api/users',
  statusCode: 200,
  responseTime: 150
});

logger.logSecurity('Failed login attempt', {
  event: 'login_failure',
  severity: 'medium',
  details: { username: 'admin', attempts: 3 }
});
```

#### Error Handling
```typescript
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  errorHandler 
} from './lib';

// Throw structured errors
throw new ValidationError('Invalid email', [
  { field: 'email', constraint: 'format', suggestion: 'Please provide a valid email' }
]);

throw new NotFoundError('User', userId);

// Use in Express middleware
app.use(errorHandler.handleError);
```

#### Recovery Strategies
```typescript
import { withRetry, withRecovery, RetryStrategies } from './lib';

// Simple retry
const result = await withRetry(
  () => apiCall(),
  { maxAttempts: 3, delay: 1000 }
);

// Comprehensive recovery with circuit breaker and fallback
const data = await withRecovery(
  () => fetchUserData(userId),
  {
    retry: { maxAttempts: 3, delay: 1000 },
    circuitBreaker: { failureThreshold: 50 },
    fallback: {
      strategy: () => getCachedUserData(userId)
    }
  }
);
```

### 3. Express.js Integration

```typescript
import express from 'express';
import { 
  requestIdMiddleware,
  requestLoggingMiddleware,
  securityAwareHandler,
  performanceTrackingHandler,
  errorHandler
} from './lib';

const app = express();

// Apply middleware in order
app.use(requestIdMiddleware);           // Generate request IDs
app.use(securityAwareHandler);          // Security threat analysis
app.use(requestLoggingMiddleware);      // Request/response logging
app.use(performanceTrackingHandler);    // Performance tracking

// Your routes here
app.get('/api/users', (req, res) => {
  // Your route logic
});

// Error handling (must be last)
app.use(errorHandler.handleError);
app.use(errorHandler.handleNotFound);
```

## Advanced Usage

### Custom Error Classes

```typescript
import { AppError, ErrorCodes } from './lib';

export class PaymentError extends AppError {
  constructor(amount: number, reason: string) {
    super(
      `Payment of $${amount} failed: ${reason}`,
      402,
      ErrorCodes.PAYMENT_FAILED,
      { amount, reason }
    );
  }
}

// Usage
throw new PaymentError(99.99, 'Insufficient funds');
```

### Performance Tracking

```typescript
import { performanceTracker, TrackPerformance } from './lib';

// Manual tracking
const measurementId = performanceTracker.start({
  name: 'complex_calculation',
  labels: { algorithm: 'quicksort' }
});

// ... do work ...

const measurement = performanceTracker.end(measurementId);
console.log(`Operation took ${measurement.duration}ms`);

// Decorator-based tracking
class DataProcessor {
  @TrackPerformance({ name: 'process_data' })
  async processData(data: any[]) {
    // Method automatically tracked
    return processedData;
  }
}

// Function wrapper
const { result, measurement } = await performanceTracker.measure(
  () => heavyComputation(),
  { name: 'heavy_computation' }
);
```

### Metrics Collection

```typescript
import { metricsCollector } from './lib';

// Counter metrics
metricsCollector.incrementCounter('user_registrations', { source: 'web' });

// Gauge metrics
metricsCollector.setGauge('active_connections', connectionCount);

// Histogram metrics (for distributions)
metricsCollector.observeHistogram('request_duration_seconds', responseTime / 1000);

// Export Prometheus format
const prometheusMetrics = metricsCollector.exportPrometheus();
```

### Security Monitoring

```typescript
import { securityEventLogger, threatMonitor } from './lib';

// Log security events
securityEventLogger.logLoginFailure('admin', 'Invalid password', req, 3);
securityEventLogger.logSuspiciousActivity('Multiple failed logins', ['brute_force'], req);

// Analyze requests for threats
const threatAnalysis = threatMonitor.analyzeRequest(req);
if (threatAnalysis.shouldBlock) {
  // Block the request
  return res.status(403).json({ error: 'Request blocked' });
}
```

### Circuit Breaker Pattern

```typescript
import { CircuitBreaker, WithCircuitBreaker } from './lib';

// Manual circuit breaker
const breaker = new CircuitBreaker({
  failureThreshold: 50, // 50% failure rate
  recoveryTimeout: 30000, // 30 seconds
  name: 'external_api'
});

const result = await breaker.execute(() => externalApiCall());

// Decorator-based circuit breaker
class ApiService {
  @WithCircuitBreaker({ failureThreshold: 60, name: 'payment_api' })
  async processPayment(data: PaymentData) {
    // Method protected by circuit breaker
    return await paymentGateway.charge(data);
  }
}
```

### Health Checks

```typescript
import { healthChecker } from './lib';

// Register custom health check
healthChecker.registerCheck('redis', async () => {
  try {
    await redis.ping();
    return {
      name: 'redis',
      status: 'healthy',
      message: 'Redis connection is healthy',
      timestamp: Date.now(),
      duration: 50
    };
  } catch (error) {
    return {
      name: 'redis',
      status: 'unhealthy',
      message: `Redis connection failed: ${error.message}`,
      timestamp: Date.now(),
      duration: 50
    };
  }
});

// Get health status
const health = await healthChecker.checkHealth();
console.log(`System status: ${health.status}`);
```

## Client-Side Integration

### React Error Boundaries

```typescript
import { 
  PageErrorBoundary, 
  FeatureErrorBoundary, 
  ComponentErrorBoundary 
} from './lib/errors/boundaries/ErrorBoundary';

// Page-level error boundary
function App() {
  return (
    <PageErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={
            <FeatureErrorBoundary featureName="dashboard">
              <Dashboard />
            </FeatureErrorBoundary>
          } />
        </Routes>
      </Router>
    </PageErrorBoundary>
  );
}

// Component-level error boundary with retry
function UserProfile({ userId }: { userId: string }) {
  return (
    <ComponentErrorBoundary 
      componentName="UserProfile"
      resetKeys={[userId]}
    >
      <UserProfileContent userId={userId} />
    </ComponentErrorBoundary>
  );
}
```

### Client-Side Error Reporting

```typescript
import { errorReporter } from './lib/errors/ErrorReporter';

// Initialize error reporter
errorReporter.init();

// Set user context
errorReporter.setUser('user-123');

// Capture errors manually
try {
  await riskyOperation();
} catch (error) {
  errorReporter.captureError(error, {
    feature: 'user_profile',
    action: 'update_profile'
  });
}

// Capture network errors
errorReporter.captureNetworkError(
  '/api/users/123',
  500,
  'Internal Server Error'
);
```

## Environment Configuration

```typescript
// .env file
NODE_ENV=production
LOG_LEVEL=info
ENABLE_METRICS=true
ENABLE_SECURITY=true
HEALTH_CHECK_INTERVAL=30000
METRICS_INTERVAL=15000

// Backend initialization
import { systemInitializer } from './lib';

await systemInitializer.initialize({
  enableLogging: process.env.NODE_ENV !== 'test',
  enableMetrics: process.env.ENABLE_METRICS === 'true',
  enableSecurity: process.env.ENABLE_SECURITY === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  metricsInterval: parseInt(process.env.METRICS_INTERVAL || '15000')
});
```

## API Endpoints

The system provides several built-in endpoints for monitoring:

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = await healthChecker.checkHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metricsCollector.exportPrometheus());
});

// Performance stats
app.get('/stats/performance', (req, res) => {
  res.json(performanceTracker.getStatistics());
});

// Security summary
app.get('/stats/security', (req, res) => {
  res.json(securityEventLogger.getSecuritySummary());
});
```

## Best Practices

### 1. Error Handling
- Use specific error classes for different types of errors
- Include relevant context in error messages
- Log errors with appropriate severity levels
- Implement proper error recovery strategies

### 2. Logging
- Use structured logging with consistent field names
- Include request IDs for tracing
- Sanitize sensitive data before logging
- Set appropriate log levels for different environments

### 3. Performance
- Set reasonable thresholds for slow operations
- Monitor memory usage and clean up resources
- Use performance tracking for critical code paths
- Implement caching strategies with proper invalidation

### 4. Security
- Monitor for suspicious patterns and activities
- Implement rate limiting and request blocking
- Log all authentication and authorization events
- Regularly review security metrics and alerts

### 5. Monitoring
- Set up health checks for all critical dependencies
- Monitor key business metrics
- Implement alerting for critical issues
- Use circuit breakers for external service calls

## Testing

```typescript
import { dev } from './lib';

// Development utilities
describe('Error Handling', () => {
  test('should handle validation errors', () => {
    expect(() => dev.triggerError('validation')).toThrow(ValidationError);
  });
  
  test('should track performance', async () => {
    const stats = dev.getStats();
    expect(stats.uptime).toBeGreaterThan(0);
  });
  
  afterEach(async () => {
    await dev.reset(); // Clear metrics and logs
  });
});
```

## Migration from Legacy System

The new system is backward compatible with the existing error handling:

```typescript
// Old way (still works)
import { errorHandler } from '../middleware/error-handler';

// New way (recommended)
import { errorHandler } from './lib';
```

All existing error classes and middleware will continue to work, but you'll get additional features and better monitoring with the new system.

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Check log retention settings and metrics collection intervals
2. **Slow Performance**: Review performance thresholds and optimize slow operations
3. **Security Alerts**: Investigate threat patterns and adjust security rules
4. **Health Check Failures**: Verify all dependencies are properly configured

### Debug Mode

```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Get detailed system stats
console.log(dev.getStats());

// Monitor specific metrics
const metrics = metricsCollector.getMetrics();
console.log('Active metrics:', metrics.length);
```

## Support

For issues, questions, or contributions:
- Check the logs for detailed error information
- Use the built-in health endpoints for system status
- Review security events for potential threats
- Monitor performance metrics for optimization opportunities