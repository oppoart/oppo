/**
 * OpenAIEmbeddingAdapter Real API Tests
 *
 * Tests actual OpenAI Embeddings API calls
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAIEmbeddingAdapter } from '../../src/llm/adapters/OpenAIEmbeddingAdapter';

describe('OpenAIEmbeddingAdapter - Real API Tests', () => {
  let adapter: OpenAIEmbeddingAdapter;
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  beforeAll(() => {
    if (!hasApiKey) {
      console.warn('⚠️  OPENAI_API_KEY not set, skipping real API tests');
      return;
    }

    adapter = new OpenAIEmbeddingAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  });

  it('should be configured when API key is provided', () => {
    if (!hasApiKey) return;

    expect(adapter.isConfigured()).toBe(true);
    expect(adapter.name).toBe('openai'); // Same as OpenAITextAdapter for consistency
    expect(adapter.supportedModels).toContain('text-embedding-3-small');
    expect(adapter.supportedModels).toContain('text-embedding-3-large');
    expect(adapter.defaultDimensions).toBe(1536);
  });

  it('should generate embeddings with text-embedding-3-small', async () => {
    if (!hasApiKey) return;

    const text = 'This is a test sentence for embedding generation.';
    const response = await adapter.embed(text, {
      model: 'text-embedding-3-small',
    });

    // Response structure
    expect(response).toBeDefined();
    expect(response.embedding).toBeInstanceOf(Array);
    expect(response.embedding.length).toBe(1536); // Default dimensions
    expect(response.model).toBe('text-embedding-3-small');
    expect(response.dimensions).toBe(1536);

    // All embeddings should be numbers
    expect(response.embedding.every(val => typeof val === 'number')).toBe(true);

    // Embeddings are usually normalized (-1 to 1)
    const allInRange = response.embedding.every(val => val >= -1 && val <= 1);
    expect(allInRange).toBe(true);

    // Usage tracking
    expect(response.usage).toBeDefined();
    expect(response.usage.promptTokens).toBeGreaterThan(0);
    expect(response.usage.totalTokens).toBe(response.usage.promptTokens);

    // Cost calculation
    expect(response.cost).toBeGreaterThan(0);
    expect(response.cost).toBeLessThan(0.001); // Very cheap

    // Latency
    expect(response.latency).toBeGreaterThan(0);

    console.log(`🔢 Generated ${response.embedding.length}D embedding`);
    console.log(`💰 Cost: $${response.cost.toFixed(8)}, Latency: ${response.latency}ms`);
  }, 15000);

  it('should generate batch embeddings', async () => {
    if (!hasApiKey) return;

    const texts = [
      'First sentence about art.',
      'Second sentence about grants.',
      'Third sentence about opportunities.',
    ];

    const responses = await adapter.embedBatch(texts, {
      model: 'text-embedding-3-small',
    });

    expect(responses).toBeInstanceOf(Array);
    expect(responses.length).toBe(3);

    // Each response should have embedding
    responses.forEach((response, idx) => {
      expect(response.embedding).toBeInstanceOf(Array);
      expect(response.embedding.length).toBe(1536);
      expect(response.cost).toBeGreaterThan(0);
      console.log(`  [${idx}] Cost: $${response.cost.toFixed(8)}`);
    });
  }, 15000);

  it('should calculate cost correctly', async () => {
    if (!hasApiKey) return;

    const response = await adapter.embed('Test text', {
      model: 'text-embedding-3-small',
    });

    // text-embedding-3-small pricing: $0.00002 per 1K tokens
    const expectedCost = (response.usage.promptTokens * 0.00002) / 1000;

    expect(response.cost).toBeCloseTo(expectedCost, 10);
  }, 15000);

  it('should work with text-embedding-3-large', async () => {
    if (!hasApiKey) return;

    const response = await adapter.embed('Test large model', {
      model: 'text-embedding-3-large',
    });

    expect(response.model).toBe('text-embedding-3-large');
    expect(response.embedding.length).toBe(3072); // Larger dimensions
    expect(response.dimensions).toBe(3072);
    expect(response.cost).toBeGreaterThan(0);

    console.log(`🔢 Large model: ${response.dimensions}D`);
  }, 15000);

  it('should handle custom dimensions (truncation)', async () => {
    if (!hasApiKey) return;

    const response = await adapter.embed('Test custom dimensions', {
      model: 'text-embedding-3-small',
      dimensions: 512, // Smaller than default 1536
    });

    expect(response.embedding.length).toBe(512);
    expect(response.dimensions).toBe(512);
  }, 15000);

  it('should generate similar embeddings for similar text', async () => {
    if (!hasApiKey) return;

    const text1 = 'Art grants and opportunities for artists.';
    const text2 = 'Artistic funding and opportunities for creators.';
    const text3 = 'Computer programming and software development.';

    const [emb1, emb2, emb3] = await adapter.embedBatch([text1, text2, text3]);

    // Calculate cosine similarity
    const cosineSimilarity = (a: number[], b: number[]) => {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magA * magB);
    };

    const sim12 = cosineSimilarity(emb1.embedding, emb2.embedding);
    const sim13 = cosineSimilarity(emb1.embedding, emb3.embedding);

    // Similar texts (1 & 2) should have higher similarity than dissimilar (1 & 3)
    expect(sim12).toBeGreaterThan(sim13);
    expect(sim12).toBeGreaterThan(0.7); // Should be reasonably similar

    console.log(`📊 Similarity (similar texts): ${sim12.toFixed(3)}`);
    console.log(`📊 Similarity (different texts): ${sim13.toFixed(3)}`);
  }, 15000);

  it('should handle invalid API key gracefully', async () => {
    const badAdapter = new OpenAIEmbeddingAdapter({
      apiKey: 'sk-invalid-key-xxx',
    });

    await expect(
      badAdapter.embed('test')
    ).rejects.toThrow();
  }, 15000);

  it('should not be configured without API key', () => {
    const unconfiguredAdapter = new OpenAIEmbeddingAdapter({
      apiKey: '',
    });

    expect(unconfiguredAdapter.isConfigured()).toBe(false);
  });
});
