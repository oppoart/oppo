# API Key Standardization Plan

## Current Issues
- Multiple names for same API keys across codebase
- Inconsistent validation and error handling
- Services fail silently when keys are missing
- No centralized key management

## Standardized Environment Variable Names

### Search APIs
```bash
# Google Custom Search API
GOOGLE_SEARCH_API_KEY="your_google_api_key_here"
GOOGLE_SEARCH_ENGINE_ID="your_search_engine_id_here"

# SerpAPI (alternative to Google)
SERPAPI_KEY="your_serpapi_key_here"

# Bing Search API
BING_SEARCH_API_KEY="your_bing_api_key_here"
```

### AI APIs
```bash
# OpenAI
OPENAI_API_KEY="sk-your_openai_key_here"

# Anthropic Claude
ANTHROPIC_API_KEY="your_anthropic_key_here"

# Google AI (Gemini)
GOOGLE_AI_API_KEY="your_google_ai_key_here"
```

### Web Scraping & Data APIs
```bash
# Firecrawl for web scraping
FIRECRAWL_API_KEY="your_firecrawl_key_here"

# Perplexity API
PERPLEXITY_API_KEY="your_perplexity_key_here"

# Brave Search API
BRAVE_SEARCH_API_KEY="your_brave_key_here"
```

## Implementation Strategy

### Phase 1: Update Environment Schema
1. Update `apps/backend/src/config/env.ts` with standardized names
2. Update `packages/shared/src/config/validator.ts` to match
3. Update all service constructors to use new names

### Phase 2: Create Centralized API Key Manager
1. Create `ApiKeyManager` class to handle all API key operations
2. Implement validation, fallback strategies, and error handling
3. Add health check endpoints for each API service

### Phase 3: Update Services
1. Refactor all search services to use ApiKeyManager
2. Add proper error handling and fallback mechanisms
3. Update documentation and setup guides

### Phase 4: Add Monitoring & Alerts
1. Add API key usage tracking
2. Implement quota monitoring
3. Add alerts for failed API calls due to key issues

## Files to Update

### Backend Configuration
- `apps/backend/src/config/env.ts`
- `packages/shared/src/config/validator.ts`
- `packages/shared/src/config/ai.config.ts`

### Services
- `apps/backend/src/services/search/GoogleCustomSearchService.ts`
- `apps/backend/src/services/search/GoogleSearchService.ts`
- `apps/backend/src/services/search/WebSearchService.ts`
- `packages/services/orchestrator/config/OrchestratorConfig.ts`

### Documentation
- `apps/backend/GOOGLE_SEARCH_SETUP.md`
- `docs/environment-configuration.md`
- `README.md`

## Benefits After Implementation
- Single source of truth for API key names
- Consistent error handling across all services
- Better debugging and monitoring capabilities
- Easier deployment and configuration management
- Automatic fallback to alternative services when keys are missing
