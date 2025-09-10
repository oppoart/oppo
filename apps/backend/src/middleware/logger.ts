import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

interface LogData {
  timestamp: string;
  method: string;
  path: string;
  query?: any;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string | undefined;
  userAgent?: string | undefined;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Get color based on status code
const getStatusColor = (statusCode: number): string => {
  if (statusCode >= 500) return colors.red;
  if (statusCode >= 400) return colors.yellow;
  if (statusCode >= 300) return colors.cyan;
  if (statusCode >= 200) return colors.green;
  return colors.reset;
};

// Get method color
const getMethodColor = (method: string): string => {
  switch (method) {
    case 'GET': return colors.green;
    case 'POST': return colors.blue;
    case 'PUT': return colors.yellow;
    case 'DELETE': return colors.red;
    case 'PATCH': return colors.magenta;
    default: return colors.reset;
  }
};

// Sanitize sensitive data from logs
const sanitizeData = (data: any): any => {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'authorization', 'cookie', 'secret', 'apiKey', 'api_key'];
  
  if (typeof data === 'object') {
    const sanitized = { ...data };
    
    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    }
    
    return sanitized;
  }
  
  return data;
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log request
  const requestLog: LogData = {
    timestamp,
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  };
  
  // Add query parameters if present
  if (Object.keys(req.query).length > 0) {
    requestLog.query = sanitizeData(req.query);
  }
  
  // Add body for non-GET requests
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    requestLog.body = sanitizeData(req.body);
  }
  
  // Log level based on environment
  if (env.LOG_LEVEL === 'debug' || env.NODE_ENV === 'development') {
    // Add headers in debug mode
    requestLog.headers = sanitizeData(req.headers);
  }
  
  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Track response
  let responseBody: any;
  
  // Override send method
  res.send = function(data: any) {
    responseBody = data;
    res.send = originalSend;
    return originalSend.call(this, data);
  };
  
  // Override json method
  res.json = function(data: any) {
    responseBody = data;
    res.json = originalJson;
    return originalJson.call(this, data);
  };
  
  // Log response when finished
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Format log message
    const methodColor = getMethodColor(req.method);
    const statusColor = getStatusColor(statusCode);
    
    let logMessage = `${colors.dim}[${timestamp}]${colors.reset} `;
    logMessage += `${methodColor}${req.method}${colors.reset} `;
    logMessage += `${req.path} `;
    logMessage += `${statusColor}${statusCode}${colors.reset} `;
    logMessage += `${colors.dim}${responseTime}ms${colors.reset}`;
    
    // Log based on status code
    if (statusCode >= 500) {
      console.error(logMessage);
      
      // Log detailed error in development
      if (env.NODE_ENV === 'development' && responseBody) {
        console.error('Response:', sanitizeData(responseBody));
      }
    } else if (statusCode >= 400) {
      console.warn(logMessage);
      
      // Log validation errors in development
      if (env.NODE_ENV === 'development' && responseBody) {
        console.warn('Response:', sanitizeData(responseBody));
      }
    } else {
      console.log(logMessage);
      
      // Log successful response in debug mode
      if (env.LOG_LEVEL === 'debug' && responseBody) {
        console.log('Response:', sanitizeData(responseBody));
      }
    }
    
    // Log slow requests (> 1 second)
    if (responseTime > 1000) {
      console.warn(`${colors.yellow}[SLOW REQUEST]${colors.reset} ${req.method} ${req.path} took ${responseTime}ms`);
    }
  });
  
  next();
};

// Error logging middleware
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  
  const errorLog: LogData = {
    timestamp,
    method: req.method,
    path: req.path,
    query: sanitizeData(req.query),
    body: sanitizeData(req.body),
    error: err.message,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  };
  
  // Log error with stack trace in development
  console.error(`${colors.red}[ERROR]${colors.reset} ${timestamp}`);
  console.error('Request:', {
    method: errorLog.method,
    path: errorLog.path,
    query: errorLog.query,
    body: errorLog.body,
  });
  console.error('Error:', err.message);
  
  if (env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }
  
  next(err);
};

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  
  // Store original end method
  const originalEnd = res.end;
  
  // Override end method to add timing header before sending
  res.end = function(chunk?: any, encoding?: any) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Add response time header before ending response
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${responseTime}ms`);
    }
    
    // Log slow database queries or operations
    if (responseTime > 500) {
      console.warn(`${colors.yellow}[PERFORMANCE]${colors.reset} Slow operation: ${req.method} ${req.path} - ${responseTime.toFixed(2)}ms`);
    }
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};