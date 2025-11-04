/**
 * Custom error classes for Provider Manager
 */

/**
 * Base error class for all provider errors
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Error when provider is not configured properly
 */
export class ProviderNotConfiguredError extends ProviderError {
  constructor(provider: string) {
    super(`Provider ${provider} is not configured. Please provide API key.`, provider);
    this.name = 'ProviderNotConfiguredError';
  }
}

/**
 * Error when provider quota is exceeded
 */
export class ProviderQuotaExceededError extends ProviderError {
  constructor(
    provider: string,
    public limit: number,
    public resetsAt?: Date
  ) {
    const resetMsg = resetsAt ? ` Resets at ${resetsAt.toISOString()}` : '';
    super(
      `Provider ${provider} quota exceeded (limit: ${limit}).${resetMsg}`,
      provider
    );
    this.name = 'ProviderQuotaExceededError';
  }
}

/**
 * Error when all providers (including fallbacks) fail
 */
export class AllProvidersFailed extends Error {
  constructor(
    public useCase: string,
    public errors: ProviderError[]
  ) {
    const errorMessages = errors.map(e => `${e.provider}: ${e.message}`).join('; ');
    super(`All providers failed for use case ${useCase}: ${errorMessages}`);
    this.name = 'AllProvidersFailed';
  }
}

/**
 * Error when provider times out
 */
export class ProviderTimeoutError extends ProviderError {
  constructor(
    provider: string,
    public timeoutMs: number
  ) {
    super(`Provider ${provider} timed out after ${timeoutMs}ms`, provider);
    this.name = 'ProviderTimeoutError';
  }
}

/**
 * Error when provider returns invalid response
 */
export class ProviderInvalidResponseError extends ProviderError {
  constructor(
    provider: string,
    message: string,
    public response?: any
  ) {
    super(`Provider ${provider} returned invalid response: ${message}`, provider);
    this.name = 'ProviderInvalidResponseError';
  }
}

/**
 * Error when rate limit is hit
 */
export class ProviderRateLimitError extends ProviderError {
  constructor(
    provider: string,
    public retryAfter?: number
  ) {
    const retryMsg = retryAfter ? ` Retry after ${retryAfter} seconds.` : '';
    super(`Provider ${provider} rate limit exceeded.${retryMsg}`, provider);
    this.name = 'ProviderRateLimitError';
  }
}

/**
 * Error when cost threshold is exceeded
 */
export class CostThresholdExceededError extends Error {
  constructor(
    public useCase: string,
    public currentCost: number,
    public threshold: number
  ) {
    super(
      `Cost threshold exceeded for ${useCase}: $${currentCost} > $${threshold}`
    );
    this.name = 'CostThresholdExceededError';
  }
}
