/**
 * SerperAdapter Real API Tests
 *
 * Tests actual Serper.dev API calls
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SerperAdapter } from '../../src/search/adapters/SerperAdapter';

describe('SerperAdapter - Real API Tests', () => {
  let adapter: SerperAdapter;
  const hasApiKey = !!process.env.SERPER_API_KEY;

  beforeAll(() => {
    if (!hasApiKey) {
      console.warn('⚠️  SERPER_API_KEY not set, skipping real API tests');
      return;
    }

    adapter = new SerperAdapter({
      apiKey: process.env.SERPER_API_KEY!,
    });
  });

  it('should be configured when API key is provided', () => {
    if (!hasApiKey) return;

    expect(adapter.isConfigured()).toBe(true);
    expect(adapter.name).toBe('serper');
  });

  it('should perform a real search and return results', async () => {
    if (!hasApiKey) return;

    const query = 'art grants for emerging artists 2024';
    const response = await adapter.search(query, { maxResults: 10 });

    // Response structure
    expect(response).toBeDefined();
    expect(response.query).toBe(query);
    expect(response.provider).toBe('serper');
    expect(response.results).toBeInstanceOf(Array);
    expect(response.totalResults).toBeGreaterThan(0);

    // Check we got results
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results.length).toBeLessThanOrEqual(10);

    // Cost tracking
    expect(response.cost).toBe(0.001); // $1 per 1000 queries
    expect(response.latency).toBeGreaterThan(0);

    // Result structure
    const firstResult = response.results[0];
    expect(firstResult).toHaveProperty('title');
    expect(firstResult).toHaveProperty('url');
    expect(firstResult).toHaveProperty('snippet');
    expect(firstResult).toHaveProperty('domain');

    // URL should be valid
    expect(firstResult.url).toMatch(/^https?:\/\//);
  }, 10000); // 10s timeout for real API

  it('should handle maxResults parameter', async () => {
    if (!hasApiKey) return;

    const response = await adapter.search('test query', { maxResults: 5 });

    expect(response.results.length).toBeLessThanOrEqual(5);
  }, 10000);

  it('should clean queries correctly', async () => {
    if (!hasApiKey) return;

    // Test with quoted query
    const response = await adapter.search('"artist opportunities"', { maxResults: 3 });

    expect(response.query).not.toContain('""');
    expect(response.results.length).toBeGreaterThan(0);
  }, 10000);

  it('should return quota info', async () => {
    if (!hasApiKey) return;

    const quota = await adapter.getQuota();

    expect(quota).toBeDefined();
    expect(quota.remaining).toBe(-1); // Unlimited
    expect(quota.limit).toBe(-1);
    expect(quota.resetsAt).toBeNull();
  });

  it('should track request count', async () => {
    if (!hasApiKey) return;

    const initialCount = adapter.getRequestCount();

    await adapter.search('test', { maxResults: 1 });

    const newCount = adapter.getRequestCount();
    expect(newCount).toBe(initialCount + 1);
  }, 10000);

  it('should handle invalid API key gracefully', async () => {
    const badAdapter = new SerperAdapter({
      apiKey: 'invalid-key',
    });

    await expect(
      badAdapter.search('test')
    ).rejects.toThrow(/invalid or unauthorized/i);
  }, 10000);

  it('should not be configured without API key', () => {
    const unconfiguredAdapter = new SerperAdapter({
      apiKey: '',
    });

    expect(unconfiguredAdapter.isConfigured()).toBe(false);
  });
});
