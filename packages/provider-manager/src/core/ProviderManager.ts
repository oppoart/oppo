/**
 * Provider Manager
 *
 * Main orchestrator that routes requests to appropriate providers based on use case.
 * Handles fallback strategies, cost tracking, and caching.
 */

import {
  ITextGenerationProvider,
  IEmbeddingProvider,
  IExtractionProvider,
  ISearchProvider,
  TextGenerationOptions,
  TextGenerationResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  ExtractionOptions,
  ExtractionResponse,
  SearchOptions,
  SearchResponse,
  ChatMessage,
} from './ports';

import {
  UseCase,
  ProviderManagerConfig,
  OperationOptions,
  CostStatistics,
  PerformanceMetrics,
  CostAlert,
  CostReportConfig,
  DiscoveryOptions,
  MultipleSearchResponse,
  ProviderSearchResult,
} from './types';

import { UseCaseRouter } from './UseCaseRouter';
import { CostTracker } from './CostTracker';

import {
  ProviderError,
  ProviderNotConfiguredError,
  AllProvidersFailed,
  ProviderTimeoutError,
} from '../shared/errors';

import { retryWithBackoff, hashString } from '../shared/utils';
import { DEFAULT_TIMEOUTS, DISCOVERY_CONFIG } from '../config';

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
}

export class ProviderManager {
  private textProviders: Map<string, ITextGenerationProvider> = new Map();
  private embeddingProviders: Map<string, IEmbeddingProvider> = new Map();
  private extractionProviders: Map<string, IExtractionProvider> = new Map();
  private searchProviders: Map<string, ISearchProvider> = new Map();

  private router: UseCaseRouter;
  private costTracker: CostTracker;

  // Simple in-memory cache
  private cache: Map<string, CacheEntry<any>> = new Map();

  constructor(config: ProviderManagerConfig) {
    // Initialize router
    this.router = new UseCaseRouter(config.useCases);

    // Initialize cost tracker
    this.costTracker = new CostTracker(config.enableCostTracking ?? true);

    // Note: Providers should be registered after construction using register methods
    // This allows flexibility in provider initialization
  }

  // ============================================================================
  // PROVIDER REGISTRATION
  // ============================================================================

  /**
   * Register a text generation provider
   */
  registerTextProvider(name: string, provider: ITextGenerationProvider): void {
    this.textProviders.set(name, provider);
  }

  /**
   * Register an embedding provider
   */
  registerEmbeddingProvider(name: string, provider: IEmbeddingProvider): void {
    this.embeddingProviders.set(name, provider);
  }

  /**
   * Register an extraction provider
   */
  registerExtractionProvider(name: string, provider: IExtractionProvider): void {
    this.extractionProviders.set(name, provider);
  }

  /**
   * Register a search provider
   */
  registerSearchProvider(name: string, provider: ISearchProvider): void {
    this.searchProviders.set(name, provider);
  }

  // ============================================================================
  // TEXT GENERATION
  // ============================================================================

  /**
   * Generate text based on use case
   *
   * @param prompt - The input prompt
   * @param useCase - Use case for routing (determines provider/model)
   * @param options - Additional options to override defaults
   * @returns Generated text response
   */
  async generate(
    prompt: string,
    useCase: UseCase,
    options?: Partial<TextGenerationOptions & OperationOptions>
  ): Promise<TextGenerationResponse> {
    const startTime = Date.now();

    // Check cache if enabled
    if (this.router.isCachingEnabled(useCase)) {
      const cached = this.getFromCache<TextGenerationResponse>(
        this.getCacheKey('text', prompt, useCase, options)
      );
      if (cached) {
        return cached;
      }
    }

    // Get configuration
    const config = this.router.getConfig(useCase);
    const providerName = options?.provider || config.provider;
    const provider = this.textProviders.get(providerName);

    if (!provider) {
      throw new ProviderNotConfiguredError(providerName);
    }

    if (!provider.isConfigured()) {
      throw new ProviderNotConfiguredError(providerName);
    }

    // Merge options
    const generationOptions: TextGenerationOptions = {
      model: options?.model || config.model,
      temperature: options?.temperature ?? config.temperature,
      maxTokens: options?.maxTokens ?? config.maxTokens,
      ...options,
    };

    try {
      // Execute with timeout
      const response = await this.withTimeout(
        provider.generate(prompt, generationOptions),
        options?.timeout || DEFAULT_TIMEOUTS.text
      );

      // Track cost and performance
      this.costTracker.track(useCase, providerName, response);

      // Cache if enabled
      if (this.router.isCachingEnabled(useCase)) {
        this.setInCache(
          this.getCacheKey('text', prompt, useCase, options),
          response,
          this.router.getCacheTTL(useCase)
        );
      }

      return response;
    } catch (error) {
      this.costTracker.track(
        useCase,
        providerName,
        {
          model: generationOptions.model || 'unknown',
          latency: Date.now() - startTime,
        },
        error as Error
      );

      // Try fallback providers if not explicitly disabled
      if (!options?.disableFallback) {
        return this.tryFallbackTextProviders(
          prompt,
          useCase,
          config,
          generationOptions,
          error as Error
        );
      }

      throw error;
    }
  }

  /**
   * Generate text from chat conversation
   */
  async chat(
    messages: ChatMessage[],
    useCase: UseCase,
    options?: Partial<TextGenerationOptions & OperationOptions>
  ): Promise<TextGenerationResponse> {
    const startTime = Date.now();

    // Get configuration
    const config = this.router.getConfig(useCase);
    const providerName = options?.provider || config.provider;
    const provider = this.textProviders.get(providerName);

    if (!provider) {
      throw new ProviderNotConfiguredError(providerName);
    }

    if (!provider.isConfigured()) {
      throw new ProviderNotConfiguredError(providerName);
    }

    // Merge options
    const generationOptions: TextGenerationOptions = {
      model: options?.model || config.model,
      temperature: options?.temperature ?? config.temperature,
      maxTokens: options?.maxTokens ?? config.maxTokens,
      ...options,
    };

    try {
      const response = await this.withTimeout(
        provider.chat(messages, generationOptions),
        options?.timeout || DEFAULT_TIMEOUTS.text
      );

      this.costTracker.track(useCase, providerName, response);

      return response;
    } catch (error) {
      this.costTracker.track(
        useCase,
        providerName,
        {
          model: generationOptions.model || 'unknown',
          latency: Date.now() - startTime,
        },
        error as Error
      );

      throw error;
    }
  }

  // ============================================================================
  // EMBEDDINGS
  // ============================================================================

  /**
   * Generate embeddings for text
   */
  async embed(
    text: string,
    useCase: UseCase = UseCase.EMBEDDINGS,
    options?: Partial<EmbeddingOptions & OperationOptions>
  ): Promise<EmbeddingResponse> {
    const startTime = Date.now();

    // Check cache
    if (this.router.isCachingEnabled(useCase)) {
      const cached = this.getFromCache<EmbeddingResponse>(
        this.getCacheKey('embedding', text, useCase, options)
      );
      if (cached) {
        return cached;
      }
    }

    // Get configuration
    const config = this.router.getConfig(useCase);
    const providerName = options?.provider || config.provider;
    const provider = this.embeddingProviders.get(providerName);

    if (!provider) {
      throw new ProviderNotConfiguredError(providerName);
    }

    if (!provider.isConfigured()) {
      throw new ProviderNotConfiguredError(providerName);
    }

    const embeddingOptions: EmbeddingOptions = {
      model: options?.model || config.model,
      ...options,
    };

    try {
      const response = await this.withTimeout(
        provider.embed(text, embeddingOptions),
        options?.timeout || DEFAULT_TIMEOUTS.embedding
      );

      this.costTracker.track(useCase, providerName, response);

      // Cache embeddings (they're stable)
      if (this.router.isCachingEnabled(useCase)) {
        this.setInCache(
          this.getCacheKey('embedding', text, useCase, options),
          response,
          this.router.getCacheTTL(useCase)
        );
      }

      return response;
    } catch (error) {
      this.costTracker.track(
        useCase,
        providerName,
        {
          model: embeddingOptions.model || 'unknown',
          latency: Date.now() - startTime,
        },
        error as Error
      );

      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(
    texts: string[],
    useCase: UseCase = UseCase.EMBEDDINGS,
    options?: Partial<EmbeddingOptions & OperationOptions>
  ): Promise<EmbeddingResponse[]> {
    const config = this.router.getConfig(useCase);
    const providerName = options?.provider || config.provider;
    const provider = this.embeddingProviders.get(providerName);

    if (!provider) {
      throw new ProviderNotConfiguredError(providerName);
    }

    if (!provider.isConfigured()) {
      throw new ProviderNotConfiguredError(providerName);
    }

    const embeddingOptions: EmbeddingOptions = {
      model: options?.model || config.model,
      ...options,
    };

    const responses = await provider.embedBatch(texts, embeddingOptions);

    // Track each embedding
    responses.forEach(response => {
      this.costTracker.track(useCase, providerName, response);
    });

    return responses;
  }

  // ============================================================================
  // STRUCTURED EXTRACTION
  // ============================================================================

  /**
   * Extract structured data from content
   */
  async extract<T = any>(
    content: string,
    schema: ExtractionOptions<T>['schema'],
    useCase: UseCase = UseCase.STRUCTURED_EXTRACTION,
    options?: Partial<Omit<ExtractionOptions<T>, 'schema'> & OperationOptions>
  ): Promise<ExtractionResponse<T>> {
    const startTime = Date.now();

    // Get configuration
    const config = this.router.getConfig(useCase);
    const providerName = options?.provider || config.provider;
    const provider = this.extractionProviders.get(providerName);

    if (!provider) {
      throw new ProviderNotConfiguredError(providerName);
    }

    if (!provider.isConfigured()) {
      throw new ProviderNotConfiguredError(providerName);
    }

    const extractionOptions: ExtractionOptions<T> = {
      schema,
      model: options?.model || config.model,
      temperature: options?.temperature ?? config.temperature,
      ...options,
    };

    try {
      const response = await this.withTimeout(
        provider.extract<T>(content, extractionOptions),
        options?.timeout || DEFAULT_TIMEOUTS.extraction
      );

      this.costTracker.track(useCase, providerName, {
        ...response,
        usage: response.usage,
      });

      return response;
    } catch (error) {
      this.costTracker.track(
        useCase,
        providerName,
        {
          model: extractionOptions.model || 'unknown',
          latency: Date.now() - startTime,
        },
        error as Error
      );

      // Try fallback for extraction
      if (!options?.disableFallback) {
        return this.tryFallbackExtractionProviders(
          content,
          useCase,
          config,
          extractionOptions,
          error as Error
        );
      }

      throw error;
    }
  }

  // ============================================================================
  // SEARCH
  // ============================================================================

  /**
   * Search for content
   */
  async search(
    query: string,
    useCase: UseCase = UseCase.WEB_SEARCH,
    options?: Partial<SearchOptions & OperationOptions>
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    // Check cache
    if (this.router.isCachingEnabled(useCase)) {
      const cached = this.getFromCache<SearchResponse>(
        this.getCacheKey('search', query, useCase, options)
      );
      if (cached) {
        return cached;
      }
    }

    // Get configuration
    const config = this.router.getConfig(useCase);
    const providerName = options?.provider || config.provider;
    const provider = this.searchProviders.get(providerName);

    if (!provider) {
      throw new ProviderNotConfiguredError(providerName);
    }

    if (!provider.isConfigured()) {
      throw new ProviderNotConfiguredError(providerName);
    }

    try {
      const response = await this.withTimeout(
        provider.search(query, options),
        options?.timeout || DEFAULT_TIMEOUTS.search
      );

      this.costTracker.track(useCase, providerName, response);

      // Cache search results
      if (this.router.isCachingEnabled(useCase)) {
        this.setInCache(
          this.getCacheKey('search', query, useCase, options),
          response,
          this.router.getCacheTTL(useCase)
        );
      }

      return response;
    } catch (error) {
      this.costTracker.track(
        useCase,
        providerName,
        {
          model: providerName,
          latency: Date.now() - startTime,
        },
        error as Error
      );

      // Try fallback for search
      if (!options?.disableFallback) {
        return this.tryFallbackSearchProviders(
          query,
          useCase,
          config,
          options,
          error as Error
        );
      }

      throw error;
    }
  }

  /**
   * Search multiple providers sequentially (Discovery Pattern)
   *
   * Query all enabled providers of a specific type and accumulate results.
   * This is different from fallback pattern - we query ALL providers regardless
   * of success/failure to get comprehensive coverage.
   *
   * @param query - Search query
   * @param options - Discovery options (discoveryType, filters, deduplication)
   * @returns Aggregated results from all providers
   */
  async searchMultiple(
    query: string,
    options: DiscoveryOptions
  ): Promise<MultipleSearchResponse> {
    const startTime = Date.now();
    const { discoveryType, maxResultsPerProvider, filters, deduplicateUrls = true, enabledProviders } = options;

    // Get discovery configuration based on type
    let discoveryConfig: any[];
    switch (discoveryType) {
      case 'searchEngines':
        discoveryConfig = DISCOVERY_CONFIG.searchEngines;
        break;
      case 'llmSearch':
        discoveryConfig = DISCOVERY_CONFIG.llmSearch;
        break;
      case 'socialMedia':
        discoveryConfig = DISCOVERY_CONFIG.socialMedia;
        break;
      default:
        throw new Error(`Unknown discovery type: ${discoveryType}`);
    }

    // Filter enabled providers
    let providersToQuery = discoveryConfig
      .filter(config => config.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Override with explicitly enabled providers if provided
    if (enabledProviders && enabledProviders.length > 0) {
      providersToQuery = providersToQuery.filter(config =>
        enabledProviders.includes(config.provider)
      );
    }

    if (providersToQuery.length === 0) {
      throw new Error(`No enabled providers found for discovery type: ${discoveryType}`);
    }

    // Query each provider sequentially
    const providerResults: ProviderSearchResult[] = [];
    const allResults: any[] = [];
    let totalCost = 0;

    for (const providerConfig of providersToQuery) {
      const providerName = providerConfig.provider;
      const provider = this.searchProviders.get(providerName);

      if (!provider) {
        // Provider not registered, skip
        providerResults.push({
          provider: providerName,
          resultsCount: 0,
          latency: 0,
          error: `Provider ${providerName} not registered`,
          success: false,
        });
        continue;
      }

      if (!provider.isConfigured()) {
        // Provider not configured, skip
        providerResults.push({
          provider: providerName,
          resultsCount: 0,
          latency: 0,
          error: `Provider ${providerName} not configured`,
          success: false,
        });
        continue;
      }

      // Query provider
      const providerStartTime = Date.now();
      try {
        const searchOptions: SearchOptions = {
          maxResults: maxResultsPerProvider || providerConfig.maxResults || 100,
          ...filters,
        };

        const response = await this.withTimeout(
          provider.search(query, searchOptions),
          DEFAULT_TIMEOUTS.search
        );

        const providerLatency = Date.now() - providerStartTime;

        // Track results
        providerResults.push({
          provider: providerName,
          resultsCount: response.results.length,
          cost: response.cost,
          latency: providerLatency,
          success: true,
        });

        // Add source to each result for traceability
        const resultsWithSource = response.results.map(result => ({
          ...result,
          source: providerName,
        }));

        allResults.push(...resultsWithSource);
        totalCost += response.cost || 0;

        // Track cost (use a generic "discovery" use case)
        this.costTracker.track(UseCase.WEB_SEARCH, providerName, response);

      } catch (error) {
        const providerLatency = Date.now() - providerStartTime;

        providerResults.push({
          provider: providerName,
          resultsCount: 0,
          latency: providerLatency,
          error: (error as Error).message,
          success: false,
        });

        // Track error
        this.costTracker.track(
          UseCase.WEB_SEARCH,
          providerName,
          {
            model: providerName,
            latency: providerLatency,
          },
          error as Error
        );

        // Continue to next provider even if this one failed
        continue;
      }
    }

    // Deduplicate by URL if enabled
    let deduplicatedCount = 0;
    if (deduplicateUrls && discoveryType === 'searchEngines') {
      const seenUrls = new Set<string>();
      const uniqueResults = [];

      for (const result of allResults) {
        if (result.url && !seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          uniqueResults.push(result);
        } else if (result.url) {
          deduplicatedCount++;
        }
      }

      allResults.length = 0;
      allResults.push(...uniqueResults);
    }

    const totalLatency = Date.now() - startTime;

    return {
      query,
      totalResults: allResults.length,
      providerResults,
      results: allResults,
      totalCost,
      totalLatency,
      discoveryType,
      ...(deduplicateUrls && { deduplicatedCount }),
    };
  }

  // ============================================================================
  // COST & PERFORMANCE TRACKING
  // ============================================================================

  /**
   * Get cost statistics
   */
  getCostStats(useCase?: UseCase): CostStatistics | Record<UseCase, CostStatistics> {
    return this.costTracker.getStats(useCase);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(
    useCase?: UseCase
  ): PerformanceMetrics | Record<UseCase, PerformanceMetrics> {
    return this.costTracker.getPerformanceMetrics(useCase);
  }

  /**
   * Set cost alert for a use case
   */
  setCostAlert(alert: CostAlert): void {
    this.costTracker.setCostAlert(alert);
  }

  /**
   * Generate cost report
   */
  generateCostReport(config: CostReportConfig): string {
    return this.costTracker.generateCostReport(config);
  }

  /**
   * Update use case configuration at runtime
   */
  updateUseCaseConfig(useCase: UseCase, updates: Partial<any>): void {
    this.router.updateConfig(useCase, updates);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Try fallback text providers
   */
  private async tryFallbackTextProviders(
    prompt: string,
    useCase: UseCase,
    config: any,
    options: TextGenerationOptions,
    originalError: Error
  ): Promise<TextGenerationResponse> {
    const fallbackProviders = config.fallbackProviders || [];
    const errors: ProviderError[] = [
      new ProviderError(originalError.message, config.provider, originalError),
    ];

    for (const fallbackName of fallbackProviders) {
      const fallbackProvider = this.textProviders.get(fallbackName);

      if (!fallbackProvider?.isConfigured()) {
        continue;
      }

      try {
        const response = await fallbackProvider.generate(prompt, options);
        this.costTracker.track(useCase, fallbackName, response);
        return response;
      } catch (error) {
        errors.push(new ProviderError((error as Error).message, fallbackName, error as Error));
      }
    }

    throw new AllProvidersFailed(useCase, errors);
  }

  /**
   * Try fallback extraction providers
   */
  private async tryFallbackExtractionProviders<T>(
    content: string,
    useCase: UseCase,
    config: any,
    options: ExtractionOptions<T>,
    originalError: Error
  ): Promise<ExtractionResponse<T>> {
    const fallbackProviders = config.fallbackProviders || [];
    const errors: ProviderError[] = [
      new ProviderError(originalError.message, config.provider, originalError),
    ];

    for (const fallbackName of fallbackProviders) {
      const fallbackProvider = this.extractionProviders.get(fallbackName);

      if (!fallbackProvider?.isConfigured()) {
        continue;
      }

      try {
        const response = await fallbackProvider.extract<T>(content, options);
        this.costTracker.track(useCase, fallbackName, {
          ...response,
          usage: response.usage,
        });
        return response;
      } catch (error) {
        errors.push(new ProviderError((error as Error).message, fallbackName, error as Error));
      }
    }

    throw new AllProvidersFailed(useCase, errors);
  }

  /**
   * Try fallback search providers
   */
  private async tryFallbackSearchProviders(
    query: string,
    useCase: UseCase,
    config: any,
    options: SearchOptions | undefined,
    originalError: Error
  ): Promise<SearchResponse> {
    const fallbackProviders = config.fallbackProviders || [];
    const errors: ProviderError[] = [
      new ProviderError(originalError.message, config.provider, originalError),
    ];

    for (const fallbackName of fallbackProviders) {
      const fallbackProvider = this.searchProviders.get(fallbackName);

      if (!fallbackProvider?.isConfigured()) {
        continue;
      }

      try {
        const response = await fallbackProvider.search(query, options);
        this.costTracker.track(useCase, fallbackName, response);
        return response;
      } catch (error) {
        errors.push(new ProviderError((error as Error).message, fallbackName, error as Error));
      }
    }

    throw new AllProvidersFailed(useCase, errors);
  }

  /**
   * Execute operation with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new ProviderTimeoutError('unknown', timeoutMs)), timeoutMs)
      ),
    ]);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(
    type: string,
    input: string,
    useCase: UseCase,
    options?: any
  ): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${type}:${useCase}:${hashString(input + optionsStr)}`;
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = new Date();
    const age = (now.getTime() - entry.timestamp.getTime()) / 1000;

    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set in cache
   */
  private setInCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl,
    });
  }
}
