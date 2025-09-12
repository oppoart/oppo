# Sprint 2: External Data Pipeline
**Duration:** 2 weeks  
**Priority:** HIGH - Real data sources  
**Estimated Effort:** 45-55 hours  
**MVP Blocker:** Yes

## 🎯 Sprint Goal
Implement real external data sources and web scraping services to replace mock data with actual opportunity discovery from Google Search, organizational websites, and other external sources.

## 📋 Epic Breakdown

### Epic 1: Web Search Integration
**Story Points:** 13  
**Priority:** Critical

#### Tasks:
- [ ] **EXT-001** Set up Google Custom Search API integration
  - Configure Google Custom Search Engine
  - Implement search API client with pagination
  - Add search result parsing and filtering
  - **Acceptance Criteria:** Can search and retrieve results from Google
  - **Files to modify:** `packages/services/src/web-search/`

- [ ] **EXT-002** Create intelligent search query execution
  - Replace mock implementation in `WebSearchService.ts`
  - Implement query scheduling and rate limiting
  - Add result deduplication and ranking
  - **Acceptance Criteria:** Execute AI-generated queries and return relevant results
  - **Files to modify:** `packages/services/src/web-search/WebSearchService.ts`

- [ ] **EXT-003** Implement search result processing pipeline
  - Create content extraction from search results
  - Add metadata enrichment (dates, locations, types)
  - Implement content quality scoring
  - **Acceptance Criteria:** Convert raw search results to structured opportunity data
  - **Files to modify:** `packages/services/src/processing/`

### Epic 2: Web Scraping Infrastructure
**Story Points:** 21  
**Priority:** Critical

#### Tasks:
- [ ] **EXT-004** Build web scraping framework
  - Set up Puppeteer/Playwright for dynamic content
  - Create base scraper classes with common functionality
  - Implement proxy rotation and anti-detection measures
  - **Acceptance Criteria:** Can reliably scrape JavaScript-rendered pages
  - **Files to modify:** `packages/services/src/scraping/`

- [ ] **EXT-005** Create organization-specific scrapers
  - Implement scrapers for major grant databases (Grants.gov, Foundation Directory)
  - Create residency program scrapers (ResArtis, Alliance of Artists Communities)
  - Add exhibition opportunity scrapers (Call for Artists, ArtSlant)
  - **Acceptance Criteria:** Extract structured data from 10+ major opportunity sources
  - **Files to modify:** `packages/services/src/scrapers/`

- [ ] **EXT-006** Implement content extraction and parsing
  - Create intelligent text extraction from HTML
  - Add structured data parsing (JSON-LD, microdata)
  - Implement date and deadline extraction
  - **Acceptance Criteria:** Extract key opportunity details with 90% accuracy
  - **Files to modify:** `packages/services/src/extraction/`

### Epic 3: Data Pipeline & Processing
**Story Points:** 8  
**Priority:** High

#### Tasks:
- [ ] **EXT-007** Build data validation and cleaning pipeline
  - Implement opportunity data validation rules
  - Add duplicate detection and merging logic
  - Create data quality scoring system
  - **Acceptance Criteria:** Filter out invalid/duplicate opportunities automatically
  - **Files to modify:** `packages/services/src/validation/`

- [ ] **EXT-008** Create background job processing system
  - Set up job queue (Bull/Agenda.js) for scraping tasks
  - Implement retry logic and error handling
  - Add job scheduling and monitoring
  - **Acceptance Criteria:** Process scraping jobs reliably in background
  - **Files to modify:** `apps/backend/src/jobs/`

- [ ] **EXT-009** Implement data ingestion API
  - Update research service endpoints to use real data
  - Add data source tracking and attribution
  - Implement real-time vs batch processing modes
  - **Acceptance Criteria:** Research endpoints return real opportunity data
  - **Files to modify:** `apps/backend/src/routes/research.ts`

### Epic 4: Frontend Integration & UX
**Story Points:** 5  
**Priority:** Medium

#### Tasks:
- [ ] **EXT-010** Update research UI for real data streams
  - Remove hardcoded mock data displays
  - Add real-time progress indicators for scraping
  - Implement data source attribution in UI
  - **Acceptance Criteria:** Users see real opportunities being discovered
  - **Files to modify:** `apps/web/src/components/research/`

- [ ] **EXT-011** Add data source management interface
  - Create admin panel for managing scraping sources
  - Add ability to enable/disable specific scrapers
  - Implement scraping frequency configuration
  - **Acceptance Criteria:** Administrators can control data collection
  - **Files to modify:** `apps/web/src/app/dashboard/admin/`

## 🔧 Technical Requirements

### External APIs & Services
```env
GOOGLE_CUSTOM_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
SCRAPING_PROXY_URL=...
SCRAPING_USER_AGENT=OPPO/1.0
REDIS_URL=redis://localhost:6379
JOB_QUEUE_CONCURRENCY=5
```

### Dependencies to Add
```json
{
  "puppeteer": "^21.0.0",
  "playwright": "^1.40.0",
  "cheerio": "^1.0.0-rc.12",
  "googleapis": "^128.0.0",
  "bull": "^4.12.0",
  "axios": "^1.6.0",
  "node-cron": "^3.0.3",
  "url-parse": "^1.5.10"
}
```

### Infrastructure Requirements
- Redis instance for job queue and caching
- Increased server resources for scraping workloads
- Storage for scraped content and metadata
- Monitoring for scraping success rates

### Database Schema Updates
```sql
-- Add data source tracking
ALTER TABLE opportunities ADD COLUMN source_url VARCHAR(500);
ALTER TABLE opportunities ADD COLUMN scraped_at TIMESTAMP;
ALTER TABLE opportunities ADD COLUMN data_quality_score DECIMAL(3,2);

-- Create scraping jobs table
CREATE TABLE scraping_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL,
  source VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  opportunities_found INTEGER DEFAULT 0
);
```

## 📊 Definition of Done
- [ ] Google Custom Search integration working with real queries
- [ ] Web scraping framework can extract data from 10+ major sources
- [ ] Data pipeline validates and processes scraped content automatically
- [ ] Background job system processes scraping tasks reliably
- [ ] Research endpoints return real opportunity data instead of mocks
- [ ] Frontend displays real-time scraping progress and results
- [ ] Data quality metrics meet acceptance criteria (90% accuracy)
- [ ] Performance benchmarks met (process 1000+ opportunities/hour)
- [ ] Error handling covers network failures and anti-scraping measures
- [ ] Monitoring and alerting for data pipeline health

## 🚨 Risk Mitigation
- **Anti-Scraping Measures:** Implement proxy rotation, request throttling, and user-agent rotation
- **API Rate Limits:** Implement exponential backoff and request queuing
- **Data Quality Issues:** Add validation rules and manual review workflows
- **Legal Compliance:** Review terms of service for all scraped sites
- **Server Resources:** Monitor resource usage and scale infrastructure as needed

## 📈 Success Metrics
- Successfully scrape 500+ opportunities per day
- Data accuracy rate > 90% (manual verification)
- Scraping success rate > 95% across all sources
- API response time < 2 seconds for cached results
- Zero data pipeline failures > 1 hour
- User-reported data quality issues < 5% of total opportunities

## 🔗 Dependencies
- **Requires:** Sprint 1 completion (AI services for query generation)
- **Blocks:** Sprint 3 (Social & Communication Services)
- **External:** Google Custom Search API access, server infrastructure scaling

## 📝 Notes
- Prioritize reliability over speed - better to have fewer high-quality opportunities
- Focus on English-language opportunities initially, expand to other languages later
- Consider implementing a human-in-the-loop system for data quality validation
- Plan for legal review of scraping activities and compliance requirements
- Set up comprehensive logging and monitoring from day 1 of implementation

## 🎯 Success Criteria for MVP
At the end of this sprint, the system should be able to:
1. Take an artist profile
2. Generate relevant search queries using AI
3. Execute those queries against real external sources
4. Scrape and extract opportunity details
5. Store validated opportunities in the database
6. Display real opportunities to users in the frontend

This sprint is critical for achieving a functional MVP that provides real value to users.