/**
 * Common types shared across all provider ports
 */

export interface ProviderQuota {
  remaining: number;
  limit: number;
  resetsAt: Date | null;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
