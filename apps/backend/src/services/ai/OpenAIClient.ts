import OpenAI from 'openai';
import { aiConfig } from '../../config/env';
import pLimit from 'p-limit';

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIClient {
  private client: OpenAI;
  private limiter: ReturnType<typeof pLimit>;

  constructor() {
    this.client = new OpenAI({
      apiKey: aiConfig.openaiApiKey,
    });
    
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
    const {
      model = aiConfig.modelPrimary,
      maxTokens = aiConfig.maxTokens,
      temperature = 0.7,
      systemMessage
    } = options;

    return this.limiter(async () => {
      try {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        
        if (systemMessage) {
          messages.push({
            role: 'system',
            content: systemMessage
          });
        }
        
        messages.push({
          role: 'user',
          content: prompt
        });

        const completion = await this.client.chat.completions.create({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        });

        const content = completion.choices[0]?.message?.content || '';
        const usage = completion.usage;

        return {
          content,
          usage: usage ? {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens
          } : undefined
        };
      } catch (error) {
        if (model !== aiConfig.modelFallback) {
          console.warn(`OpenAI ${model} failed, falling back to ${aiConfig.modelFallback}`);
          return this.generateCompletion(prompt, {
            ...options,
            model: aiConfig.modelFallback
          });
        }
        throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.limiter(async () => {
      try {
        const response = await this.client.embeddings.create({
          model: 'text-embedding-ada-002',
          input: text,
        });

        return response.data[0].embedding;
      } catch (error) {
        throw new Error(`OpenAI Embedding API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

export const openaiClient = new OpenAIClient();