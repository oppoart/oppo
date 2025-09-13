import { LogLevel } from '../LoggerConfig';
import { LogEntry } from './JsonFormatter';

// Console color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

export class ConsoleFormatter {
  private isColorEnabled: boolean;

  constructor(enableColors: boolean = true) {
    this.isColorEnabled = enableColors && process.stdout.isTTY;
  }

  format(entry: Partial<LogEntry>): string {
    const timestamp = this.formatTimestamp(entry.timestamp || new Date().toISOString());
    const level = this.formatLevel(entry.level || 'info');
    const message = entry.message || '';
    const service = entry.service || 'unknown';
    
    let logLine = `${timestamp} ${level} [${service}]`;
    
    // Add request ID if present
    if (entry.requestId) {
      logLine += ` [${this.colorize(entry.requestId, colors.cyan)}]`;
    }
    
    // Add user ID if present
    if (entry.userId) {
      logLine += ` [user:${this.colorize(entry.userId, colors.blue)}]`;
    }
    
    logLine += ` ${message}`;
    
    // Add context information
    if (entry.http) {
      logLine += this.formatHttpContext(entry.http);
    }
    
    if (entry.performance) {
      logLine += this.formatPerformanceContext(entry.performance);
    }
    
    if (entry.database) {
      logLine += this.formatDatabaseContext(entry.database);
    }
    
    if (entry.security) {
      logLine += this.formatSecurityContext(entry.security);
    }
    
    // Add error details
    if (entry.error) {
      logLine += this.formatError(entry.error);
    }
    
    // Add additional context
    if (entry.context && Object.keys(entry.context).length > 0) {
      logLine += `\n${this.colorize('Context:', colors.dim)} ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    return logLine;
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const formatted = date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return this.colorize(`[${formatted}]`, colors.dim);
  }

  private formatLevel(level: LogLevel): string {
    const levelColors: Record<LogLevel, string> = {
      fatal: colors.bgRed + colors.white,
      error: colors.red,
      warn: colors.yellow,
      info: colors.green,
      debug: colors.blue,
      trace: colors.magenta,
    };
    
    const color = levelColors[level] || colors.reset;
    const paddedLevel = level.toUpperCase().padEnd(5);
    
    return this.colorize(paddedLevel, color);
  }

  private formatHttpContext(http: LogEntry['http']): string {
    if (!http) return '';
    
    let context = '';
    
    if (http.method && http.path) {
      const methodColor = this.getHttpMethodColor(http.method);
      context += ` ${this.colorize(http.method, methodColor)} ${http.path}`;
    }
    
    if (http.statusCode) {
      const statusColor = this.getHttpStatusColor(http.statusCode);
      context += ` ${this.colorize(http.statusCode.toString(), statusColor)}`;
    }
    
    if (http.responseTime) {
      const timeColor = http.responseTime > 1000 ? colors.red : colors.green;
      context += ` ${this.colorize(`${http.responseTime}ms`, timeColor)}`;
    }
    
    if (http.ip) {
      context += ` ${this.colorize(`[${http.ip}]`, colors.dim)}`;
    }
    
    return context;
  }

  private formatPerformanceContext(performance: LogEntry['performance']): string {
    if (!performance) return '';
    
    let context = '';
    
    if (performance.duration) {
      const durationColor = performance.duration > 1000 ? colors.red : colors.yellow;
      context += ` ${this.colorize(`⏱️ ${performance.duration}ms`, durationColor)}`;
    }
    
    if (performance.memoryUsage) {
      const memMB = Math.round(performance.memoryUsage.heapUsed / 1024 / 1024);
      context += ` ${this.colorize(`💾 ${memMB}MB`, colors.cyan)}`;
    }
    
    return context;
  }

  private formatDatabaseContext(database: LogEntry['database']): string {
    if (!database) return '';
    
    let context = ` ${this.colorize('🗄️', colors.blue)}`;
    
    if (database.operation) {
      context += ` ${database.operation}`;
    }
    
    if (database.table) {
      context += ` ${this.colorize(database.table, colors.cyan)}`;
    }
    
    if (database.duration) {
      const durationColor = database.duration > 500 ? colors.red : colors.green;
      context += ` ${this.colorize(`${database.duration}ms`, durationColor)}`;
    }
    
    return context;
  }

  private formatSecurityContext(security: LogEntry['security']): string {
    if (!security) return '';
    
    const severityColors = {
      low: colors.blue,
      medium: colors.yellow,
      high: colors.red,
      critical: colors.bgRed + colors.white,
    };
    
    const icon = security.severity === 'critical' ? '🚨' : '🔒';
    const severityColor = severityColors[security.severity] || colors.reset;
    
    return ` ${icon} ${this.colorize(security.event, severityColor)}`;
  }

  private formatError(error: LogEntry['error']): string {
    if (!error) return '';
    
    let errorText = `\n${this.colorize('❌ Error:', colors.red)} ${error.name}: ${error.message}`;
    
    if (error.code) {
      errorText += ` ${this.colorize(`[${error.code}]`, colors.yellow)}`;
    }
    
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(1, 6); // Show first 5 stack frames
      errorText += `\n${this.colorize('Stack:', colors.dim)}\n${stackLines.map(line => `  ${line}`).join('\n')}`;
    }
    
    return errorText;
  }

  private getHttpMethodColor(method: string): string {
    const methodColors: Record<string, string> = {
      GET: colors.green,
      POST: colors.blue,
      PUT: colors.yellow,
      PATCH: colors.magenta,
      DELETE: colors.red,
      OPTIONS: colors.cyan,
      HEAD: colors.dim,
    };
    
    return methodColors[method.toUpperCase()] || colors.reset;
  }

  private getHttpStatusColor(statusCode: number): string {
    if (statusCode >= 500) return colors.red;
    if (statusCode >= 400) return colors.yellow;
    if (statusCode >= 300) return colors.cyan;
    if (statusCode >= 200) return colors.green;
    return colors.reset;
  }

  private colorize(text: string, color: string): string {
    if (!this.isColorEnabled) return text;
    return `${color}${text}${colors.reset}`;
  }
}