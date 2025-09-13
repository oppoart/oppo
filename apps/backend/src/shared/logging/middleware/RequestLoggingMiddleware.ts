import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, setRequestContext } from '../Logger';
import { loggerConfig } from '../LoggerConfig';

// Extend Request interface to include request ID
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate or extract request ID
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Store in request object
  req.requestId = requestId;
  req.startTime = Date.now();
  
  // Set response header
  res.setHeader('X-Request-ID', requestId);
  
  // Set request context for logging
  setRequestContext({
    requestId,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path,
  });
  
  next();
};

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    contentType: req.get('content-type'),
    contentLength: req.get('content-length'),
  });
  
  // Log request body for non-GET requests (in debug mode)
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request body', { body: req.body });
  }
  
  // Override response methods to capture response data
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseBody: any;
  let responseSize = 0;
  
  res.send = function(data: any) {
    responseBody = data;
    responseSize = Buffer.byteLength(data || '', 'utf8');
    res.send = originalSend;
    return originalSend.call(this, data);
  };
  
  res.json = function(data: any) {
    responseBody = data;
    responseSize = Buffer.byteLength(JSON.stringify(data || {}), 'utf8');
    res.json = originalJson;
    return originalJson.call(this, data);
  };
  
  // Log response when finished
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Determine log level based on status code and response time
    let logLevel: 'info' | 'warn' | 'error' = 'info';
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400 || responseTime > loggerConfig.performanceThreshold) {
      logLevel = 'warn';
    }
    
    // Log HTTP request/response
    logger.logHttp('Request completed', {
      method: req.method,
      path: req.path,
      statusCode,
      responseTime,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
    }, {
      responseSize,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
    });
    
    // Log slow requests
    if (responseTime > loggerConfig.performanceThreshold) {
      logger.logSlowRequest(req.method, req.path, responseTime, {
        statusCode,
        query: req.query,
        userAgent: req.get('user-agent'),
      });
    }
    
    // Log response body in debug mode
    if (loggerConfig.level === 'debug' && responseBody) {
      logger.debug('Response body', { 
        statusCode,
        responseBody: typeof responseBody === 'string' ? responseBody.substring(0, 1000) : responseBody 
      });
    }
    
    // Log errors with additional context
    if (statusCode >= 400) {
      const errorContext = {
        statusCode,
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        headers: req.headers,
        responseTime,
      };
      
      if (statusCode >= 500) {
        logger.error('Server error response', errorContext);
      } else {
        logger.warn('Client error response', errorContext);
      }
    }
  });
  
  // Log request errors
  res.on('error', (error) => {
    logger.error('Response error', {
      method: req.method,
      path: req.path,
      error: error.message,
    }, error);
  });
  
  next();
};

// Middleware to log user context when available
export const userContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Check if user is authenticated (assuming user info is in req.user)
  const user = (req as any).user;
  
  if (user) {
    setRequestContext({
      userId: user.id || user.userId,
      sessionId: user.sessionId,
    });
    
    logger.debug('User context set', {
      userId: user.id || user.userId,
      sessionId: user.sessionId,
    });
  }
  
  next();
};

// Rate limiting logging middleware
export const rateLimitLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const rateLimitHeaders = {
    remaining: res.getHeader('X-RateLimit-Remaining'),
    limit: res.getHeader('X-RateLimit-Limit'),
    reset: res.getHeader('X-RateLimit-Reset'),
  };
  
  // Log rate limit information
  if (rateLimitHeaders.remaining !== undefined) {
    logger.debug('Rate limit status', {
      remaining: rateLimitHeaders.remaining,
      limit: rateLimitHeaders.limit,
      reset: rateLimitHeaders.reset,
      ip: req.ip,
    });
    
    // Log when rate limit is approaching
    const remaining = Number(rateLimitHeaders.remaining);
    const limit = Number(rateLimitHeaders.limit);
    
    if (remaining <= limit * 0.1) { // Less than 10% remaining
      logger.warn('Rate limit approaching', {
        remaining,
        limit,
        ip: req.ip,
        path: req.path,
      });
    }
  }
  
  next();
};

// Security event logging middleware
export const securityLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempt
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
    /eval\(/i, // Code evaluation
    /document\.cookie/i, // Cookie theft attempt
  ];
  
  const userAgent = req.get('user-agent') || '';
  const suspiciousBots = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /masscan/i,
    /nmap/i,
  ];
  
  // Check for suspicious patterns in various request parts
  const checkForPatterns = (value: string, location: string): void => {
    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(value)) {
        logger.logSuspiciousActivity('Suspicious pattern detected', 'medium', {
          pattern: pattern.toString(),
          value: value.substring(0, 200),
          location,
          ip: req.ip,
          userAgent,
          path: req.path,
        });
      }
    });
  };
  
  // Check query parameters
  Object.entries(req.query).forEach(([key, value]) => {
    if (typeof value === 'string') {
      checkForPatterns(value, `query.${key}`);
    }
  });
  
  // Check body parameters
  if (req.body && typeof req.body === 'object') {
    Object.entries(req.body).forEach(([key, value]) => {
      if (typeof value === 'string') {
        checkForPatterns(value, `body.${key}`);
      }
    });
  }
  
  // Check URL path
  checkForPatterns(req.path, 'path');
  
  // Check for suspicious user agents
  suspiciousBots.forEach(botPattern => {
    if (botPattern.test(userAgent)) {
      logger.logSuspiciousActivity('Suspicious bot detected', 'high', {
        userAgent,
        pattern: botPattern.toString(),
        ip: req.ip,
        path: req.path,
      });
    }
  });
  
  // Log unusual request sizes
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  if (contentLength > 10 * 1024 * 1024) { // > 10MB
    logger.logSuspiciousActivity('Unusually large request', 'medium', {
      contentLength,
      contentType: req.get('content-type'),
      ip: req.ip,
      path: req.path,
    });
  }
  
  next();
};