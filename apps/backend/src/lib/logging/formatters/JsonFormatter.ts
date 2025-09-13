import os from 'os';
import { LogLevel, loggerConfig } from '../LoggerConfig';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  version: string;
  environment: string;
  hostname?: string;
  pid?: number;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration: number;
    memoryUsage?: NodeJS.MemoryUsage;
  };
  security?: {
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details?: Record<string, any>;
  };
  http?: {
    method: string;
    path: string;
    statusCode?: number;
    userAgent?: string;
    ip?: string;
    referer?: string;
    responseTime?: number;
  };
  database?: {
    operation: string;
    table?: string;
    duration?: number;
    query?: string;
  };
}

export class JsonFormatter {
  private sensitiveFieldRegex: RegExp;

  constructor() {
    // Create regex pattern for sensitive fields
    const pattern = loggerConfig.sensitiveFields.join('|');
    this.sensitiveFieldRegex = new RegExp(`\\b(${pattern})\\b`, 'gi');
  }

  format(entry: Partial<LogEntry>): string {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: entry.level || 'info',
      message: entry.message || '',
      service: loggerConfig.service,
      version: loggerConfig.version,
      environment: loggerConfig.environment,
      ...entry,
    };

    // Add system information
    if (loggerConfig.includeHostname) {
      logEntry.hostname = os.hostname();
    }

    if (loggerConfig.includeProcessId) {
      logEntry.pid = process.pid;
    }

    // Sanitize sensitive data
    this.sanitizeLogEntry(logEntry);

    return JSON.stringify(logEntry);
  }

  private sanitizeLogEntry(entry: LogEntry): void {
    if (entry.context) {
      entry.context = this.sanitizeObject(entry.context);
    }

    if (entry.http?.userAgent) {
      // Keep user agent but remove potential sensitive query parameters
      entry.http.userAgent = entry.http.userAgent.replace(/[?&]([^=]+)=([^&]*)/g, (match, key) => {
        if (this.isSensitiveField(key)) {
          return `${key}=[REDACTED]`;
        }
        return match;
      });
    }

    if (entry.database?.query) {
      entry.database.query = this.sanitizeString(entry.database.query);
    }

    if (entry.security?.details) {
      entry.security.details = this.sanitizeObject(entry.security.details);
    }
  }

  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? this.sanitizeObject(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
      return str;
    }

    // Replace JWT tokens
    str = str.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, 'Bearer [REDACTED]');
    
    // Replace API keys (common patterns)
    str = str.replace(/[A-Za-z0-9]{20,}/g, (match) => {
      // Only redact if it looks like a key/token
      if (/^[A-Za-z0-9+/=]{20,}$/.test(match)) {
        return '[REDACTED]';
      }
      return match;
    });

    // Replace sensitive field patterns
    str = str.replace(this.sensitiveFieldRegex, '[REDACTED]');

    return str;
  }

  private isSensitiveField(field: string): boolean {
    const lowerField = field.toLowerCase();
    return loggerConfig.sensitiveFields.some(sensitive => 
      lowerField.includes(sensitive.toLowerCase())
    );
  }
}