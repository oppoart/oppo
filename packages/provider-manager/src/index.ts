/**
 * Provider Manager - Public API
 *
 * Main entry point for the package.
 * Exports all core functionality, types, and adapters.
 */

// Core
export { ProviderManager } from './core/ProviderManager';
export { UseCaseRouter } from './core/UseCaseRouter';
export { CostTracker } from './core/CostTracker';

// Types
export {
  UseCase,
  Priority,
  UseCaseConfig,
  ProviderConfig,
  ProviderManagerConfig,
  CostStatistics,
  PerformanceMetrics,
  CostAlert,
  CostReportConfig,
  OperationOptions,
  DiscoveryType,
  DiscoveryOptions,
  ProviderSearchResult,
  MultipleSearchResponse,
} from './core/types';

// Ports (Interfaces)
export {
  ITextGenerationProvider,
  IEmbeddingProvider,
  IExtractionProvider,
  ISearchProvider,
  ChatMessage,
  TextGenerationOptions,
  TextGenerationResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  ExtractionOptions,
  ExtractionResponse,
  SearchOptions,
  SearchResult,
  SearchResponse,
  ProviderQuota,
  UsageMetrics,
  JSONSchema,
} from './core/ports';

// LLM Adapters
export {
  OpenAITextAdapter,
  OpenAITextConfig,
  OpenAIEmbeddingAdapter,
  OpenAIEmbeddingConfig,
  AnthropicAdapter,
  AnthropicConfig,
} from './llm/adapters';

// Search Adapters
export {
  SerperAdapter,
  SerperConfig,
} from './search/adapters';

// Errors
export {
  ProviderError,
  ProviderNotConfiguredError,
  ProviderQuotaExceededError,
  AllProvidersFailed,
  ProviderTimeoutError,
  ProviderInvalidResponseError,
  ProviderRateLimitError,
  CostThresholdExceededError,
} from './shared/errors';

// Utilities
export {
  calculateCost,
  calculatePercentile,
  sleep,
  retryWithBackoff,
  hashString,
  truncateText,
  formatCost,
  formatLatency,
} from './shared/utils';

// Configuration
export {
  DEFAULT_USE_CASE_CONFIG,
  PROVIDER_PRICING,
  RATE_LIMITS,
  DEFAULT_TIMEOUTS,
  DEFAULT_MODELS,
  RETRY_CONFIG,
  CACHE_CONFIG,
  COST_TRACKING_CONFIG,
  LOGGING_CONFIG,
  DISCOVERY_CONFIG,
} from './config';
