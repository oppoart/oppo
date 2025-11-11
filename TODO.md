# TODO

Last commit: `339bd5f` (2025-01-11)

## 🔥 High Priority

### 1. Job Queue Integration
**Amaç**: Async job processing for discovery, scraping, analysis.

Backend:
- [ ] Add @oppo/job-queue to backend dependencies
- [ ] Create JobQueue NestJS module
- [ ] Implement job handlers (discovery, scraping, analysis)
- [ ] Connect SearchService to job queue
- [ ] Add job monitoring endpoints (stats, status, retry)

Config:
- [ ] Redis connection configuration
- [ ] Job queue settings (concurrency, timeouts)

### 2. Query Expansion Logic
**Amaç**: Template'lerdeki placeholder'ları profile parametreleri ile expand etmek.

Backend:
- [ ] Create query expansion service
- [ ] Implement cartesian product generator
- [ ] Add `/profiles/:id/expanded-queries` endpoint
- [ ] Handle placeholder replacement ([location], [opportunity-type], [amount], [theme])
- [ ] Support automatic placeholders ([medium], [month], [year])

Example: `[opportunity-type] in [location]` + 2 types × 3 locations = 6 queries

---

## 📋 Medium Priority

### Profile Edit Validation Improvements
- [ ] Artist Statement: required, min 200 chars
- [ ] Bio: required, min 100 chars
- [ ] Skills: min 3 required
- [ ] Interests: min 3 required
- [ ] Real-time completeness indicator in edit UI

### NestJS Configuration
- [ ] Create ProviderManager NestJS module (singleton)
- [ ] Validate all required environment variables
- [ ] Add config validation on startup
- [ ] Document required ENV vars in README

---

## 💡 Low Priority

### Provider Manager Improvements
- [ ] Add Firecrawl adapter
- [ ] Add Tavily search adapter
- [ ] Implement LLM streaming support
- [ ] Add provider health monitoring
- [ ] Fine-tune retry strategies

### Job Queue Enhancements
- [ ] Add BullMQ Board (UI dashboard)
- [ ] Implement job cleanup cron
- [ ] Add job priority support
- [ ] Write unit tests for @oppo/job-queue
- [ ] Write integration tests with backend

### System Improvements
- [ ] Cost tracking dashboard
- [ ] Provider performance metrics
- [ ] Rate limiting implementation
- [ ] Caching strategy (embeddings, search results)
- [ ] End-to-end integration tests

---

## ✅ Completed

### Profile Analysis Feature (Completed 2025-01-11)
- [x] Profile quality scoring endpoint (`POST /analyst/analyze`)
- [x] Weighted scoring algorithm (0-100%):
  * Artist Statement (25%), Query Parameters (20%)
  * Bio, Skills, Interests (15% each), Mediums (10%)
- [x] Completeness calculation with component breakdown
- [x] Strengths and weaknesses detection
- [x] Priority-based recommendations (high/medium/low)
- [x] Frontend: ProfileQualityAnalysisDisplay component
- [x] Visual indicators (progress bars, badges, icons)
- [x] Integration with profile view page (new tab)
- [x] Comprehensive algorithm documentation
- [x] TypeScript compilation fixes (12+ files)

### Phase 3: Integration (Completed 2025-11-04)
- [x] Provider Manager package (@oppo/provider-manager)
- [x] 4 adapters: OpenAI, Anthropic, Serper, Google
- [x] 35 real API tests (85% success rate)
- [x] Search module integration (parallel discovery)
- [x] Orchestrator module integration (RAG + cost tracking)
- [x] Research module automatic integration
- [x] Job Queue package (@oppo/job-queue)
- [x] Docker setup (PostgreSQL 16 + Redis 7)
- [x] Turbo v2 upgrade + TUI mode

### Query Templates System (Completed 2025-11-06)
- [x] Transform from checkbox-based to parametric system
- [x] Remove ProfileQueryTemplate model
- [x] Add query parameters to ArtistProfile (locations, types, amounts, themes)
- [x] Redesign Query Types tab UI (tag-based inputs)
- [x] Update profile view to show parameters
- [x] Create 24 realistic, searchable templates across 6 groups
- [x] Clean seed data with example parameters

### Profile Edit UX (Completed 2025-11-06)
- [x] Add AlertDialog for delete confirmation
- [x] Add toast notifications (save/delete)
- [x] Add loading states and spinners
- [x] URL-based tab navigation (?tab=queries)
- [x] "Configure Templates" button direct navigation

### Bug Fixes (Completed 2025-11-06)
- [x] Fix Query Templates module import paths
- [x] Add missing Accordion component
- [x] Fix provider-manager TypeScript errors
- [x] Fix job-queue generic type errors
- [x] Update login form default credentials
- [x] Enable webpack mode in NestJS

---

## 📝 Notes

**Login**: `artist@oppo.local` / `1234bes`

**Documentation**:
- Profile purpose: `.backups/tr/profile-amaci.md`
- Profile analysis algorithm: `docs/architecture/profile-analysis-algorithm.md`
- Provider Manager: `packages/provider-manager/README.md`
- Job Queue: `packages/job-queue/README.md`

**Development**:
- Start: `pnpm dev`
- Database: `pnpm db:seed`
- Docker: `pnpm dev:start` / `pnpm dev:stop`
