import { ChatMessage, ProviderQuota, UsageMetrics } from './common';

/**
 * Text Generation Provider Interface
 *
 * For LLM text generation tasks like query enhancement, semantic analysis,
 * and general text generation.
 *
 * @example
 * const provider = new OpenAITextAdapter(apiKey);
 * const response = await provider.generate('Enhance this query: art grants', {
 *   model: 'gpt-3.5-turbo',
 *   temperature: 0.7,
 * });
 */

export interface TextGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface TextGenerationResponse {
  content: string;
  model: string;
  usage: UsageMetrics;
  finishReason: 'stop' | 'length' | 'error' | 'content_filter';
  cost?: number;
  latency: number;
}

export interface ITextGenerationProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * List of models supported by this provider
   */
  readonly supportedModels: string[];

  /**
   * Generate text from a single prompt
   *
   * @param prompt - The input prompt
   * @param options - Generation options (model, temperature, etc.)
   * @returns Generated text response with metadata
   */
  generate(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResponse>;

  /**
   * Generate text from a chat conversation
   *
   * @param messages - Array of chat messages
   * @param options - Generation options
   * @returns Generated text response with metadata
   */
  chat(
    messages: ChatMessage[],
    options?: TextGenerationOptions
  ): Promise<TextGenerationResponse>;

  /**
   * Check if provider is properly configured with API keys
   */
  isConfigured(): boolean;

  /**
   * Get current quota/rate limit information
   */
  getQuota(): Promise<ProviderQuota>;
}
