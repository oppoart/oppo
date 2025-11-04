/**
 * OpenAITextAdapter Real API Tests
 *
 * Tests actual OpenAI API calls
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAITextAdapter } from '../../src/llm/adapters/OpenAITextAdapter';
import type { ChatMessage } from '../../src/core/ports';

describe('OpenAITextAdapter - Real API Tests', () => {
  let adapter: OpenAITextAdapter;
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  beforeAll(() => {
    if (!hasApiKey) {
      console.warn('⚠️  OPENAI_API_KEY not set, skipping real API tests');
      return;
    }

    adapter = new OpenAITextAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  });

  it('should be configured when API key is provided', () => {
    if (!hasApiKey) return;

    expect(adapter.isConfigured()).toBe(true);
    expect(adapter.name).toBe('openai');
    expect(adapter.supportedModels).toContain('gpt-3.5-turbo');
    expect(adapter.supportedModels).toContain('gpt-4');
  });

  it('should generate text with gpt-3.5-turbo', async () => {
    if (!hasApiKey) return;

    const prompt = 'Say "hello" and nothing else.';
    const response = await adapter.generate(prompt, {
      model: 'gpt-3.5-turbo',
      maxTokens: 10,
      temperature: 0.1,
    });

    // Response structure
    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.model).toContain('gpt-3.5-turbo');
    expect(response.finishReason).toBe('stop');

    // Usage tracking
    expect(response.usage).toBeDefined();
    expect(response.usage.promptTokens).toBeGreaterThan(0);
    expect(response.usage.completionTokens).toBeGreaterThan(0);
    expect(response.usage.totalTokens).toBe(
      response.usage.promptTokens + response.usage.completionTokens
    );

    // Cost calculation
    expect(response.cost).toBeGreaterThan(0);
    expect(response.cost).toBeLessThan(0.01); // Should be very cheap

    // Latency
    expect(response.latency).toBeGreaterThan(0);
    expect(response.latency).toBeLessThan(10000); // < 10 seconds

    console.log(`💬 Generated: "${response.content}"`);
    console.log(`💰 Cost: $${response.cost.toFixed(6)}, Latency: ${response.latency}ms`);
  }, 15000);

  it('should handle chat messages', async () => {
    if (!hasApiKey) return;

    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant that only responds with numbers.' },
      { role: 'user', content: 'What is 2+2? Reply with only the number.' },
    ];

    const response = await adapter.chat(messages, {
      model: 'gpt-3.5-turbo',
      maxTokens: 10,
      temperature: 0,
    });

    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(response.content.trim()).toContain('4');
    expect(response.usage.totalTokens).toBeGreaterThan(0);
    expect(response.cost).toBeGreaterThan(0);

    console.log(`🧮 Math answer: "${response.content}"`);
  }, 15000);

  it('should respect maxTokens limit', async () => {
    if (!hasApiKey) return;

    const response = await adapter.generate(
      'Write a very long essay about art.',
      {
        model: 'gpt-3.5-turbo',
        maxTokens: 20,
      }
    );

    expect(response.usage.completionTokens).toBeLessThanOrEqual(20);
    expect(response.finishReason).toBe('length'); // Should be cut off
  }, 15000);

  it('should apply temperature correctly', async () => {
    if (!hasApiKey) return;

    // Temperature 0 should be deterministic
    const prompt = 'Say the word "test" exactly once.';

    const response1 = await adapter.generate(prompt, {
      model: 'gpt-3.5-turbo',
      temperature: 0,
      maxTokens: 10,
    });

    const response2 = await adapter.generate(prompt, {
      model: 'gpt-3.5-turbo',
      temperature: 0,
      maxTokens: 10,
    });

    // With temperature 0, responses should be very similar or identical
    expect(response1.content.toLowerCase()).toContain('test');
    expect(response2.content.toLowerCase()).toContain('test');
  }, 30000);

  it('should calculate cost correctly for gpt-3.5-turbo', async () => {
    if (!hasApiKey) return;

    const response = await adapter.generate('Hello', {
      model: 'gpt-3.5-turbo',
      maxTokens: 5,
    });

    // GPT-3.5-turbo pricing: $0.0015 input, $0.002 output per 1K tokens
    const expectedCost =
      (response.usage.promptTokens * 0.0015 +
        response.usage.completionTokens * 0.002) /
      1000;

    expect(response.cost).toBeCloseTo(expectedCost, 6);
  }, 15000);

  it('should handle invalid API key gracefully', async () => {
    const badAdapter = new OpenAITextAdapter({
      apiKey: 'sk-invalid-key-xxx',
    });

    await expect(
      badAdapter.generate('test')
    ).rejects.toThrow();
  }, 15000);

  it('should not be configured without API key', () => {
    const unconfiguredAdapter = new OpenAITextAdapter({
      apiKey: '',
    });

    expect(unconfiguredAdapter.isConfigured()).toBe(false);
  });

  it('should return quota info', async () => {
    if (!hasApiKey) return;

    const quota = await adapter.getQuota();

    expect(quota).toBeDefined();
    expect(quota.remaining).toBe(-1); // OpenAI doesn't expose quota
    expect(quota.limit).toBe(-1);
  });
});
