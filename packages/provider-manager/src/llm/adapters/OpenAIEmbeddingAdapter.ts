/**
 * OpenAI Embedding Adapter
 *
 * Implements embedding generation using OpenAI's text-embedding models
 */

import OpenAI from 'openai';
import {
  IEmbeddingProvider,
  EmbeddingOptions,
  EmbeddingResponse,
} from '../../core/ports';
import { calculateCost } from '../../shared/utils';
import { DEFAULT_MODELS } from '../../config';

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  maxRetries?: number;
}

export class OpenAIEmbeddingAdapter implements IEmbeddingProvider {
  readonly name = 'openai';
  readonly supportedModels = [
    'text-embedding-3-small',
    'text-embedding-3-large',
    'text-embedding-ada-002',
  ];
  readonly defaultDimensions = 1536;

  private client: OpenAI;
  private config: OpenAIEmbeddingConfig;

  constructor(config: OpenAIEmbeddingConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
      maxRetries: config.maxRetries ?? 3,
    });
  }

  async embed(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResponse> {
    const startTime = Date.now();

    const model = options?.model || DEFAULT_MODELS.openai.embedding;

    try {
      const response = await this.client.embeddings.create({
        model,
        input: text,
        dimensions: options?.dimensions,
      });

      const embedding = response.data[0];
      if (!embedding) {
        throw new Error('No embedding returned from OpenAI');
      }

      const cost = calculateCost(
        'openai',
        model,
        response.usage.prompt_tokens,
        0 // Embeddings don't have completion tokens
      );

      const latency = Date.now() - startTime;

      return {
        embedding: embedding.embedding,
        model: response.model,
        dimensions: embedding.embedding.length,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
        cost,
        latency,
      };
    } catch (error) {
      throw new Error(`OpenAI embedding failed: ${(error as Error).message}`);
    }
  }

  async embedBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<EmbeddingResponse[]> {
    const startTime = Date.now();

    const model = options?.model || DEFAULT_MODELS.openai.embedding;

    try {
      const response = await this.client.embeddings.create({
        model,
        input: texts,
        dimensions: options?.dimensions,
      });

      const latency = Date.now() - startTime;
      const avgLatency = latency / texts.length;

      // Calculate cost per embedding
      const totalCost = calculateCost(
        'openai',
        model,
        response.usage.prompt_tokens,
        0
      );
      const costPerEmbedding = totalCost / texts.length;

      // Calculate tokens per embedding
      const tokensPerEmbedding = Math.floor(
        response.usage.prompt_tokens / texts.length
      );

      return response.data.map(embedding => ({
        embedding: embedding.embedding,
        model: response.model,
        dimensions: embedding.embedding.length,
        usage: {
          promptTokens: tokensPerEmbedding,
          totalTokens: tokensPerEmbedding,
        },
        cost: costPerEmbedding,
        latency: avgLatency,
      }));
    } catch (error) {
      throw new Error(`OpenAI batch embedding failed: ${(error as Error).message}`);
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey !== '';
  }
}
