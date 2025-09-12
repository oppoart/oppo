# Sprint 003: Analyst Module (AI-Powered Analysis Engine) Implementation

## Sprint Overview

**Sprint Goal**: Implement the Analyst module to provide AI-powered query generation, relevance scoring, and content analysis capabilities that bridge artist profiles with opportunity discovery.

**Duration**: 2-3 weeks  
**Priority**: High  
**Dependencies**: 
- ✅ Archivist module (Completed)
- ✅ Sentinel module (Completed)
- Database schema with ArtistProfile and Opportunity models

## 📁 Folder Structure

The Analyst module follows a modular, service-based architecture for AI-powered analysis:

```
/packages/services/analyst/
├── core/
│   └── AnalystService.ts              # Main orchestration service
├── query-generation/
│   ├── QueryGeneratorService.ts       # Convert artist profiles to search queries
│   ├── ProfileAnalyzer.ts             # Extract searchable elements from profiles
│   ├── ContextBuilder.ts              # Build context for AI query generation
│   ├── QueryOptimizer.ts              # Optimize queries for different sources
│   └── templates/                     # Query generation templates
│       ├── basic-query.template.ts    # Basic keyword queries
│       ├── semantic-query.template.ts # Semantic/AI-enhanced queries
│       └── source-specific/           # Platform-specific query formats
│           ├── google.template.ts
│           ├── perplexity.template.ts
│           └── social.template.ts
├── relevance-scoring/
│   ├── RelevanceScoringEngine.ts      # Main scoring orchestrator
│   ├── scorers/
│   │   ├── SemanticScorer.ts          # AI-powered semantic similarity
│   │   ├── KeywordScorer.ts           # Keyword matching algorithms
│   │   ├── CategoryScorer.ts          # Medium/category alignment
│   │   ├── LocationScorer.ts          # Geographic relevance
│   │   ├── ExperienceScorer.ts        # Experience level matching
│   │   └── TimeScorer.ts              # Deadline/urgency scoring
│   ├── aggregators/
│   │   ├── WeightedScoreAggregator.ts # Combine multiple scores
│   │   └── MLScoreAggregator.ts       # ML-based score combination
│   └── models/
│       └── ScoringModels.ts           # Data models for scoring
├── content-analysis/
│   ├── ContentAnalyzer.ts             # Main content analysis service
│   ├── analyzers/
│   │   ├── OpportunityExtractor.ts    # Extract key opportunity details
│   │   ├── RequirementAnalyzer.ts     # Analyze application requirements
│   │   ├── EligibilityChecker.ts      # Check artist eligibility
│   │   ├── SentimentAnalyzer.ts       # Analyze opportunity tone/sentiment
│   │   └── CompetitionAnalyzer.ts     # Assess competition level
│   ├── processors/
│   │   ├── TextProcessor.ts           # Clean and normalize text
│   │   ├── StructureExtractor.ts      # Extract structured data
│   │   └── MetadataEnricher.ts        # Add enriched metadata
│   └── ai-integrations/
│       ├── OpenAIAnalyzer.ts          # OpenAI-powered analysis
│       ├── AnthropicAnalyzer.ts       # Claude-powered analysis
│       └── GeminiAnalyzer.ts          # Gemini-powered analysis
├── trend-detection/
│   ├── TrendDetector.ts               # Main trend analysis service
│   ├── patterns/
│   │   ├── SeasonalPatterns.ts        # Seasonal opportunity trends
│   │   ├── GeographicPatterns.ts      # Location-based patterns
│   │   ├── MediumPatterns.ts          # Art medium trends
│   │   └── FundingPatterns.ts         # Funding/grant patterns
│   ├── analytics/
│   │   ├── StatisticalAnalyzer.ts     # Statistical trend analysis
│   │   ├── TimeSeriesAnalyzer.ts      # Time-based pattern detection
│   │   └── ClusterAnalyzer.ts         # Opportunity clustering
│   └── predictors/
│       └── OpportunityPredictor.ts    # Predict future opportunities
├── personalization/
│   ├── PersonalizationEngine.ts       # Main personalization service
│   ├── preference-learners/
│   │   ├── InteractionLearner.ts      # Learn from user interactions
│   │   ├── FeedbackLearner.ts         # Learn from explicit feedback
│   │   └── BehaviorLearner.ts         # Learn from browsing patterns
│   ├── recommendation/
│   │   ├── CollaborativeFilter.ts     # Collaborative filtering
│   │   ├── ContentBasedFilter.ts      # Content-based recommendations
│   │   └── HybridRecommender.ts       # Combined recommendation approaches
│   └── adaptation/
│       ├── ProfileUpdater.ts          # Update preferences automatically
│       └── QueryAdaptation.ts         # Adapt queries based on learning
├── caching/
│   ├── AnalysisCacheManager.ts        # Cache analysis results
│   ├── QueryCacheManager.ts           # Cache generated queries
│   └── ScoreCacheManager.ts           # Cache relevance scores
├── integration/
│   ├── ArchivistConnector.ts          # Connect with Archivist module
│   ├── SentinelConnector.ts           # Connect with Sentinel module
│   └── DatabaseConnector.ts           # Database operations
├── api/
│   └── analyst.ts                     # REST API routes
├── monitoring/
│   ├── AnalysisMetrics.ts             # Track analysis performance
│   └── PerformanceMonitor.ts          # Monitor service health
└── __tests__/
    ├── query-generation/              # Query generation tests
    ├── relevance-scoring/             # Scoring engine tests
    ├── content-analysis/              # Content analysis tests
    ├── integration/                   # End-to-end tests
    └── performance/                   # Performance benchmarks
```

**Benefits of this structure:**
- **Clear Separation of Concerns**: Each AI capability has its own module
- **Pluggable Architecture**: Easy to swap AI providers or add new scorers
- **Comprehensive Analysis**: Covers all aspects of AI-powered opportunity analysis
- **Scalable Integration**: Clean interfaces with existing modules
- **Performance Optimized**: Caching and monitoring built-in

## Sprint Backlog

### 🔍 **Epic 1: Query Generation System** (8 tasks)

*Addresses the critical architectural gap: "which service is going to take system prompt, and turn into search queries?"*

#### **Story 1.1: Core Query Generation Infrastructure**
- [ ] **ANA-001**: Create `core/AnalystService.ts` - Main orchestration service
  - Priority: **High**
  - Estimate: 8 hours
  - Location: `/packages/services/analyst/core/`
  - Acceptance Criteria: Can coordinate all analysis operations, manage AI service connections, handle job queuing

- [ ] **ANA-002**: Create `query-generation/QueryGeneratorService.ts` - Main query generation orchestrator
  - Priority: **High**
  - Estimate: 10 hours
  - Location: `/packages/services/analyst/query-generation/`
  - Acceptance Criteria: Converts artist profiles + system prompts into targeted search queries for multiple platforms

- [ ] **ANA-003**: Create `query-generation/ProfileAnalyzer.ts` - Extract searchable elements from artist profiles
  - Priority: **High**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/query-generation/`
  - Acceptance Criteria: Analyzes mediums, skills, interests, location, experience level from ArtistProfile model

- [ ] **ANA-004**: Create `query-generation/ContextBuilder.ts` - Build AI context for query generation
  - Priority: **High**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/query-generation/`
  - Acceptance Criteria: Creates rich context prompts that combine artist profile with system prompts

#### **Story 1.2: Query Template System**
- [ ] **ANA-005**: Create query template system in `templates/`
  - Priority: **High**
  - Estimate: 8 hours
  - Location: `/packages/services/analyst/query-generation/templates/`
  - Acceptance Criteria: Templates for basic, semantic, and source-specific query generation

- [ ] **ANA-006**: Create `query-generation/QueryOptimizer.ts` - Optimize queries for different discovery sources
  - Priority: **Medium**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/query-generation/`
  - Acceptance Criteria: Adapts queries for Google, Perplexity, social media, art portals

#### **Story 1.3: AI Integration for Query Generation**
- [ ] **ANA-007**: Integrate OpenAI for intelligent query generation
  - Priority: **High**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/query-generation/`
  - Acceptance Criteria: Uses GPT models to generate contextually relevant search queries

- [ ] **ANA-008**: Integrate Claude for query generation alternative
  - Priority: **Medium**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/query-generation/`
  - Acceptance Criteria: Uses Anthropic Claude for robust query generation with fallback capability

### 🎯 **Epic 2: Relevance Scoring Engine** (7 tasks)

#### **Story 2.1: Core Scoring Infrastructure**
- [ ] **ANA-009**: Create `relevance-scoring/RelevanceScoringEngine.ts` - Main scoring orchestrator
  - Priority: **High**
  - Estimate: 8 hours
  - Location: `/packages/services/analyst/relevance-scoring/`
  - Acceptance Criteria: Coordinates multiple scoring algorithms, manages scoring workflow

- [ ] **ANA-010**: Create `scorers/SemanticScorer.ts` - AI-powered semantic similarity scoring
  - Priority: **High**
  - Estimate: 8 hours
  - Location: `/packages/services/analyst/relevance-scoring/scorers/`
  - Acceptance Criteria: Uses embeddings to calculate semantic similarity between artist profiles and opportunities

- [ ] **ANA-011**: Create `scorers/KeywordScorer.ts` - Traditional keyword matching
  - Priority: **High**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/relevance-scoring/scorers/`
  - Acceptance Criteria: Implements TF-IDF and other keyword-based scoring algorithms

#### **Story 2.2: Specialized Scoring Components**
- [ ] **ANA-012**: Create `scorers/CategoryScorer.ts` - Art medium and category alignment
  - Priority: **Medium**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/relevance-scoring/scorers/`
  - Acceptance Criteria: Matches artist mediums with opportunity categories/requirements

- [ ] **ANA-013**: Create `scorers/LocationScorer.ts` - Geographic relevance scoring
  - Priority: **Medium**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/relevance-scoring/scorers/`
  - Acceptance Criteria: Calculates location-based relevance including travel feasibility

- [ ] **ANA-014**: Create `scorers/ExperienceScorer.ts` - Experience level matching
  - Priority: **Medium**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/relevance-scoring/scorers/`
  - Acceptance Criteria: Matches artist experience level with opportunity requirements

#### **Story 2.3: Score Aggregation**
- [ ] **ANA-015**: Create `aggregators/WeightedScoreAggregator.ts` - Combine multiple scores
  - Priority: **Medium**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/relevance-scoring/aggregators/`
  - Acceptance Criteria: Intelligently combines semantic, keyword, category, location scores

### 📊 **Epic 3: Content Analysis Pipeline** (6 tasks)

#### **Story 3.1: Core Analysis Infrastructure**
- [ ] **ANA-016**: Create `content-analysis/ContentAnalyzer.ts` - Main content analysis orchestrator
  - Priority: **High**
  - Estimate: 8 hours
  - Location: `/packages/services/analyst/content-analysis/`
  - Acceptance Criteria: Coordinates all content analysis operations, manages AI service calls

- [ ] **ANA-017**: Create `analyzers/OpportunityExtractor.ts` - Extract key opportunity details
  - Priority: **High**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/content-analysis/analyzers/`
  - Acceptance Criteria: Extracts deadline, amount, requirements, eligibility from opportunity text

- [ ] **ANA-018**: Create `analyzers/RequirementAnalyzer.ts` - Parse application requirements
  - Priority: **High**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/content-analysis/analyzers/`
  - Acceptance Criteria: Identifies and structures application requirements and submission guidelines

#### **Story 3.2: Advanced Analysis Features**
- [ ] **ANA-019**: Create `analyzers/EligibilityChecker.ts` - Check artist eligibility automatically
  - Priority: **Medium**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/content-analysis/analyzers/`
  - Acceptance Criteria: Cross-references opportunity requirements with artist profile to determine eligibility

- [ ] **ANA-020**: Create `analyzers/CompetitionAnalyzer.ts` - Assess opportunity competitiveness
  - Priority: **Medium**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/content-analysis/analyzers/`
  - Acceptance Criteria: Estimates competition level based on requirements, funding, and historical data

- [ ] **ANA-021**: Create AI integration components in `ai-integrations/`
  - Priority: **High**
  - Estimate: 8 hours
  - Location: `/packages/services/analyst/content-analysis/ai-integrations/`
  - Acceptance Criteria: OpenAI, Claude, and Gemini integrations for content analysis

### 📈 **Epic 4: Trend Detection & Analytics** (4 tasks)

#### **Story 4.1: Trend Analysis Infrastructure**
- [ ] **ANA-022**: Create `trend-detection/TrendDetector.ts` - Main trend analysis service
  - Priority: **Low**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/trend-detection/`
  - Acceptance Criteria: Identifies patterns in opportunities over time, geography, and categories

- [ ] **ANA-023**: Create `patterns/SeasonalPatterns.ts` - Detect seasonal opportunity trends
  - Priority: **Low**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/trend-detection/patterns/`
  - Acceptance Criteria: Identifies when certain types of opportunities are most common

- [ ] **ANA-024**: Create `analytics/StatisticalAnalyzer.ts` - Statistical trend analysis
  - Priority: **Low**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/trend-detection/analytics/`
  - Acceptance Criteria: Provides statistical insights on opportunity trends and patterns

- [ ] **ANA-025**: Create `predictors/OpportunityPredictor.ts` - Predict future opportunities
  - Priority: **Low**
  - Estimate: 8 hours
  - Location: `/packages/services/analyst/trend-detection/predictors/`
  - Acceptance Criteria: Uses historical data to predict when similar opportunities might appear

### 👤 **Epic 5: Personalization Engine** (5 tasks)

#### **Story 5.1: Learning Systems**
- [ ] **ANA-026**: Create `personalization/PersonalizationEngine.ts` - Main personalization orchestrator
  - Priority: **Medium**
  - Estimate: 8 hours
  - Location: `/packages/services/analyst/personalization/`
  - Acceptance Criteria: Coordinates learning from user interactions to improve recommendations

- [ ] **ANA-027**: Create `preference-learners/InteractionLearner.ts` - Learn from user clicks/views
  - Priority: **Medium**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/personalization/preference-learners/`
  - Acceptance Criteria: Tracks which opportunities users engage with to improve future recommendations

- [ ] **ANA-028**: Create `recommendation/ContentBasedFilter.ts` - Content-based recommendations
  - Priority: **Medium**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/personalization/recommendation/`
  - Acceptance Criteria: Recommends opportunities similar to ones the artist has shown interest in

#### **Story 5.2: Adaptive Systems**
- [ ] **ANA-029**: Create `adaptation/ProfileUpdater.ts` - Auto-update preferences
  - Priority: **Low**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/personalization/adaptation/`
  - Acceptance Criteria: Automatically updates artist preferences based on behavior patterns

- [ ] **ANA-030**: Create `adaptation/QueryAdaptation.ts` - Adapt queries based on learning
  - Priority: **Low**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/personalization/adaptation/`
  - Acceptance Criteria: Modifies search queries based on what types of opportunities the artist engages with

### 🔧 **Epic 6: Infrastructure & Integration** (6 tasks)

#### **Story 6.1: Caching & Performance**
- [ ] **ANA-031**: Create `caching/AnalysisCacheManager.ts` - Cache analysis results
  - Priority: **Medium**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/caching/`
  - Acceptance Criteria: Caches expensive AI operations to improve performance

- [ ] **ANA-032**: Create `caching/ScoreCacheManager.ts` - Cache relevance scores
  - Priority: **Medium**
  - Estimate: 3 hours
  - Location: `/packages/services/analyst/caching/`
  - Acceptance Criteria: Caches scoring results for frequently accessed opportunities

#### **Story 6.2: Module Integration**
- [ ] **ANA-033**: Create `integration/SentinelConnector.ts` - Connect with Sentinel discovery
  - Priority: **High**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/integration/`
  - Acceptance Criteria: Provides generated queries to Sentinel, receives discovered opportunities

- [ ] **ANA-034**: Create `integration/ArchivistConnector.ts` - Connect with Archivist storage
  - Priority: **High**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/integration/`
  - Acceptance Criteria: Retrieves opportunities for scoring, stores analysis results

- [ ] **ANA-035**: Create `integration/DatabaseConnector.ts` - Database operations
  - Priority: **High**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/integration/`
  - Acceptance Criteria: Handles all database operations for artist profiles and opportunities

#### **Story 6.3: API & Monitoring**
- [ ] **ANA-036**: Create `api/analyst.ts` - REST API routes
  - Priority: **Medium**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/api/`
  - Acceptance Criteria: Complete REST API for all analysis operations

### 🧪 **Epic 7: Testing & Quality Assurance** (4 tasks)

#### **Story 7.1: Testing Suite**
- [ ] **ANA-037**: Create `__tests__/query-generation/` - Query generation tests
  - Priority: **Medium**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/__tests__/query-generation/`
  - Acceptance Criteria: Comprehensive tests for query generation from various artist profiles

- [ ] **ANA-038**: Create `__tests__/relevance-scoring/` - Scoring engine tests
  - Priority: **Medium**
  - Estimate: 6 hours
  - Location: `/packages/services/analyst/__tests__/relevance-scoring/`
  - Acceptance Criteria: Tests for all scoring algorithms and aggregation logic

- [ ] **ANA-039**: Create `__tests__/integration/` - End-to-end integration tests
  - Priority: **Medium**
  - Estimate: 8 hours
  - Location: `/packages/services/analyst/__tests__/integration/`
  - Acceptance Criteria: Full pipeline tests from profile to scored opportunities

- [ ] **ANA-040**: Create `__tests__/performance/` - Performance benchmarks
  - Priority: **Low**
  - Estimate: 4 hours
  - Location: `/packages/services/analyst/__tests__/performance/`
  - Acceptance Criteria: Performance benchmarks for AI operations and caching effectiveness

## Sprint Scope Decision Points

### ✅ **Recommended Core Scope** (MVP - Phase 1)
**Focus: Query Generation System (Epic 1) + Basic Relevance Scoring (Epic 2)**
- Query Generation Service (ANA-001 to ANA-008) - **50 hours**
- Basic Relevance Scoring (ANA-009 to ANA-015) - **36 hours**
- Integration with Sentinel/Archivist (ANA-033 to ANA-035) - **14 hours**
- Basic API layer (ANA-036) - **6 hours**

**Total MVP: ~106 hours (2-2.5 weeks)**

### 🎯 **Extended Scope** (Phase 2 - if Phase 1 completes early)
- Content Analysis Pipeline (ANA-016 to ANA-021) - **38 hours**
- Caching infrastructure (ANA-031 to ANA-032) - **7 hours**
- Core testing suite (ANA-037 to ANA-038) - **12 hours**

### ⏭️ **Future Sprint Candidates** (Phase 3+)
- Trend Detection & Analytics (ANA-022 to ANA-025)
- Personalization Engine (ANA-026 to ANA-030)
- Advanced testing and performance optimization
- Monitoring and metrics collection

## Key Architectural Decisions

### **Query Generation Strategy**
1. **Multi-Template Approach**: Different templates for different source types (Google vs social media vs art portals)
2. **AI-Enhanced Generation**: Use GPT/Claude to create contextually rich queries from artist profiles
3. **Progressive Enhancement**: Start with keyword-based queries, enhance with semantic understanding
4. **Source Optimization**: Customize query format and style for each discovery source

### **Relevance Scoring Philosophy**
1. **Multi-Signal Scoring**: Combine semantic, keyword, category, location, experience signals
2. **Weighted Aggregation**: Different weights for different signal types based on importance
3. **Learning Integration**: Scores improve over time based on user interactions
4. **Transparency**: Provide explanations for why opportunities were scored highly

### **Integration Pattern**
```typescript
// Core workflow integration
Artist Profile → Query Generator → Sentinel Discovery → Relevance Scorer → Archivist Storage
                      ↓                    ↓                    ↓              ↓
                AI Prompts         Search Results      Scored Results   Stored & Cached
```

## Definition of Done

### **Technical Requirements**
- [ ] All TypeScript code follows project conventions
- [ ] Integration with existing Archivist and Sentinel modules works seamlessly
- [ ] AI service integrations handle rate limiting and failures gracefully
- [ ] Caching reduces redundant expensive operations
- [ ] Database operations are optimized and properly indexed
- [ ] Error handling covers all edge cases with proper logging

### **Functional Requirements - Phase 1 (MVP)**
- [ ] ✅ **PRIMARY GOAL**: System can convert artist profiles into search queries that Sentinel can execute
- [ ] Query generation works for at least 3 different source types (Google, Perplexity, art portals)
- [ ] Generated queries are contextually relevant to artist's medium, interests, and experience level
- [ ] Basic relevance scoring provides meaningful ranking of discovered opportunities
- [ ] Semantic scoring using embeddings shows measurable improvement over keyword matching
- [ ] Integration allows automatic flow: Profile → Queries → Discovery → Scoring → Storage

### **Quality Requirements**
- [ ] Query generation produces queries that return relevant results >70% of the time
- [ ] Relevance scoring correlates with manual human assessment (sample testing)
- [ ] Response times are acceptable: Query generation <5s, Scoring <10s per opportunity
- [ ] System handles failures gracefully with proper fallbacks
- [ ] AI costs are tracked and remain within reasonable bounds

### **Documentation Requirements**
- [ ] API endpoints are documented with examples
- [ ] Query generation templates are documented with use cases
- [ ] Scoring algorithm weights and logic are documented
- [ ] Integration patterns with other modules are documented
- [ ] Performance characteristics and limitations are documented

## Risk Assessment

### **High Risk**
- **AI Service Dependencies**: Heavy reliance on OpenAI/Claude for core functionality
  - *Mitigation*: Implement multiple AI provider fallbacks, cache results aggressively
- **Query Quality**: Generated queries may not produce relevant results initially
  - *Mitigation*: Extensive testing with diverse artist profiles, iterative template refinement
- **Performance**: AI operations may be too slow for real-time use
  - *Mitigation*: Implement comprehensive caching, async processing where possible

### **Medium Risk**
- **Integration Complexity**: Complex data flow between three modules (Archivist, Sentinel, Analyst)
  - *Mitigation*: Clear interface definitions, comprehensive integration testing
- **Scoring Accuracy**: Relevance scores may not align with actual artist preferences
  - *Mitigation*: A/B testing with real artists, machine learning improvement over time
- **Database Performance**: Complex scoring queries may impact database performance
  - *Mitigation*: Proper indexing, query optimization, result caching

### **Low Risk**
- **Template Maintenance**: Query templates may require frequent updates
  - *Mitigation*: Make templates configurable, provide easy updating mechanisms

## Success Metrics

### **Primary Success Criteria (MVP)**
1. **Query Generation Success Rate**: >70% of generated queries return at least 5 relevant results
2. **Relevance Improvement**: AI scoring shows >20% improvement over random ordering
3. **Integration Reliability**: <1% failure rate in module-to-module communication
4. **Performance Targets**: Query generation <5s, opportunity scoring <10s

### **Secondary Success Criteria**
1. **User Satisfaction**: Artists find recommended opportunities more relevant (when user feedback is implemented)
2. **Discovery Efficiency**: Reduced time from profile creation to relevant opportunity presentation
3. **Cost Efficiency**: AI operation costs remain under budget projections
4. **System Reliability**: >99% uptime for analysis services

## Sprint Dependencies

### **External Dependencies**
- OpenAI API access and rate limits
- Anthropic Claude API access
- Google/Gemini API credentials
- Database performance and indexing
- Existing Archivist module stability
- Existing Sentinel module integration points

### **Internal Dependencies**
- Artist profile system prompt design (may need refinement)
- Opportunity data structure completeness
- System architecture decisions for module communication
- Testing data and realistic artist profiles for development

## Technical Architecture Notes

### **Data Flow Architecture**
```
User Creates/Updates Artist Profile
         ↓
ProfileAnalyzer extracts searchable elements
         ↓
ContextBuilder creates AI prompt context
         ↓
QueryGeneratorService creates optimized queries
         ↓
SentinelConnector sends queries to Sentinel
         ↓ 
Sentinel discovers and returns opportunities
         ↓
RelevanceScoringEngine scores opportunities
         ↓
ArchivistConnector stores scored results
         ↓
Results available via API for frontend
```

### **AI Service Integration Pattern**
- **Primary**: OpenAI GPT-4 for query generation and semantic analysis
- **Fallback**: Anthropic Claude for query generation backup
- **Alternative**: Google Gemini for specialized content analysis
- **Caching**: Aggressive caching of AI results to minimize costs and latency

### **Database Schema Extensions**
The existing schema already includes fields for:
- `relevanceScore`, `semanticScore`, `keywordScore`, `categoryScore` in Opportunity model
- `aiServiceUsed`, `processingTimeMs` for tracking
- This sprint will populate and utilize these fields

---

**Created**: 2025-09-10  
**Last Updated**: 2025-09-10  
**Sprint Status**: 📋 PLANNED  
**Total Story Points**: ~238 hours estimated (MVP: ~106 hours)  
**Target Completion**: 2-3 weeks for MVP, 4-5 weeks for extended scope

## Notes

### **Critical Architecture Resolution**
This sprint directly addresses the user's identified gap: **"which service is going to take system prompt, and turn into search queries?"**

**Answer**: The `QueryGeneratorService` within the Analyst module will:
1. Take artist profiles (including any system prompts) from the database
2. Use AI services (OpenAI/Claude) to convert profiles into targeted search queries  
3. Optimize queries for different discovery sources (Google, Perplexity, art portals, social media)
4. Feed these queries to the Sentinel module for execution
5. Score the discovered results for relevance to the specific artist

This creates the missing bridge between artist profiles and the discovery engine, completing the core OPPO architecture.

### **Sprint Planning Notes**
- **Phase 1 (MVP)** focuses exclusively on query generation and basic scoring to solve the immediate architectural gap
- **Phase 2** adds content analysis for deeper insights
- **Phase 3** adds personalization and trend detection for advanced features
- Each phase delivers working, valuable functionality that can be deployed independently