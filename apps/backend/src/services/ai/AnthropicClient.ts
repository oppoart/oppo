import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '../../config/env';
import pLimit from 'p-limit';
import { AIResponse } from './OpenAIClient';

export class AnthropicClient {
  private client: Anthropic | null = null;
  private limiter: ReturnType<typeof pLimit>;

  constructor() {
    if (aiConfig.anthropicApiKey) {
      this.client = new Anthropic({
        apiKey: aiConfig.anthropicApiKey,
      });
    }
    
    this.limiter = pLimit(aiConfig.rateLimit);
  }

  async generateCompletion(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemMessage?: string;
    } = {}
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized - API key missing');
    }

    const {
      model = 'claude-3-5-sonnet-20240620',
      maxTokens = aiConfig.maxTokens,
      temperature = 0.7,
      systemMessage = 'You are a helpful AI assistant.'
    } = options;

    return this.limiter(async () => {
      try {
        const message = await this.client!.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemMessage,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        const content = message.content[0]?.type === 'text' ? message.content[0].text : '';
        const usage = message.usage;

        return {
          content,
          usage: usage ? {
            prompt_tokens: usage.input_tokens,
            completion_tokens: usage.output_tokens,
            total_tokens: usage.input_tokens + usage.output_tokens
          } : undefined
        };
      } catch (error) {
        throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    
    try {
      await this.client.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Test'
          }
        ]
      });
      return true;
    } catch {
      return false;
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }
}

export const anthropicClient = new AnthropicClient();