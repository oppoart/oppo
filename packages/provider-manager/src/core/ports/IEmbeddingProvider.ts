/**
 * Embedding Provider Interface
 *
 * For generating vector embeddings for semantic similarity,
 * vector search, and clustering.
 *
 * @example
 * const provider = new OpenAIEmbeddingAdapter(apiKey);
 * const response = await provider.embed('artist grant opportunities');
 * // Use response.embedding for similarity calculations
 */

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  cost?: number;
  latency: number;
}

export interface IEmbeddingProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * List of models supported by this provider
   */
  readonly supportedModels: string[];

  /**
   * Default embedding dimensions for this provider
   */
  readonly defaultDimensions: number;

  /**
   * Generate embedding for a single text
   *
   * @param text - The text to embed
   * @param options - Embedding options (model, dimensions)
   * @returns Vector embedding with metadata
   */
  embed(text: string, options?: EmbeddingOptions): Promise<EmbeddingResponse>;

  /**
   * Generate embeddings for multiple texts in batch
   *
   * @param texts - Array of texts to embed
   * @param options - Embedding options
   * @returns Array of vector embeddings
   */
  embedBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<EmbeddingResponse[]>;

  /**
   * Check if provider is properly configured with API keys
   */
  isConfigured(): boolean;
}
