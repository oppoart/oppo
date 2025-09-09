# Sentinel Module: Intelligent Web Data Collection

## Overview

The Sentinel module serves as the agent's sensory input system, responsible for discovering and extracting opportunity data from various web sources. It implements a tiered scraping strategy, using the most appropriate tool for each source type while minimizing complexity and resource usage.

## Architecture

### Layered Scraping Approach

```
┌─────────────────────────────────────────────┐
│            Source URL Input                  │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│         Layer 1: Simple API Scraping         │
│              (Firecrawl)                     │
│   • Structured sites                         │
│   • Static content                           │
│   • Fast extraction                          │
└──────────────────┬──────────────────────────┘
                   ▼ (If Layer 1 fails)
┌─────────────────────────────────────────────┐
│         Layer 2: AI-Enhanced Scraping        │
│           (ScrapeGraphAI Pattern)            │
│   • Semi-structured content                  │
│   • Dynamic layouts                          │
│   • Natural language extraction              │
└──────────────────┬──────────────────────────┘
                   ▼ (If Layer 2 fails)
┌─────────────────────────────────────────────┐
│         Layer 3: Browser Automation          │
│              (Playwright)                    │
│   • Login-required sites                     │
│   • Heavy JavaScript apps                    │
│   • Social media platforms                   │
└──────────────────────────────────────────────┘
```

## Core Components

### 1. Modern Scraping Toolkit

#### Firecrawl Integration
Ideal for the initial data collection layer with clean, structured output.

```typescript
// Firecrawl implementation example
import { FirecrawlApp } from '@mendable/firecrawl-js';

class FirecrawlScraper {
  private app: FirecrawlApp;
  
  constructor(apiKey: string) {
    this.app = new FirecrawlApp({ apiKey });
  }
  
  async scrapeArtPortal(url: string) {
    const result = await this.app.scrapeUrl(url, {
      formats: ['markdown', 'json'],
      includeTags: ['h1', 'h2', 'p', 'ul', 'time'],
      waitFor: 2000
    });
    
    return this.parseOpportunities(result.data);
  }
}
```

**Key Features:**
- Handles rotating proxies automatically
- Manages caching for efficiency
- Bypasses JavaScript-blocked content
- Returns clean Markdown/JSON format

#### ScrapeGraphAI Pattern
Uses LLM for intelligent data extraction from semi-structured pages.

```typescript
// AI-enhanced scraping implementation
class AIEnhancedScraper {
  async extractWithPrompt(html: string, prompt: string) {
    const llm = new OpenAI();
    
    const extractionPrompt = `
      Extract the following information from this HTML:
      ${prompt}
      
      HTML Content:
      ${html}
      
      Return as structured JSON.
    `;
    
    const response = await llm.complete(extractionPrompt);
    return JSON.parse(response);
  }
  
  async scrapeOpportunity(url: string) {
    const html = await this.fetchHTML(url);
    
    return this.extractWithPrompt(html, `
      - Application deadline
      - Application fee
      - Eligibility criteria
      - Organization name
      - Opportunity title
      - Description
    `);
  }
}
```

### 2. Browser Automation with Playwright

For dynamic content and protected sources requiring full browser capabilities.

```typescript
// Playwright implementation
import { chromium, Browser, Page } from 'playwright';

class PlaywrightScraper {
  private browser: Browser;
  
  async initialize() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });
  }
  
  async scrapeWithAuth(url: string, credentials: Credentials) {
    const context = await this.browser.newContext({
      storageState: 'auth-state.json' // Persistent auth
    });
    
    const page = await context.newPage();
    await page.goto(url);
    
    // Custom scraping logic
    return await this.extractData(page);
  }
}
```

## Source-Specific Strategies

### Art Portals (e.g., ArtConnect)

**Strategy**: Firecrawl for structured extraction

```typescript
const artPortalConfig = {
  sources: [
    {
      name: 'ArtConnect',
      url: 'https://www.artconnect.com/opportunities/opencalls',
      strategy: 'firecrawl',
      selectors: {
        opportunities: '.opportunity-card',
        title: 'h3.opportunity-title',
        deadline: '.deadline-date'
      }
    }
  ]
};
```

### Social Media Platforms

**Strategy**: Playwright with authentication and rate limiting

```typescript
class TwitterPlaybook {
  async execute(searchTerms: string[]) {
    const page = await this.authenticate();
    
    for (const term of searchTerms) {
      await page.goto(`https://twitter.com/search?q=${encodeURIComponent(term)}`);
      
      // Implement infinite scroll
      await this.scrollToLoad(page, { maxScrolls: 10 });
      
      // Extract posts
      const posts = await page.$$eval('.tweet', elements => 
        elements.map(el => ({
          text: el.querySelector('.tweet-text')?.textContent,
          link: el.querySelector('a')?.href,
          date: el.querySelector('time')?.getAttribute('datetime')
        }))
      );
      
      await this.rateLimitDelay();
    }
  }
}
```

### Search Engines

**Strategy**: API integration through LangChain/LlamaIndex

```typescript
class SearchEngineScraper {
  async searchForOpportunities(artistProfile: ArtistProfile) {
    const queries = this.generateSearchQueries(artistProfile);
    
    const searchTool = new TavilySearchTool();
    const results = [];
    
    for (const query of queries) {
      const searchResults = await searchTool.search(query);
      results.push(...searchResults.urls);
    }
    
    return results;
  }
  
  generateSearchQueries(profile: ArtistProfile): string[] {
    return [
      `${profile.medium} artist grants 2025`,
      `open call ${profile.themes.join(' ')} artists`,
      `${profile.location} art opportunities`
    ];
  }
}
```

## Playbook System

### Playbook Structure

```typescript
interface Playbook {
  name: string;
  source: string;
  triggers: string[];
  steps: PlaybookStep[];
  errorHandling: ErrorStrategy;
}

interface PlaybookStep {
  action: 'navigate' | 'click' | 'scroll' | 'extract' | 'wait';
  selector?: string;
  data?: any;
  timeout?: number;
}
```

### Example Playbooks

#### Instagram Playbook
```typescript
const instagramPlaybook: Playbook = {
  name: 'Instagram Opportunity Scanner',
  source: 'instagram.com',
  triggers: ['#artistopportunity', '#opencall', '#artgrant'],
  steps: [
    { action: 'navigate', data: 'https://instagram.com' },
    { action: 'wait', timeout: 2000 },
    { action: 'click', selector: '[aria-label="Search"]' },
    { action: 'extract', selector: '.post-content' }
  ],
  errorHandling: 'retry-with-backoff'
};
```

## Data Extraction Pipeline

### Processing Flow

1. **Raw Data Collection**
   - HTML/JSON from scrapers
   - Screenshots for verification
   - Metadata (timestamps, source URL)

2. **Data Cleaning**
   - Remove formatting artifacts
   - Normalize dates and times
   - Clean text content

3. **Structure Extraction**
   - Identify opportunity fields
   - Extract key information
   - Validate required fields

4. **Output Formatting**
   - Convert to standard schema
   - Add source attribution
   - Generate unique identifiers

## Rate Limiting & Politeness

### Implementation Strategy

```typescript
class RateLimiter {
  private limits: Map<string, RateLimit> = new Map([
    ['default', { requests: 10, window: 60000 }],
    ['twitter.com', { requests: 5, window: 60000 }],
    ['instagram.com', { requests: 3, window: 60000 }]
  ]);
  
  async throttle(domain: string) {
    const limit = this.limits.get(domain) || this.limits.get('default');
    await this.enforceLimit(domain, limit);
  }
}
```

## Error Handling

### Retry Strategy

```typescript
class RetryManager {
  async executeWithRetry(fn: Function, options: RetryOptions) {
    let lastError;
    
    for (let i = 0; i < options.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        await this.delay(options.baseDelay * Math.pow(2, i));
      }
    }
    
    throw new ScrapingError('Max retries exceeded', lastError);
  }
}
```

### Fallback Mechanisms

1. **Primary fails** → Try alternative selector
2. **Selector fails** → Use AI extraction
3. **AI fails** → Flag for manual review

## Performance Optimization

### Caching Strategy
- Cache static content for 24 hours
- Store authentication tokens
- Reuse browser contexts

### Parallel Processing
- Concurrent scraping with limits
- Queue management for sources
- Priority-based scheduling

## Configuration

### Source Configuration
```yaml
sources:
  - id: artconnect
    url: https://www.artconnect.com
    type: portal
    strategy: firecrawl
    schedule: "0 */6 * * *"
    priority: high
    
  - id: twitter
    url: https://twitter.com
    type: social
    strategy: playwright
    schedule: "0 */12 * * *"
    priority: medium
```

## Monitoring & Logging

### Metrics Tracked
- Success/failure rates per source
- Average extraction time
- Data quality scores
- Rate limit violations

### Logging Structure
```typescript
logger.info('Scraping started', {
  source: 'artconnect',
  strategy: 'firecrawl',
  timestamp: new Date(),
  correlationId: uuid()
});
```

## Testing

### Unit Tests
- Selector validation
- Data extraction logic
- Rate limiter functionality

### Integration Tests
- End-to-end scraping flows
- Error handling scenarios
- Authentication workflows

## Dependencies

- **@mendable/firecrawl-js**: Structured scraping
- **playwright**: Browser automation
- **cheerio**: HTML parsing
- **p-queue**: Concurrency control
- **winston**: Logging

## Related Documentation

- [System Architecture](../architecture/system-architecture.md)
- [Analyst Module](./analyst.md)
- [Technology Stack](../architecture/technology-stack.md)