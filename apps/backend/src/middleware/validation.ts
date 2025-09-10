import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from './error-handler';

interface ValidationTarget {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validation middleware factory
 * Validates request data against provided Zod schemas
 */
export const validate = (schemas: ValidationTarget) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schemas.body) {
        const parsed = await schemas.body.parseAsync(req.body);
        req.body = parsed;
      }

      // Validate query parameters
      if (schemas.query) {
        const parsed = await schemas.query.parseAsync(req.query);
        req.query = parsed;
      }

      // Validate route parameters
      if (schemas.params) {
        const parsed = await schemas.params.parseAsync(req.params);
        req.params = parsed;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors
        const errors = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });

        next(new ValidationError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Sanitize input data
 * Removes potentially dangerous characters and HTML
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Remove potential SQL injection characters
    sanitized = sanitized.replace(/['";\\]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  
  return input;
};

/**
 * Middleware to sanitize all input
 */
export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip sanitization for specific content types (like file uploads)
  const contentType = req.get('content-type');
  if (contentType && contentType.includes('multipart/form-data')) {
    return next();
  }
  
  // Sanitize body
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  
  // Sanitize route parameters
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  
  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const sortOrder = req.query.sortOrder as string || 'desc';
  
  // Validate page
  if (page < 1) {
    return next(new ValidationError('Invalid pagination', ['page must be greater than 0']));
  }
  
  // Validate limit
  if (limit < 1 || limit > 100) {
    return next(new ValidationError('Invalid pagination', ['limit must be between 1 and 100']));
  }
  
  // Validate sort order
  if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) {
    return next(new ValidationError('Invalid pagination', ['sortOrder must be "asc" or "desc"']));
  }
  
  // Add validated values to request
  req.query = {
    ...req.query,
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder: sortOrder.toLowerCase(),
  };
  
  next();
};

/**
 * Validate UUID format
 */
export const validateUUID = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!id || !uuidRegex.test(id)) {
      return next(new ValidationError('Invalid ID format', [`${paramName} must be a valid UUID`]));
    }
    
    next();
  };
};

/**
 * Validate CUID format
 */
export const validateCUID = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    // CUID starts with 'c' and is 25 characters long
    const cuidRegex = /^c[a-z0-9]{24}$/;
    
    if (!id || !cuidRegex.test(id)) {
      return next(new ValidationError('Invalid ID format', [`${paramName} must be a valid CUID`]));
    }
    
    next();
  };
};