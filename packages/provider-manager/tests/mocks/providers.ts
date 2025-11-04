/**
 * Mock data for tests
 * Simple, reusable mock responses for all provider types
 */

import type {
  TextGenerationResponse,
  EmbeddingResponse,
  ExtractionResponse,
  SearchResponse,
  SearchResult,
} from '../../src/core/ports';

// ============================================================================
// TEXT GENERATION MOCKS
// ============================================================================

export const mockTextGenerationResponse: TextGenerationResponse = {
  content: 'This is a mock generated response for testing purposes.',
  model: 'gpt-3.5-turbo',
  usage: {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
  },
  finishReason: 'stop',
  cost: 0.00006, // (10 * 0.0015 + 20 * 0.002) / 1000
  latency: 450,
};

export const mockChatMessages = [
  { role: 'system' as const, content: 'You are a helpful assistant.' },
  { role: 'user' as const, content: 'What is 2+2?' },
];

// ============================================================================
// EMBEDDING MOCKS
// ============================================================================

export const mockEmbeddingResponse: EmbeddingResponse = {
  embedding: new Array(1536).fill(0).map(() => Math.random()),
  model: 'text-embedding-3-small',
  dimensions: 1536,
  usage: {
    promptTokens: 8,
    totalTokens: 8,
  },
  cost: 0.00000016, // 8 * 0.00002 / 1000
  latency: 250,
};

// ============================================================================
// EXTRACTION MOCKS
// ============================================================================

export const mockExtractionSchema = {
  type: 'object' as const,
  properties: {
    title: { type: 'string' },
    deadline: { type: 'string', format: 'date' },
    amount: { type: 'string' },
  },
  required: ['title'],
};

export const mockExtractionResponse: ExtractionResponse<any> = {
  data: {
    title: 'Artist Grant 2024',
    deadline: '2024-12-31',
    amount: '$5,000',
  },
  confidence: 0.95,
  reasoning: 'Information extracted from HTML content',
  model: 'claude-3-haiku-20240307',
  usage: {
    promptTokens: 500,
    completionTokens: 100,
    totalTokens: 600,
  },
  cost: 0.000275, // (500 * 0.00025 + 100 * 0.00125) / 1000
  latency: 680,
};

// ============================================================================
// SEARCH MOCKS
// ============================================================================

export const mockSearchResults: SearchResult[] = [
  {
    title: 'Art Grant 2024 - Open Call',
    url: 'https://example.com/grant-1',
    snippet: 'Apply for the 2024 artist grant program...',
    domain: 'example.com',
    publishedDate: new Date('2024-10-01'),
    relevanceScore: 0.95,
  },
  {
    title: 'NYC Artist Residency',
    url: 'https://artfoundation.org/residency',
    snippet: 'Three-month residency for emerging artists...',
    domain: 'artfoundation.org',
    publishedDate: new Date('2024-09-15'),
    relevanceScore: 0.88,
  },
  {
    title: 'Contemporary Art Competition',
    url: 'https://example.com/competition',
    snippet: 'Submit your work to our annual competition...',
    domain: 'example.com',
    publishedDate: new Date('2024-08-20'),
    relevanceScore: 0.82,
  },
];

export const mockSearchResponse: SearchResponse = {
  results: mockSearchResults,
  totalResults: 287,
  query: 'art grants for emerging artists 2024',
  provider: 'serper',
  cost: 0.001,
  latency: 850,
};

// ============================================================================
// ERROR MOCKS
// ============================================================================

export class MockAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'MockAPIError';
  }
}

export const mockTimeoutError = () =>
  new MockAPIError('Request timeout', 408, 'TIMEOUT');

export const mockRateLimitError = () =>
  new MockAPIError('Rate limit exceeded', 429, 'RATE_LIMIT');

export const mockAuthError = () =>
  new MockAPIError('Invalid API key', 401, 'UNAUTHORIZED');

export const mockInvalidResponseError = () =>
  new MockAPIError('Invalid response format', 500, 'INVALID_RESPONSE');

// ============================================================================
// PROVIDER QUOTA MOCKS
// ============================================================================

export const mockProviderQuota = {
  remaining: 1000,
  limit: 10000,
  resetsAt: new Date(Date.now() + 3600000), // 1 hour from now
};

export const mockExceededQuota = {
  remaining: 0,
  limit: 100,
  resetsAt: new Date(Date.now() + 3600000),
};
