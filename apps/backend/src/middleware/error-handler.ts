import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { errorHandler as newErrorHandler } from '../lib/errors/ErrorHandler';
import { metricsCollector } from '../lib/monitoring/MetricsCollector';
import { performanceTracker } from '../lib/monitoring/PerformanceTracker';
import { securityEventLogger } from '../lib/security/SecurityEventLogger';
import { threatMonitor } from '../lib/security/monitors/ThreatMonitor';
import { logger } from '../lib/logging/Logger';

// Standard error response interface
export interface ErrorResponse {
  success: false;
  message: string;
  errors?: string[] | Record<string, string>;
  code?: string | undefined;
  timestamp: string;
  path?: string | undefined;
  method?: string | undefined;
  stack?: string | undefined;
}

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public code?: string | undefined;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || undefined;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public errors: string[] | Record<string, string>;

  constructor(message: string, errors: string[] | Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

// Enhanced error handler middleware using the new comprehensive system
export const errorHandler = newErrorHandler.handleError;

// Legacy error handler for backward compatibility
export const legacyErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use the comprehensive error handler instead
  return newErrorHandler.handleError(err, req, res, next);
};

// Security-aware middleware that checks for threats before processing
export const securityAwareHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const threatAnalysis = threatMonitor.analyzeRequest(req);
  
  if (threatAnalysis.shouldBlock) {
    securityEventLogger.logMaliciousRequest(
      'REQUEST_BLOCKED',
      `Request blocked due to threat analysis: ${threatAnalysis.threats.map(t => t.type).join(', ')}`,
      req
    );
    
    res.status(403).json({
      success: false,
      message: 'Request blocked for security reasons',
      code: 'SECURITY_BLOCK',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    });
    return;
  }
  
  // Log high-risk requests for monitoring
  if (threatAnalysis.riskScore > 50) {
    securityEventLogger.logSuspiciousActivity(
      'High risk request detected',
      threatAnalysis.threats.map(t => t.type),
      req
    );
  }
  
  next();
};

// Performance tracking middleware
export const performanceTrackingHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const measurementId = performanceTracker.start({
    name: 'http_request',
    labels: {
      method: req.method,
      path: req.path,
    },
  });
  
  // Store measurement ID in request for cleanup
  (req as any).performanceMeasurementId = measurementId;
  
  // Track when response finishes
  res.on('finish', () => {
    const measurement = performanceTracker.end(measurementId);
    
    if (measurement) {
      // Record HTTP metrics
      metricsCollector.recordHttpRequest(
        req.method,
        req.path,
        res.statusCode,
        measurement.duration
      );
      
      // Log slow requests
      if (measurement.duration > 1000) {
        // performanceTracker.logSlowRequest(
        //   req.method,
        //   req.path,
        //   measurement.duration
        // ); // Method not implemented
        logger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          duration: measurement.duration
        });
      }
    }
  });
  
  next();
};

// Async error catcher utility
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler (for unmatched routes)
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse: ErrorResponse = {
    success: false,
    message: `Endpoint ${req.originalUrl} not found`,
    code: 'ENDPOINT_NOT_FOUND',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  res.status(404).json(errorResponse);
};