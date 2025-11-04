# Provider Manager - Test Plan

**Approach**: Test-first, pragmatic, NO over-engineering

**Framework**: Vitest (already in package.json)

## Test Strategy

### 1. Unit Tests (Priority: HIGH)
Test individual components in isolation with mocks.

#### A. Adapter Tests
**Goal**: Verify adapters implement ports correctly and handle errors.

```
tests/adapters/
  ├── OpenAITextAdapter.test.ts
  ├── OpenAIEmbeddingAdapter.test.ts
  ├── AnthropicAdapter.test.ts
  └── SerperAdapter.test.ts
```

**What to test**:
- ✅ Adapter implements interface correctly
- ✅ Response mapping (API → internal format)
- ✅ Cost calculation
- ✅ Error handling (timeout, invalid API key, rate limit)
- ✅ isConfigured() returns correct value
- ❌ NOT testing: Actual API calls (use mocks)

**Example test structure**:
```typescript
describe('OpenAITextAdapter', () => {
  it('should format response correctly', () => {});
  it('should calculate cost correctly', () => {});
  it('should handle timeout errors', () => {});
  it('should detect unconfigured state', () => {});
});
```

#### B. ProviderManager Tests
**Goal**: Verify routing, fallback, and caching logic.

```
tests/core/ProviderManager.test.ts
```

**What to test**:
- ✅ Routes to correct provider based on use case
- ✅ Fallback to secondary provider on failure
- ✅ Caching works (cache hit/miss)
- ✅ Cost tracking is called
- ✅ Timeout handling
- ❌ NOT testing: Real provider calls

#### C. Discovery Pattern Tests
**Goal**: Verify searchMultiple() accumulates results correctly.

```
tests/discovery/searchMultiple.test.ts
```

**What to test**:
- ✅ Queries all enabled providers
- ✅ Accumulates results from multiple providers
- ✅ URL deduplication works
- ✅ Continues on provider failure
- ✅ Respects priority order
- ✅ Cost/latency aggregation

#### D. CostTracker Tests
**Goal**: Verify cost calculations and statistics.

```
tests/core/CostTracker.test.ts
```

**What to test**:
- ✅ Tracks operations correctly
- ✅ Calculates statistics (avg cost, latency, success rate)
- ✅ Cost alerts trigger at threshold
- ❌ NOT testing: Report generation (too complex for v1)

### 2. Integration Tests (Priority: MEDIUM - Optional)
Test with real APIs for smoke testing only.

**Goal**: Ensure adapters work with real APIs (run manually, not in CI).

```
tests/integration/
  ├── openai.integration.test.ts
  └── serper.integration.test.ts
```

**What to test**:
- ✅ Real API call succeeds
- ✅ Response is valid
- ❌ Skip in CI (requires API keys)
- ❌ Skip for expensive APIs (Anthropic)

**Run command**:
```bash
# Only run when API keys are set
INTEGRATION_TESTS=true pnpm test:integration
```

### 3. Mock Strategy

**Simple mocks, no libraries like msw** (avoid over-engineering).

```typescript
// tests/mocks/providers.ts

export const mockOpenAIResponse = {
  id: 'chatcmpl-123',
  choices: [{ message: { content: 'Test response' } }],
  usage: { prompt_tokens: 10, completion_tokens: 20 }
};

export const mockSearchResults = [
  { title: 'Result 1', url: 'https://example.com/1', snippet: 'Test' },
  { title: 'Result 2', url: 'https://example.com/2', snippet: 'Test' },
];
```

Use `vi.fn()` for simple mocking:
```typescript
const mockGenerate = vi.fn().mockResolvedValue(mockResponse);
```

## Test Coverage Goals

**Target**: 70-80% (not 100% - avoid over-engineering)

**Focus areas**:
- ✅ Core logic (routing, fallback, discovery)
- ✅ Error handling
- ✅ Cost calculation
- ⚠️  Lower priority: Edge cases, complex scenarios

**Skip**:
- ❌ Testing third-party libraries (axios, openai SDK)
- ❌ Testing type definitions
- ❌ Testing configuration constants

## Implementation Order

### Phase 1: Core Tests (Start here)
1. **Mock utilities** (`tests/mocks/providers.ts`)
2. **Adapter tests** (OpenAI, Anthropic, Serper)
3. **ProviderManager basic tests** (routing, fallback)

### Phase 2: Discovery Tests
4. **searchMultiple tests** (accumulation, deduplication)
5. **CostTracker tests** (statistics, alerts)

### Phase 3: Integration (Optional)
6. **Integration tests** (manual run only)

## Test File Structure

```
packages/provider-manager/
├── tests/
│   ├── mocks/
│   │   └── providers.ts          # Mock data for all tests
│   ├── adapters/
│   │   ├── OpenAITextAdapter.test.ts
│   │   ├── OpenAIEmbeddingAdapter.test.ts
│   │   ├── AnthropicAdapter.test.ts
│   │   └── SerperAdapter.test.ts
│   ├── core/
│   │   ├── ProviderManager.test.ts
│   │   ├── CostTracker.test.ts
│   │   └── UseCaseRouter.test.ts
│   ├── discovery/
│   │   └── searchMultiple.test.ts
│   └── integration/             # Run manually only
│       ├── openai.integration.test.ts
│       └── serper.integration.test.ts
├── vitest.config.ts
└── package.json
```

## Running Tests

```bash
# Run all unit tests
pnpm test

# Run specific test file
pnpm test OpenAITextAdapter

# Watch mode for development
pnpm test:watch

# Coverage report
pnpm test:coverage

# Integration tests (manual, requires API keys)
INTEGRATION_TESTS=true pnpm test:integration
```

## Success Criteria

✅ **Phase 2 complete when**:
- All adapter tests pass
- ProviderManager routing works
- Discovery pattern tested
- Cost tracking verified
- Coverage > 70%

## Anti-Patterns to Avoid

❌ **Don't**:
- Over-mock everything (use real classes where simple)
- Test implementation details (test behavior, not internals)
- Aim for 100% coverage (diminishing returns)
- Write complex test utilities (KISS principle)
- Test configuration files
- Test type definitions

✅ **Do**:
- Test public APIs only
- Use simple mocks (vi.fn())
- Focus on critical paths
- Keep tests readable
- Test error cases
