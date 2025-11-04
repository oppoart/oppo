/**
 * AnthropicAdapter Real API Tests
 *
 * Tests actual Anthropic Claude API calls for extraction
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AnthropicAdapter } from '../../src/llm/adapters/AnthropicAdapter';

describe('AnthropicAdapter - Real API Tests', () => {
  let adapter: AnthropicAdapter;
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  beforeAll(() => {
    if (!hasApiKey) {
      console.warn('⚠️  ANTHROPIC_API_KEY not set, skipping real API tests');
      return;
    }

    adapter = new AnthropicAdapter({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  });

  it('should be configured when API key is provided', () => {
    if (!hasApiKey) return;

    expect(adapter.isConfigured()).toBe(true);
    expect(adapter.name).toBe('anthropic');
    expect(adapter.supportedModels).toContain('claude-3-haiku-20240307');
    expect(adapter.supportedModels).toContain('claude-3-sonnet-20240229');
  });

  it('should extract structured data from text', async () => {
    if (!hasApiKey) return;

    const htmlContent = `
      <div class="opportunity">
        <h2>Artist Grant 2024</h2>
        <p>Deadline: December 31, 2024</p>
        <p>Amount: $5,000</p>
        <p>Description: Open call for emerging artists working in contemporary art.</p>
      </div>
    `;

    const schema = {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        deadline: { type: 'string', format: 'date' },
        amount: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['title', 'description'],
    };

    const response = await adapter.extract(htmlContent, {
      schema,
      model: 'claude-3-haiku-20240307',
    });

    // Response structure
    expect(response).toBeDefined();
    expect(response.data).toBeDefined();
    expect(response.confidence).toBeGreaterThan(0);
    expect(response.confidence).toBeLessThanOrEqual(1);
    expect(response.model).toBe('claude-3-haiku-20240307');

    // Extracted data
    expect(response.data.title).toBeDefined();
    expect(response.data.title).toContain('Artist Grant');
    expect(response.data.description).toBeDefined();

    // Usage tracking
    expect(response.usage).toBeDefined();
    expect(response.usage.promptTokens).toBeGreaterThan(0);
    expect(response.usage.completionTokens).toBeGreaterThan(0);
    expect(response.usage.totalTokens).toBe(
      response.usage.promptTokens + response.usage.completionTokens
    );

    // Cost calculation
    expect(response.cost).toBeGreaterThan(0);
    expect(response.cost).toBeLessThan(0.01); // Should be very cheap with Haiku

    // Latency
    expect(response.latency).toBeGreaterThan(0);

    console.log(`📊 Extracted:`, response.data);
    console.log(`💰 Cost: $${response.cost.toFixed(6)}, Confidence: ${response.confidence}, Latency: ${response.latency}ms`);
  }, 20000);

  it('should extract complex nested data', async () => {
    if (!hasApiKey) return;

    const content = `
      Gallery XYZ announces their annual art competition.
      Prize: Grand prize of $10,000 plus exhibition opportunity.
      Eligibility: Open to artists ages 18-35.
      Medium: Painting, sculpture, and mixed media accepted.
      Submission deadline: March 15, 2025.
      Entry fee: $25 per artwork, maximum 3 submissions.
    `;

    const schema = {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        prize: { type: 'string' },
        eligibility: {
          type: 'object',
          properties: {
            minAge: { type: 'number' },
            maxAge: { type: 'number' },
          },
        },
        mediums: {
          type: 'array',
          items: { type: 'string' },
        },
        deadline: { type: 'string' },
        entryFee: { type: 'string' },
      },
      required: ['title', 'prize', 'deadline'],
    };

    const response = await adapter.extract(content, { schema });

    expect(response.data.title).toBeDefined();
    expect(response.data.prize).toContain('10,000');
    expect(response.data.deadline).toBeDefined();
    expect(response.data.mediums).toBeInstanceOf(Array);
    expect(response.data.mediums?.length).toBeGreaterThan(0);

    console.log(`📦 Complex extraction:`, JSON.stringify(response.data, null, 2));
  }, 20000);

  it('should provide reasoning for extraction', async () => {
    if (!hasApiKey) return;

    const content = 'The grant amount is between $1,000 and $5,000 depending on the project scope.';

    const schema = {
      type: 'object' as const,
      properties: {
        minAmount: { type: 'number' },
        maxAmount: { type: 'number' },
      },
      required: ['minAmount', 'maxAmount'],
    };

    const response = await adapter.extract(content, { schema });

    expect(response.data.minAmount).toBe(1000);
    expect(response.data.maxAmount).toBe(5000);
    expect(response.reasoning).toBeDefined();
    expect(response.reasoning!.length).toBeGreaterThan(10);

    console.log(`🤔 Reasoning: ${response.reasoning}`);
  }, 20000);

  it('should handle low temperature for consistent extraction', async () => {
    if (!hasApiKey) return;

    const content = 'Application deadline: June 30, 2025';

    const schema = {
      type: 'object' as const,
      properties: {
        deadline: { type: 'string', format: 'date' },
      },
      required: ['deadline'],
    };

    // Extract twice with temperature 0.1 (low, should be consistent)
    const response1 = await adapter.extract(content, {
      schema,
      temperature: 0.1,
    });

    const response2 = await adapter.extract(content, {
      schema,
      temperature: 0.1,
    });

    // Both should extract the same date
    expect(response1.data.deadline).toBe(response2.data.deadline);
  }, 40000);

  it('should calculate cost correctly for Haiku', async () => {
    if (!hasApiKey) return;

    const response = await adapter.extract('Simple text', {
      schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string' },
        },
        required: ['summary'],
      },
      model: 'claude-3-haiku-20240307',
    });

    // Claude 3 Haiku pricing: $0.00025 input, $0.00125 output per 1K tokens
    const expectedCost =
      (response.usage.promptTokens * 0.00025 +
        response.usage.completionTokens * 0.00125) /
      1000;

    expect(response.cost).toBeCloseTo(expectedCost, 8);
  }, 20000);

  it('should handle invalid API key gracefully', async () => {
    const badAdapter = new AnthropicAdapter({
      apiKey: 'sk-ant-invalid-key',
    });

    const schema = {
      type: 'object' as const,
      properties: { test: { type: 'string' } },
      required: ['test'],
    };

    await expect(
      badAdapter.extract('test', { schema })
    ).rejects.toThrow();
  }, 20000);

  it('should not be configured without API key', () => {
    const unconfiguredAdapter = new AnthropicAdapter({
      apiKey: '',
    });

    expect(unconfiguredAdapter.isConfigured()).toBe(false);
  });

  it('should return quota info', async () => {
    if (!hasApiKey) return;

    const quota = await adapter.getQuota();

    expect(quota).toBeDefined();
    expect(quota.remaining).toBe(-1); // Anthropic doesn't expose quota
    expect(quota.limit).toBe(-1);
  });
});
