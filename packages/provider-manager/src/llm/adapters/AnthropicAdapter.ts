/**
 * Anthropic Adapter
 *
 * Implements structured extraction using Claude 3 models (Haiku, Sonnet, Opus)
 * Also supports text generation for fallback scenarios
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  IExtractionProvider,
  ITextGenerationProvider,
  ExtractionOptions,
  ExtractionResponse,
  TextGenerationOptions,
  TextGenerationResponse,
  ChatMessage,
  ProviderQuota,
} from '../../core/ports';
import { calculateCost } from '../../shared/utils';
import { DEFAULT_MODELS } from '../../config';

export interface AnthropicConfig {
  apiKey: string;
  maxRetries?: number;
}

export class AnthropicAdapter implements IExtractionProvider, ITextGenerationProvider {
  readonly name = 'anthropic';
  readonly supportedModels = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  private client: Anthropic;
  private config: AnthropicConfig;

  constructor(config: AnthropicConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      maxRetries: config.maxRetries ?? 3,
    });
  }

  // ============================================================================
  // EXTRACTION IMPLEMENTATION
  // ============================================================================

  async extract<T = any>(
    content: string,
    options: ExtractionOptions<T>
  ): Promise<ExtractionResponse<T>> {
    const startTime = Date.now();

    const model = options.model || DEFAULT_MODELS.anthropic.extraction;

    // Build extraction prompt
    const systemPrompt = options.systemPrompt || this.buildExtractionSystemPrompt(options.schema);
    const userPrompt = this.buildExtractionUserPrompt(content, options);

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4000,
        temperature: options.temperature ?? 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const textContent = response.content[0];
      if (!textContent || textContent.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON response
      const extracted = this.parseExtractionResponse<T>((textContent as any).text);

      const cost = calculateCost(
        'anthropic',
        model,
        response.usage.input_tokens,
        response.usage.output_tokens
      );

      const latency = Date.now() - startTime;

      return {
        data: extracted.data,
        confidence: extracted.confidence,
        reasoning: extracted.reasoning,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        cost,
        latency,
      };
    } catch (error) {
      throw new Error(`Anthropic extraction failed: ${(error as Error).message}`);
    }
  }

  // ============================================================================
  // TEXT GENERATION IMPLEMENTATION (for fallback)
  // ============================================================================

  async generate(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResponse> {
    const startTime = Date.now();

    const model = options?.model || DEFAULT_MODELS.anthropic.text;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature ?? 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = response.content[0];
      if (!textContent || textContent.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const cost = calculateCost(
        'anthropic',
        model,
        response.usage.input_tokens,
        response.usage.output_tokens
      );

      const latency = Date.now() - startTime;

      return {
        content: (textContent as any).text,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: this.mapStopReason(response.stop_reason),
        cost,
        latency,
      };
    } catch (error) {
      throw new Error(`Anthropic text generation failed: ${(error as Error).message}`);
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: TextGenerationOptions
  ): Promise<TextGenerationResponse> {
    const startTime = Date.now();

    const model = options?.model || DEFAULT_MODELS.anthropic.chat;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature ?? 0.7,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role, // Claude doesn't support system role in messages
          content: msg.content,
        })),
      });

      const textContent = response.content[0];
      if (!textContent || textContent.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const cost = calculateCost(
        'anthropic',
        model,
        response.usage.input_tokens,
        response.usage.output_tokens
      );

      const latency = Date.now() - startTime;

      return {
        content: (textContent as any).text,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: this.mapStopReason(response.stop_reason),
        cost,
        latency,
      };
    } catch (error) {
      throw new Error(`Anthropic chat failed: ${(error as Error).message}`);
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey !== '';
  }

  async getQuota(): Promise<ProviderQuota> {
    // Anthropic doesn't provide a quota API
    return {
      remaining: -1,
      limit: -1,
      resetsAt: null,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private buildExtractionSystemPrompt(schema: any): string {
    return `You are a precise data extraction assistant. Your task is to extract structured information from unstructured text.

IMPORTANT RULES:
1. Extract ONLY information that is explicitly present in the text
2. Do NOT make assumptions or inferences
3. Return valid JSON matching the provided schema
4. Include a confidence score (0-1) indicating extraction quality
5. Provide reasoning for your extraction decisions
6. If information is not found, omit the field or use null

RESPONSE FORMAT:
{
  "data": { /* extracted data matching schema */ },
  "confidence": 0.95,
  "reasoning": "Brief explanation of extraction quality and any uncertainties"
}

SCHEMA:
${JSON.stringify(schema, null, 2)}`;
  }

  private buildExtractionUserPrompt<T>(content: string, options: ExtractionOptions<T>): string {
    let prompt = `Extract structured data from the following content:\n\n${content}\n\n`;

    if (options.examples && options.examples.length > 0) {
      prompt += `\nEXAMPLES:\n${JSON.stringify(options.examples, null, 2)}\n\n`;
    }

    prompt += 'Return the extracted data as JSON following the schema provided in the system message.';

    return prompt;
  }

  private parseExtractionResponse<T>(text: string): {
    data: T;
    confidence: number;
    reasoning?: string;
  } {
    try {
      // Try to find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        data: parsed.data,
        confidence: parsed.confidence ?? 0.5,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      throw new Error(`Failed to parse extraction response: ${(error as Error).message}`);
    }
  }

  private mapStopReason(reason: string | null): 'stop' | 'length' | 'error' | 'content_filter' {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'error';
    }
  }
}
