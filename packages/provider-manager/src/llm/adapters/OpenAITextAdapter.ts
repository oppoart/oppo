/**
 * OpenAI Text Generation Adapter
 *
 * Implements text generation using OpenAI's GPT models (GPT-3.5, GPT-4, etc.)
 */

import OpenAI from 'openai';
import {
  ITextGenerationProvider,
  TextGenerationOptions,
  TextGenerationResponse,
  ChatMessage,
  ProviderQuota,
} from '../../core/ports';
import { calculateCost } from '../../shared/utils';
import { DEFAULT_MODELS } from '../../config';

export interface OpenAITextConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  maxRetries?: number;
}

export class OpenAITextAdapter implements ITextGenerationProvider {
  readonly name = 'openai';
  readonly supportedModels = [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4-turbo-preview',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
  ];

  private client: OpenAI;
  private config: OpenAITextConfig;

  constructor(config: OpenAITextConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
      maxRetries: config.maxRetries ?? 3,
    });
  }

  async generate(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResponse> {
    const startTime = Date.now();

    const model = options?.model || DEFAULT_MODELS.openai.text;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stopSequences,
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new Error('No response from OpenAI');
      }

      const usage = response.usage;
      if (!usage) {
        throw new Error('No usage information from OpenAI');
      }

      const cost = calculateCost(
        'openai',
        model,
        usage.prompt_tokens,
        usage.completion_tokens
      );

      const latency = Date.now() - startTime;

      return {
        content: choice.message.content || '',
        model: response.model,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        cost,
        latency,
      };
    } catch (error) {
      throw new Error(`OpenAI text generation failed: ${(error as Error).message}`);
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: TextGenerationOptions
  ): Promise<TextGenerationResponse> {
    const startTime = Date.now();

    const model = options?.model || DEFAULT_MODELS.openai.chat;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stopSequences,
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new Error('No response from OpenAI');
      }

      const usage = response.usage;
      if (!usage) {
        throw new Error('No usage information from OpenAI');
      }

      const cost = calculateCost(
        'openai',
        model,
        usage.prompt_tokens,
        usage.completion_tokens
      );

      const latency = Date.now() - startTime;

      return {
        content: choice.message.content || '',
        model: response.model,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        cost,
        latency,
      };
    } catch (error) {
      throw new Error(`OpenAI chat failed: ${(error as Error).message}`);
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey !== '';
  }

  async getQuota(): Promise<ProviderQuota> {
    // OpenAI doesn't provide a quota API
    // Return unknown values
    return {
      remaining: -1,
      limit: -1,
      resetsAt: null,
    };
  }

  /**
   * Map OpenAI finish reason to our standard format
   */
  private mapFinishReason(
    reason: string | null | undefined
  ): 'stop' | 'length' | 'error' | 'content_filter' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'error';
    }
  }
}
