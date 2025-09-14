import { AxiosError } from 'axios';
import { toast } from '@/hooks/use-toast';

// Error response interface matching backend
export interface ErrorResponse {
  success: false;
  message: string;
  errors?: string[] | Record<string, string>;
  code?: string;
  timestamp?: string;
  path?: string;
  method?: string;
}

// Custom error class for API errors
export class ApiError extends Error {
  public statusCode: number;
  public code?: string;
  public errors?: string[] | Record<string, string>;

  constructor(message: string, statusCode: number, code?: string, errors?: string[] | Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

// Extract error message from various error types
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof AxiosError) {
    const data = error.response?.data as ErrorResponse | undefined;
    if (data?.message) {
      return data.message;
    }
    
    // Check for specific error codes first
    if (data?.code) {
      switch (data.code) {
        case 'SEARCH_QUOTA_EXCEEDED':
          return 'Search quota exceeded. Please try again later or contact support to increase your quota.';
        case 'SEARCH_CREDENTIALS_ERROR':
          return 'Search service is not properly configured. Please contact support.';
      }
    }
    
    // Fallback messages based on status code
    switch (error.response?.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'You need to be logged in to perform this action.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. The resource may already exist.';
      case 422:
        return 'The provided data is invalid.';
      case 429:
        return 'Search quota exceeded. Please try again later.';
      case 500:
        return 'An internal server error occurred. Please try again later.';
      case 502:
        return 'Bad gateway. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred.';
};

// Extract validation errors from error response
export const getValidationErrors = (error: unknown): Record<string, string> | null => {
  if (error instanceof ApiError && error.errors) {
    if (Array.isArray(error.errors)) {
      // Convert array of errors to object format
      const errorObj: Record<string, string> = {};
      error.errors.forEach((err, index) => {
        // Try to parse field name from error message (format: "field: message")
        const match = err.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          errorObj[match[1]] = match[2];
        } else {
          errorObj[`error_${index}`] = err;
        }
      });
      return errorObj;
    }
    return error.errors as Record<string, string>;
  }

  if (error instanceof AxiosError) {
    const data = error.response?.data as ErrorResponse | undefined;
    if (data?.errors) {
      if (Array.isArray(data.errors)) {
        const errorObj: Record<string, string> = {};
        data.errors.forEach((err, index) => {
          const match = err.match(/^([^:]+):\s*(.+)$/);
          if (match) {
            errorObj[match[1]] = match[2];
          } else {
            errorObj[`error_${index}`] = err;
          }
        });
        return errorObj;
      }
      return data.errors as Record<string, string>;
    }
  }

  return null;
};

// Handle API errors and show toast notifications
export const handleApiError = (error: unknown, showToast = true): ApiError => {
  let apiError: ApiError;

  if (error instanceof AxiosError) {
    const data = error.response?.data as ErrorResponse | undefined;
    apiError = new ApiError(
      getErrorMessage(error),
      error.response?.status || 500,
      data?.code,
      data?.errors
    );
  } else if (error instanceof ApiError) {
    apiError = error;
  } else if (error instanceof Error) {
    apiError = new ApiError(error.message, 500);
  } else {
    apiError = new ApiError('An unexpected error occurred', 500);
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', {
      message: apiError.message,
      statusCode: apiError.statusCode,
      code: apiError.code,
      errors: apiError.errors,
      originalError: error,
    });
  }

  // Show toast notification
  if (showToast) {
    toast({
      title: 'Error',
      description: apiError.message,
      variant: 'destructive',
    });
  }

  return apiError;
};

// Retry failed requests with exponential backoff
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error instanceof AxiosError && error.response?.status && error.response.status < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (i === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Check if error is a network error
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return !error.response && error.code === 'ERR_NETWORK';
  }
  return false;
};

// Check if error is an authentication error
export const isAuthError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  if (error instanceof ApiError) {
    return error.statusCode === 401;
  }
  return false;
};

// Check if error is a validation error
export const isValidationError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return error.response?.status === 400 || error.response?.status === 422;
  }
  if (error instanceof ApiError) {
    return error.statusCode === 400 || error.statusCode === 422;
  }
  return false;
};

// Check if error is a quota exceeded error
export const isQuotaExceededError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ErrorResponse | undefined;
    return error.response?.status === 429 || data?.code === 'SEARCH_QUOTA_EXCEEDED';
  }
  if (error instanceof ApiError) {
    return error.statusCode === 429 || error.code === 'SEARCH_QUOTA_EXCEEDED';
  }
  return false;
};

// Check if error is a search credentials error
export const isSearchCredentialsError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ErrorResponse | undefined;
    return data?.code === 'SEARCH_CREDENTIALS_ERROR';
  }
  if (error instanceof ApiError) {
    return error.code === 'SEARCH_CREDENTIALS_ERROR';
  }
  return false;
};

// Format validation errors for display
export const formatValidationErrors = (errors: Record<string, string> | string[]): string => {
  if (Array.isArray(errors)) {
    return errors.join('\n');
  }

  return Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join('\n');
};