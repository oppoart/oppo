import { env } from '../../config/env';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerConfig {
  level: LogLevel;
  environment: string;
  service: string;
  version: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableJson: boolean;
  maxFileSize: string;
  maxFiles: number;
  logDirectory: string;
  sensitiveFields: string[];
  includeTimestamp: boolean;
  includeHostname: boolean;
  includeProcessId: boolean;
  includeRequestId: boolean;
  performanceThreshold: number;
  slowQueryThreshold: number;
}

export const loggerConfig: LoggerConfig = {
  level: (env.LOG_LEVEL || 'info') as LogLevel,
  environment: env.NODE_ENV || 'development',
  service: 'oppo-backend',
  version: process.env.npm_package_version || '1.0.0',
  enableConsole: true,
  enableFile: env.NODE_ENV === 'production',
  enableJson: env.NODE_ENV === 'production',
  maxFileSize: '10m',
  maxFiles: 5,
  logDirectory: './logs',
  sensitiveFields: [
    'password',
    'token',
    'authorization',
    'cookie',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'refreshToken',
    'sessionId',
    'jwt',
    'auth',
    'credentials',
    'privateKey',
    'publicKey'
  ],
  includeTimestamp: true,
  includeHostname: true,
  includeProcessId: true,
  includeRequestId: true,
  performanceThreshold: 1000, // ms
  slowQueryThreshold: 500, // ms
};

export const getLogLevel = (): LogLevel => {
  const level = env.LOG_LEVEL?.toLowerCase();
  const validLevels: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
  
  if (validLevels.includes(level as LogLevel)) {
    return level as LogLevel;
  }
  
  // Default log levels by environment
  switch (env.NODE_ENV) {
    case 'production':
      return 'warn';
    case 'test':
      return 'error';
    case 'development':
    default:
      return 'debug';
  }
};

export const shouldLog = (level: LogLevel, targetLevel: LogLevel = loggerConfig.level): boolean => {
  const levels: Record<LogLevel, number> = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
  };
  
  return levels[level] <= levels[targetLevel];
};