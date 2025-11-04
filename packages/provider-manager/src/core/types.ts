/**
 * Shared types and enums for Provider Manager
 */

/**
 * Use Case enumeration
 *
 * Defines all supported use cases for provider routing.
 * Each use case can be configured with specific provider and model preferences.
 */
export enum UseCase {
  /**
   * Fast query enhancement for search optimization
   * Priority: Speed
   * Typical provider: OpenAI GPT-3.5
   */
  QUERY_ENHANCEMENT = 'query-enhancement',

  /**
   * High-quality semantic analysis and query generation
   * Priority: Quality
   * Typical provider: OpenAI GPT-4
   */
  SEMANTIC_ANALYSIS = 'semantic-analysis',

  /**
   * Structured data extraction from unstructured content
   * Priority: Cost
   * Typical provider: Anthropic Claude 3 Haiku
   */
  STRUCTURED_EXTRACTION = 'structured-extraction',

  /**
   * RAG-based question answering
   * Priority: Balance
   * Typical provider: OpenAI GPT-3.5
   */
  RAG_QA = 'rag-qa',

  /**
   * Vector embeddings for similarity search
   * Priority: Specialized
   * Typical provider: OpenAI text-embedding-3
   */
  EMBEDDINGS = 'embeddings',

  /**
   * Web search for opportunity discovery
   * Priority: Reliability
   * Typical provider: Serper.dev
   */
  WEB_SEARCH = 'web-search',

  /**
   * Social media search for opportunities
   * Priority: Coverage
   * Typical provider: Instagram/LinkedIn scrapers
   */
  SOCIAL_SEARCH = 'social-search',
}

/**
 * Priority type for use case configuration
 */
export type Priority = 'speed' | 'quality' | 'cost' | 'balance';

/**
 * Configuration for a specific use case
 */
export interface UseCaseConfig {
  /**
   * Primary provider to use for this use case
   */
  provider: string;

  /**
   * Specific model to use (optional, uses provider default if not specified)
   */
  model?: string;

  /**
   * Temperature for text generation (0.0 - 2.0)
   */
  temperature?: number;

  /**
   * Maximum tokens to generate
   */
  maxTokens?: number;

  /**
   * Priority optimization (speed, quality, cost, balance)
   */
  priority: Priority;

  /**
   * Fallback providers to try if primary fails
   */
  fallbackProviders?: string[];

  /**
   * Enable caching for this use case
   */
  enableCaching?: boolean;

  /**
   * Cache TTL in seconds
   */
  cacheTTL?: number;
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  [key: string]: any;
}

/**
 * Main Provider Manager configuration
 */
export interface ProviderManagerConfig {
  /**
   * Provider configurations by provider name
   */
  providers: Record<string, ProviderConfig>;

  /**
   * Use case configurations (optional, uses defaults if not provided)
   */
  useCases?: Partial<Record<UseCase, UseCaseConfig>>;

  /**
   * Enable cost tracking
   */
  enableCostTracking?: boolean;

  /**
   * Cost alert threshold in USD
   */
  costAlertThreshold?: number;

  /**
   * Default timeout for all providers in milliseconds
   */
  defaultTimeout?: number;
}

/**
 * Cost statistics for a use case or overall
 */
export interface CostStatistics {
  provider: string;
  model: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  averageCostPerRequest: number;
  averageLatency: number;
  successRate: number;
  totalTokens?: number;
  totalPromptTokens?: number;
  totalCompletionTokens?: number;
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  useCase: UseCase;
  provider: string;
  model: string;
  requests: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  lastError?: string;
  lastErrorTime?: Date;
}

/**
 * Cost alert configuration
 */
export interface CostAlert {
  useCase: UseCase;
  dailyLimit: number;
  onExceeded: (stats: CostStatistics) => void;
}

/**
 * Cost report configuration
 */
export interface CostReportConfig {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  groupBy: 'useCase' | 'provider' | 'model';
  startDate?: Date;
  endDate?: Date;
}

/**
 * Provider Manager options for specific operations
 */
export interface OperationOptions {
  /**
   * Override the configured provider for this operation
   */
  provider?: string;

  /**
   * Override the configured model for this operation
   */
  model?: string;

  /**
   * Disable fallback providers for this operation
   */
  disableFallback?: boolean;

  /**
   * Custom timeout for this operation in milliseconds
   */
  timeout?: number;

  /**
   * Additional metadata to track with this operation
   */
  metadata?: Record<string, any>;
}

/**
 * Discovery type for multi-provider search
 */
export type DiscoveryType = 'searchEngines' | 'llmSearch' | 'socialMedia';

/**
 * Options for discovery pattern (multi-provider search)
 */
export interface DiscoveryOptions {
  /**
   * Type of discovery to perform
   */
  discoveryType: DiscoveryType;

  /**
   * Maximum results to fetch from each provider
   */
  maxResultsPerProvider?: number;

  /**
   * Additional filters for search
   */
  filters?: {
    dateRange?: 'past_day' | 'past_week' | 'past_month' | 'past_year';
    location?: string;
    language?: string;
    verified?: boolean;
    [key: string]: any;
  };

  /**
   * Enable URL deduplication across providers
   */
  deduplicateUrls?: boolean;

  /**
   * Override enabled providers from config
   */
  enabledProviders?: string[];
}

/**
 * Result from a single provider in discovery pattern
 */
export interface ProviderSearchResult {
  /**
   * Provider name
   */
  provider: string;

  /**
   * Number of results returned
   */
  resultsCount: number;

  /**
   * Cost of this provider's query
   */
  cost?: number;

  /**
   * Latency in milliseconds
   */
  latency: number;

  /**
   * Error if provider failed
   */
  error?: string;

  /**
   * Success status
   */
  success: boolean;
}

/**
 * Response from multi-provider discovery search
 */
export interface MultipleSearchResponse {
  /**
   * Original search query
   */
  query: string;

  /**
   * Total number of results across all providers
   */
  totalResults: number;

  /**
   * Results from each provider
   */
  providerResults: ProviderSearchResult[];

  /**
   * All search results merged
   */
  results: any[];

  /**
   * Total cost across all providers
   */
  totalCost: number;

  /**
   * Total latency (sequential execution)
   */
  totalLatency: number;

  /**
   * Discovery type used
   */
  discoveryType: DiscoveryType;

  /**
   * Number of deduplicated URLs (if deduplication enabled)
   */
  deduplicatedCount?: number;
}
