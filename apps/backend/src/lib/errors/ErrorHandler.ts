import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../logging/Logger';
import { env } from '../../config/env';
import { 
  AppError, 
  ValidationError, 
  DatabaseError, 
  ExternalServiceError,
  SecurityViolationError,
  SystemError,
  createErrorFromStatusCode
} from './AppError';
import { ErrorCodes } from './ErrorCodes';

// Standard error response interface
export interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
  path: string;
  method: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
    value?: any;
  }>;
  stack?: string;
  context?: Record<string, any>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Main error handler middleware
  public handleError = (
    error: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const appError = this.normalizeError(error, req);
    
    // Log the error with appropriate level
    this.logError(appError, req);
    
    // Send error response
    const errorResponse = this.createErrorResponse(appError, req);
    res.status(appError.statusCode).json(errorResponse);
  };

  // Convert any error to AppError
  private normalizeError(error: Error | AppError, req: Request): AppError {
    // If already an AppError, return as-is
    if (error instanceof AppError) {
      return error;
    }

    const context = {
      requestId: (req as any).requestId,
      userId: (req as any).user?.id,
      operation: `${req.method} ${req.path}`,
    };

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const details = error.errors.map(e => ({
        field: e.path.join('.'),
        value: undefined, // ZodIssue doesn't expose input value
        constraint: e.code,
        expected: undefined, // ZodIssue doesn't have expected field
        actual: undefined, // ZodIssue doesn't have received field
        suggestion: e.message,
      }));

      return new ValidationError(
        'Request validation failed',
        details,
        context
      );
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(error, context);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return new ValidationError(
        'Database validation failed',
        [{ field: 'unknown', constraint: 'database_validation', suggestion: 'Check your input data' }],
        context
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return new DatabaseError(
        'Database connection failed',
        ErrorCodes.DATABASE_CONNECTION_ERROR,
        context
      );
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return new AppError(
        'Invalid token',
        401,
        ErrorCodes.INVALID_TOKEN,
        context
      );
    }

    if (error.name === 'TokenExpiredError') {
      return new AppError(
        'Token expired',
        401,
        ErrorCodes.TOKEN_EXPIRED,
        context
      );
    }

    // Handle axios/fetch errors (external service calls)
    if (this.isHttpError(error)) {
      return this.handleHttpError(error, context);
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return new ExternalServiceError(
        'External Service',
        'Request timed out',
        ErrorCodes.EXTERNAL_SERVICE_TIMEOUT,
        context
      );
    }

    // Handle system errors
    if (error.name === 'ENOTFOUND' || error.name === 'ECONNREFUSED') {
      return new SystemError(
        'Network connection failed',
        ErrorCodes.NETWORK_ERROR,
        context
      );
    }

    if (error.name === 'ENOMEM') {
      return new SystemError(
        'Out of memory',
        ErrorCodes.MEMORY_ERROR,
        context
      );
    }

    if (error.name === 'ENOSPC') {
      return new SystemError(
        'Disk space full',
        ErrorCodes.DISK_FULL,
        context
      );
    }

    // Default to internal server error
    return new SystemError(
      env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      ErrorCodes.INTERNAL_SERVER_ERROR,
      { ...context, originalError: error }
    );
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError, context: any): AppError {
    switch (error.code) {
      case 'P2002': // Unique constraint failed
        const target = (error.meta?.target as string[]) || ['field'];
        return new ValidationError(
          'Duplicate value detected',
          [{ 
            field: target.join('.'), 
            constraint: 'unique',
            suggestion: `A record with this ${target.join(' and ')} already exists`
          }],
          context
        );

      case 'P2025': // Record not found
        return new AppError(
          'Record not found',
          404,
          ErrorCodes.NOT_FOUND,
          context
        );

      case 'P2003': // Foreign key constraint failed
        return new ValidationError(
          'Referenced record does not exist',
          [{ 
            field: error.meta?.field_name as string || 'reference',
            constraint: 'foreign_key',
            suggestion: 'Ensure the referenced record exists'
          }],
          context
        );

      case 'P2014': // Required relation missing
        return new ValidationError(
          'Required relation missing',
          [{ 
            field: error.meta?.relation_name as string || 'relation',
            constraint: 'required_relation',
            suggestion: 'Provide the required related data'
          }],
          context
        );

      case 'P2018': // Required connected records not found
        return new AppError(
          'Required connected records not found',
          404,
          ErrorCodes.NOT_FOUND,
          context
        );

      case 'P1001': // Cannot reach database server
      case 'P1002': // Database server timeout
        return new DatabaseError(
          'Database connection failed',
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          context
        );

      case 'P2024': // Timed out fetching a new connection
        return new DatabaseError(
          'Database operation timed out',
          ErrorCodes.DATABASE_TIMEOUT,
          context
        );

      default:
        return new DatabaseError(
          `Database error: ${error.message}`,
          ErrorCodes.DATABASE_ERROR,
          { ...context, prismaCode: error.code }
        );
    }
  }

  private isHttpError(error: any): boolean {
    return (
      error.response || 
      error.status || 
      error.statusCode ||
      (error.code && error.code.startsWith('E')) ||
      error.name === 'AxiosError'
    );
  }

  private handleHttpError(error: any, context: any): AppError {
    const status = error.response?.status || error.status || error.statusCode || 500;
    const message = error.response?.data?.message || error.message || 'External service error';
    
    if (status >= 500) {
      return new ExternalServiceError(
        'External Service',
        message,
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        context
      );
    } else if (status === 429) {
      return new ExternalServiceError(
        'External Service',
        'Rate limit exceeded',
        ErrorCodes.API_RATE_LIMIT_EXCEEDED,
        context
      );
    } else if (status >= 400) {
      return createErrorFromStatusCode(status, message, context);
    }

    return new ExternalServiceError(
      'External Service',
      message,
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      context
    );
  }

  private logError(error: AppError, req: Request): void {
    const context = {
      errorCode: error.code,
      statusCode: error.statusCode,
      category: error.category,
      isRetryable: error.isRetryable,
      isOperational: error.isOperational,
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body,
      headers: req.headers,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      requestId: (req as any).requestId,
      userId: (req as any).user?.id,
      ...error.context,
    };

    // Log security violations with high priority
    if (error instanceof SecurityViolationError) {
      logger.logSecurity(`Security violation: ${error.message}`, {
        event: 'security_violation',
        severity: error.context.severity as any || 'medium',
        details: {
          violation: error.context.violation,
          code: error.code,
          ...context,
        }
      });
      return;
    }

    // Log based on error severity
    if (error.statusCode >= 500 || !error.isOperational) {
      logger.error(error.message, context, error);
    } else if (error.statusCode >= 400) {
      logger.warn(error.message, context);
    } else {
      logger.info(error.message, context);
    }

    // Log performance issues for slow operations
    if (error.code === ErrorCodes.DATABASE_TIMEOUT || error.code === ErrorCodes.EXTERNAL_SERVICE_TIMEOUT) {
      logger.logPerformance('Timeout detected', {
        duration: error.context.timeout || 0,
      }, context);
    }
  }

  private createErrorResponse(error: AppError, req: Request): ErrorResponse {
    const response: ErrorResponse = {
      success: false,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: error.timestamp.toISOString(),
      requestId: (req as any).requestId,
      path: req.path,
      method: req.method,
    };

    // Add detailed errors for validation failures
    if (error instanceof ValidationError && error.details.length > 0) {
      response.errors = error.details.map(detail => {
        const errorItem: { field?: string; message: string; code?: string; value?: any; } = {
          message: detail.suggestion || 'Invalid value',
          value: detail.actual,
        };
        if (detail.field) errorItem.field = detail.field;
        if (detail.constraint) errorItem.code = detail.constraint;
        return errorItem;
      });
    }

    // Add stack trace in development
    if (env.NODE_ENV === 'development') {
      if (error.stack) {
        response.stack = error.stack;
      }
      response.context = {
        category: error.category,
        isRetryable: error.isRetryable,
        isOperational: error.isOperational,
        ...error.context,
      };
    }

    return response;
  }

  // Handle uncaught exceptions
  public handleUncaughtException = (error: Error): void => {
    logger.fatal('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    }, error);

    // Graceful shutdown
    process.exit(1);
  };

  // Handle unhandled promise rejections
  public handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
    logger.fatal('Unhandled promise rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
    });

    // Graceful shutdown
    process.exit(1);
  };

  // Async error wrapper
  public asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  // Not found handler
  public handleNotFound = (req: Request, res: Response): void => {
    const error = new AppError(
      `Route ${req.method} ${req.originalUrl} not found`,
      404,
      ErrorCodes.NOT_FOUND,
      {
        requestId: (req as any).requestId,
        path: req.path,
        method: req.method,
      }
    );

    const response = this.createErrorResponse(error, req);
    res.status(404).json(response);
  };
}

// Export singleton instance and utilities
export const errorHandler = ErrorHandler.getInstance();
export const { handleError, asyncHandler, handleNotFound } = errorHandler;

// Setup global error handlers
export const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', errorHandler.handleUncaughtException);
  process.on('unhandledRejection', errorHandler.handleUnhandledRejection);
};