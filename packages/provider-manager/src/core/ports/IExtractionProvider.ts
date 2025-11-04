/**
 * Extraction Provider Interface
 *
 * For extracting structured data from unstructured text,
 * particularly useful for opportunity extraction from HTML/text.
 *
 * @example
 * const provider = new AnthropicAdapter(apiKey);
 * const response = await provider.extract<OpportunityData>(htmlContent, {
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       title: { type: 'string' },
 *       deadline: { type: 'string' },
 *     },
 *   },
 * });
 */

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
}

export interface ExtractionOptions<T = any> {
  model?: string;
  temperature?: number;
  schema: JSONSchema;
  examples?: T[];
  systemPrompt?: string;
}

export interface ExtractionResponse<T = any> {
  data: T;
  confidence: number;
  reasoning?: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
  latency: number;
}

export interface IExtractionProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * List of models supported by this provider
   */
  readonly supportedModels: string[];

  /**
   * Extract structured data from unstructured content
   *
   * @param content - The unstructured text/HTML to extract from
   * @param options - Extraction options including schema
   * @returns Extracted structured data with confidence score
   */
  extract<T = any>(
    content: string,
    options: ExtractionOptions<T>
  ): Promise<ExtractionResponse<T>>;

  /**
   * Check if provider is properly configured with API keys
   */
  isConfigured(): boolean;
}
