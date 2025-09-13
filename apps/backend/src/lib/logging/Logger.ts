import { AsyncLocalStorage } from 'async_hooks';
import { LogLevel, loggerConfig, shouldLog } from './LoggerConfig';
import { JsonFormatter, LogEntry } from './formatters/JsonFormatter';
import { ConsoleFormatter } from './formatters/ConsoleFormatter';
import { 
  FileTransport, 
  ErrorFileTransport, 
  AccessFileTransport, 
  SecurityFileTransport,
  PerformanceFileTransport 
} from './transports/FileTransport';

// Request context interface
interface RequestContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  path?: string;
}

// Async local storage for request context
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export class Logger {
  private jsonFormatter: JsonFormatter;
  private consoleFormatter: ConsoleFormatter;
  private fileTransport: FileTransport | null = null;
  private errorFileTransport: ErrorFileTransport | null = null;
  private accessFileTransport: AccessFileTransport | null = null;
  private securityFileTransport: SecurityFileTransport | null = null;
  private performanceFileTransport: PerformanceFileTransport | null = null;

  constructor() {
    this.jsonFormatter = new JsonFormatter();
    this.consoleFormatter = new ConsoleFormatter();

    // Initialize file transports in production
    if (loggerConfig.enableFile) {
      this.fileTransport = new FileTransport();
      this.errorFileTransport = new ErrorFileTransport();
      this.accessFileTransport = new AccessFileTransport();
      this.securityFileTransport = new SecurityFileTransport();
      this.performanceFileTransport = new PerformanceFileTransport();
    }
  }

  // Context management
  static setRequestContext(context: RequestContext): void {
    const store = requestContextStorage.getStore() || {};
    requestContextStorage.enterWith({ ...store, ...context });
  }

  static getRequestContext(): RequestContext {
    return requestContextStorage.getStore() || {};
  }

  static runWithContext<T>(context: RequestContext, callback: () => T): T {
    return requestContextStorage.run(context, callback);
  }

  // Core logging methods
  fatal(message: string, context?: Record<string, any>, error?: Error): void {
    this.log('fatal', message, context, error);
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log('error', message, context, error);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  trace(message: string, context?: Record<string, any>): void {
    this.log('trace', message, context);
  }

  // Specialized logging methods
  logHttp(message: string, httpContext: LogEntry['http'], context?: Record<string, any>): void {
    this.logWithType('info', message, { ...context, http: httpContext }, undefined, 'http');
  }

  logPerformance(message: string, performance: LogEntry['performance'], context?: Record<string, any>): void {
    this.logWithType('info', message, { ...context, performance }, undefined, 'performance');
  }

  logSecurity(message: string, security: LogEntry['security'], context?: Record<string, any>): void {
    const level: LogLevel = security?.severity === 'critical' || security?.severity === 'high' ? 'error' : 'warn';
    this.logWithType(level, message, { ...context, security }, undefined, 'security');
  }

  logDatabase(message: string, database: LogEntry['database'], context?: Record<string, any>): void {
    const level: LogLevel = database?.duration && database.duration > loggerConfig.slowQueryThreshold ? 'warn' : 'debug';
    this.logWithType(level, message, { ...context, database }, undefined, 'database');
  }

  // Authentication and authorization logging
  logAuthSuccess(userId: string, method: string, context?: Record<string, any>): void {
    this.logSecurity('Authentication successful', {
      event: 'auth_success',
      severity: 'low',
      details: { userId, method, ...context }
    });
  }

  logAuthFailure(reason: string, attempt: Record<string, any>, context?: Record<string, any>): void {
    this.logSecurity('Authentication failed', {
      event: 'auth_failure',
      severity: 'medium',
      details: { reason, attempt, ...context }
    });
  }

  logAuthzFailure(userId: string, resource: string, action: string, context?: Record<string, any>): void {
    this.logSecurity('Authorization failed', {
      event: 'authz_failure',
      severity: 'medium',
      details: { userId, resource, action, ...context }
    });
  }

  logSuspiciousActivity(activity: string, severity: 'medium' | 'high' | 'critical', details: Record<string, any>): void {
    this.logSecurity('Suspicious activity detected', {
      event: 'suspicious_activity',
      severity,
      details: { activity, ...details }
    });
  }

  // Performance monitoring
  logSlowQuery(query: string, duration: number, context?: Record<string, any>): void {
    this.logDatabase('Slow database query detected', {
      operation: 'query',
      duration,
      query,
    }, context);
  }

  logSlowRequest(method: string, path: string, duration: number, context?: Record<string, any>): void {
    this.logPerformance('Slow request detected', {
      duration,
      memoryUsage: process.memoryUsage(),
    }, {
      ...context,
      http: { method, path, responseTime: duration }
    });
  }

  // Memory and resource monitoring
  logMemoryUsage(threshold?: number): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    if (!threshold || heapUsedMB > threshold) {
      const level: LogLevel = threshold && heapUsedMB > threshold ? 'warn' : 'debug';
      this.logWithType(level, 'Memory usage report', {
        memoryUsage: {
          heapUsed: heapUsedMB,
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
        }
      });
    }
  }

  // Core logging implementation
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    this.logWithType(level, message, context, error);
  }

  private logWithType(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    logType?: 'http' | 'performance' | 'security' | 'database'
  ): void {
    if (!shouldLog(level)) {
      return;
    }

    const requestContext = Logger.getRequestContext();
    
    const logEntry: Partial<LogEntry> = {
      level,
      message,
      context,
      ...requestContext,
    };

    // Add error information
    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    // Format messages
    const jsonMessage = this.jsonFormatter.format(logEntry);
    const consoleMessage = this.consoleFormatter.format(logEntry);

    // Output to console
    if (loggerConfig.enableConsole) {
      this.writeToConsole(level, consoleMessage);
    }

    // Output to files
    if (loggerConfig.enableFile) {
      this.writeToFiles(level, logEntry, jsonMessage, logType);
    }
  }

  private writeToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case 'fatal':
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'info':
        console.info(message);
        break;
      case 'debug':
      case 'trace':
        console.log(message);
        break;
    }
  }

  private async writeToFiles(
    level: LogLevel,
    logEntry: Partial<LogEntry>,
    message: string,
    logType?: string
  ): Promise<void> {
    try {
      // Write to main log file
      if (this.fileTransport) {
        await this.fileTransport.write(logEntry, message);
      }

      // Write to specialized log files
      if (level === 'error' || level === 'fatal') {
        if (this.errorFileTransport) {
          await this.errorFileTransport.write(logEntry, message);
        }
      }

      if (logType === 'http' && this.accessFileTransport) {
        await this.accessFileTransport.write(logEntry, message);
      }

      if (logType === 'security' && this.securityFileTransport) {
        await this.securityFileTransport.write(logEntry, message);
      }

      if (logType === 'performance' && this.performanceFileTransport) {
        await this.performanceFileTransport.write(logEntry, message);
      }
    } catch (error) {
      // Fallback to console if file writing fails
      console.error('Failed to write to log file:', error);
      console.error('Original log entry:', message);
    }
  }

  // Cleanup method
  async close(): Promise<void> {
    const transports = [
      this.fileTransport,
      this.errorFileTransport,
      this.accessFileTransport,
      this.securityFileTransport,
      this.performanceFileTransport,
    ];

    await Promise.all(
      transports
        .filter(transport => transport !== null)
        .map(transport => transport!.close())
    );
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Export request context utilities
export const { setRequestContext, getRequestContext, runWithContext } = Logger;