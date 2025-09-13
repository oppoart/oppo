import { ErrorCode, ErrorCodes, getErrorCategory, isRetryableError } from './ErrorCodes';

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  operation?: string;
  resource?: string;
  metadata?: Record<string, any>;
  cause?: Error;
  stack?: string;
  service?: string;
  rule?: string;
  workflow?: string;
  precondition?: string;
  violation?: string;
  code?: string;
  requestType?: string;
  setting?: string;
  dependency?: string;
  currentState?: string;
  severity?: string;
  issue?: string;
  originalError?: Error;
  timeout?: number;
  path?: string;
  requestedAction?: string;
  method?: string;
  circuitBreakerName?: string;
  operationName?: string;
}

export interface ErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  expected?: any;
  actual?: any;
  suggestion?: string;
}

// Base application error class
export class AppError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public readonly category: string;
  public readonly isOperational: boolean;
  public readonly isRetryable: boolean;
  public readonly context: ErrorContext;
  public readonly details: ErrorDetails[];
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    context: ErrorContext = {},
    details: ErrorDetails[] = [],
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.category = getErrorCategory(code) || 'UNKNOWN';
    this.isOperational = isOperational;
    this.isRetryable = isRetryableError(code);
    this.context = context;
    this.details = details;
    this.timestamp = new Date();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      category: this.category,
      isOperational: this.isOperational,
      isRetryable: this.isRetryable,
      context: this.context,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

// Authentication and Authorization Errors
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    code: ErrorCode = ErrorCodes.UNAUTHORIZED,
    context: ErrorContext = {}
  ) {
    super(message, 401, code, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    code: ErrorCode = ErrorCodes.FORBIDDEN,
    context: ErrorContext = {}
  ) {
    super(message, 403, code, context);
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor(context: ErrorContext = {}) {
    super('Token has expired', ErrorCodes.TOKEN_EXPIRED, context);
  }
}

export class InvalidTokenError extends AuthenticationError {
  constructor(context: ErrorContext = {}) {
    super('Invalid token', ErrorCodes.INVALID_TOKEN, context);
  }
}

export class InsufficientPermissionsError extends AuthorizationError {
  constructor(operation: string, resource: string, context: ErrorContext = {}) {
    super(
      `Insufficient permissions to ${operation} ${resource}`,
      ErrorCodes.INSUFFICIENT_PERMISSIONS,
      { ...context, operation, resource }
    );
  }
}

// Validation Errors
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    details: ErrorDetails[] = [],
    context: ErrorContext = {}
  ) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, context, details);
  }

  static fromZodError(zodError: any, context: ErrorContext = {}): ValidationError {
    const details: ErrorDetails[] = zodError.errors.map((error: any) => ({
      field: error.path.join('.'),
      value: error.received,
      constraint: error.code,
      expected: error.expected,
      suggestion: error.message,
    }));

    return new ValidationError('Validation failed', details, context);
  }

  static required(field: string, context: ErrorContext = {}): ValidationError {
    return new ValidationError(
      `Field '${field}' is required`,
      [{ field, constraint: 'required', suggestion: `Please provide a value for ${field}` }],
      context
    );
  }

  static invalidFormat(field: string, expected: string, actual: any, context: ErrorContext = {}): ValidationError {
    return new ValidationError(
      `Invalid format for field '${field}'`,
      [{ field, expected, actual, constraint: 'format', suggestion: `Expected ${expected} format` }],
      context
    );
  }
}

export class DuplicateValueError extends ValidationError {
  constructor(field: string, value: any, context: ErrorContext = {}) {
    super(
      `Duplicate value for field '${field}'`,
      [{ field, value, constraint: 'unique', suggestion: `The value '${value}' already exists` }],
      context
    );
    this.code = ErrorCodes.DUPLICATE_VALUE;
  }
}

// Resource Errors
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string,
    context: ErrorContext = {}
  ) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super(message, 404, ErrorCodes.NOT_FOUND, { ...context, resource });
  }
}

export class ResourceExistsError extends AppError {
  constructor(
    resource: string,
    identifier?: string,
    context: ErrorContext = {}
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' already exists`
      : `${resource} already exists`;
    
    super(message, 409, ErrorCodes.RESOURCE_EXISTS, { ...context, resource });
  }
}

export class ConcurrentModificationError extends AppError {
  constructor(
    resource: string,
    context: ErrorContext = {}
  ) {
    super(
      `${resource} was modified by another operation`,
      409,
      ErrorCodes.CONCURRENT_MODIFICATION,
      { ...context, resource }
    );
  }
}

export class ResourceLockedError extends AppError {
  constructor(
    resource: string,
    lockOwner?: string,
    context: ErrorContext = {}
  ) {
    const message = lockOwner
      ? `${resource} is locked by ${lockOwner}`
      : `${resource} is currently locked`;
    
    super(message, 423, ErrorCodes.RESOURCE_LOCKED, { ...context, resource });
  }
}

// Database Errors
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    code: ErrorCode = ErrorCodes.DATABASE_ERROR,
    context: ErrorContext = {}
  ) {
    super(message, 500, code, context, [], false); // Database errors are not operational
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(context: ErrorContext = {}) {
    super('Database connection failed', ErrorCodes.DATABASE_CONNECTION_ERROR, context);
  }
}

export class DatabaseTimeoutError extends DatabaseError {
  constructor(operation: string, context: ErrorContext = {}) {
    super(
      `Database operation '${operation}' timed out`,
      ErrorCodes.DATABASE_TIMEOUT,
      { ...context, operation }
    );
  }
}

export class TransactionFailedError extends DatabaseError {
  constructor(reason: string, context: ErrorContext = {}) {
    super(
      `Transaction failed: ${reason}`,
      ErrorCodes.TRANSACTION_FAILED,
      context
    );
  }
}

// External Service Errors
export class ExternalServiceError extends AppError {
  constructor(
    serviceName: string,
    message: string = 'External service error',
    code: ErrorCode = ErrorCodes.EXTERNAL_SERVICE_ERROR,
    context: ErrorContext = {}
  ) {
    super(
      `${serviceName}: ${message}`,
      502,
      code,
      { ...context, service: serviceName }
    );
  }
}

export class ExternalServiceUnavailableError extends ExternalServiceError {
  constructor(serviceName: string, context: ErrorContext = {}) {
    super(
      serviceName,
      'Service temporarily unavailable',
      ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE,
      context
    );
    this.statusCode = 503;
  }
}

export class ExternalServiceTimeoutError extends ExternalServiceError {
  constructor(serviceName: string, timeout: number, context: ErrorContext = {}) {
    super(
      serviceName,
      `Service request timed out after ${timeout}ms`,
      ErrorCodes.EXTERNAL_SERVICE_TIMEOUT,
      context
    );
    this.statusCode = 504;
  }
}

export class RateLimitExceededError extends ExternalServiceError {
  constructor(
    serviceName: string,
    limit: number,
    resetTime?: Date,
    context: ErrorContext = {}
  ) {
    const resetMessage = resetTime ? ` Rate limit resets at ${resetTime.toISOString()}` : '';
    super(
      serviceName,
      `Rate limit of ${limit} requests exceeded.${resetMessage}`,
      ErrorCodes.API_RATE_LIMIT_EXCEEDED,
      context
    );
    this.statusCode = 429;
  }
}

// Business Logic Errors
export class BusinessRuleViolationError extends AppError {
  constructor(
    rule: string,
    message: string,
    context: ErrorContext = {}
  ) {
    super(
      message,
      422,
      ErrorCodes.BUSINESS_RULE_VIOLATION,
      { ...context, rule }
    );
  }
}

export class WorkflowError extends AppError {
  constructor(
    workflow: string,
    currentState: string,
    requestedAction: string,
    context: ErrorContext = {}
  ) {
    super(
      `Cannot perform '${requestedAction}' in current state '${currentState}'`,
      422,
      ErrorCodes.STATE_TRANSITION_ERROR,
      { ...context, workflow, currentState, requestedAction }
    );
  }
}

export class PreconditionFailedError extends AppError {
  constructor(
    precondition: string,
    context: ErrorContext = {}
  ) {
    super(
      `Precondition failed: ${precondition}`,
      412,
      ErrorCodes.PRECONDITION_FAILED,
      { ...context, precondition }
    );
  }
}

// Security Errors
export class SecurityViolationError extends AppError {
  constructor(
    violation: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    context: ErrorContext = {}
  ) {
    super(
      `Security violation detected: ${violation}`,
      403,
      ErrorCodes.SECURITY_VIOLATION,
      { ...context, violation, severity }
    );
  }
}

export class SuspiciousActivityError extends SecurityViolationError {
  constructor(
    activity: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
    context: ErrorContext = {}
  ) {
    super(activity, severity, { ...context, code: ErrorCodes.SUSPICIOUS_ACTIVITY });
    this.code = ErrorCodes.SUSPICIOUS_ACTIVITY;
  }
}

export class MaliciousRequestError extends SecurityViolationError {
  constructor(
    requestType: string,
    context: ErrorContext = {}
  ) {
    super(
      `Malicious request detected: ${requestType}`,
      'critical',
      { ...context, requestType }
    );
    this.code = ErrorCodes.MALICIOUS_REQUEST;
    this.statusCode = 400;
  }
}

// System Errors
export class SystemError extends AppError {
  constructor(
    message: string = 'Internal system error',
    code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR,
    context: ErrorContext = {}
  ) {
    super(message, 500, code, context, [], false); // System errors are not operational
  }
}

export class ConfigurationError extends SystemError {
  constructor(
    setting: string,
    issue: string,
    context: ErrorContext = {}
  ) {
    super(
      `Configuration error in '${setting}': ${issue}`,
      ErrorCodes.CONFIGURATION_ERROR,
      { ...context, setting, issue }
    );
  }
}

export class DependencyError extends SystemError {
  constructor(
    dependency: string,
    issue: string,
    context: ErrorContext = {}
  ) {
    super(
      `Dependency error with '${dependency}': ${issue}`,
      ErrorCodes.DEPENDENCY_ERROR,
      { ...context, dependency, issue }
    );
  }
}

// HTTP Status Code to Error mapping
export const createErrorFromStatusCode = (
  statusCode: number,
  message: string,
  context: ErrorContext = {}
): AppError => {
  switch (statusCode) {
    case 400:
      return new ValidationError(message, [], context);
    case 401:
      return new AuthenticationError(message, ErrorCodes.UNAUTHORIZED, context);
    case 403:
      return new AuthorizationError(message, ErrorCodes.FORBIDDEN, context);
    case 404:
      return new NotFoundError('Resource', undefined, context);
    case 409:
      return new ResourceExistsError('Resource', undefined, context);
    case 422:
      return new BusinessRuleViolationError('unknown', message, context);
    case 429:
      return new RateLimitExceededError('API', 0, undefined, context);
    case 500:
      return new SystemError(message, ErrorCodes.INTERNAL_SERVER_ERROR, context);
    case 502:
      return new ExternalServiceError('External Service', message, ErrorCodes.EXTERNAL_SERVICE_ERROR, context);
    case 503:
      return new ExternalServiceUnavailableError('Service', context);
    case 504:
      return new ExternalServiceTimeoutError('Service', 0, context);
    default:
      return new AppError(message, statusCode, ErrorCodes.INTERNAL_SERVER_ERROR, context);
  }
};