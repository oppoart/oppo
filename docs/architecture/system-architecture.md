# High-Level System Architecture: A Modular Blueprint

## Overview

This document presents the application's macro-level design as a **Modular Monolith** - a single deployable application composed of specialized modules with clear boundaries. The architecture emphasizes modularity, maintainability, and simplicity while providing a clear path to microservices if needed.

## System Diagram

```
                    ┌─────────────────────┐
                    │   Authentication    │
                    │   (Better Auth)     │
                    │    Email Only       │
                    └─────────┬───────────┘
                              │ Auth Tokens
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                            │
│              (Next.js - Deployed on Vercel)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS API Calls + JWT Token
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Cloud Backend                               │
│              (NestJS - Deployed on Railway)                │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────┐   │
│  │   Liaison       │    │     Orchestrator            │   │
│  │   Module        │    │     (LlamaIndex Agents)     │   │
│  └─────────────────┘    └─────────────────────────────┘   │
│           │                           │                    │
│           └───────────┬───────────────┘                    │
│                       │                                    │
│     ┌─────────────────┼─────────────────────┐             │
│     │                 │                     │             │
│     ▼                 ▼                     ▼             │
│ ┌─────────┐    ┌─────────────┐    ┌─────────────┐        │
│ │Sentinel │    │  Analyst    │    │ Archivist   │        │
│ │ Module  │    │  Module     │    │ Module      │        │
│ │(Scraper)│    │(AI Matching)│    │(PostgreSQL)│        │
│ └─────────┘    └─────────────┘    └─────────────┘        │
│                       │                     │             │
│                       ▼                     │             │
│              ┌─────────────────┐            │             │
│              │ Pluggable AI    │            │             │
│              │ Service Layer   │            │             │
│              │ ┌─────────────┐ │            │             │
│              │ │   OpenAI    │ │            │             │
│              │ │HuggingFace  │ │            │             │
│              │ │Transformers │ │            │             │
│              │ └─────────────┘ │            │             │
│              └─────────────────┘            │             │
└──────────────────────────────────────────────────────────┘
                                               │
                                               ▼
                                    ┌─────────────────┐
                                    │   PostgreSQL    │
                                    │    Database     │
                                    │  (Railway)      │
                                    └─────────────────┘
```

## Architecture Pattern: Modular Monolith

### **Why Modular Monolith for OPPO?**

**Perfect for Personal Apps** because:
- ✅ **Simple Deployment**: Single Docker container to Railway
- ✅ **Cost Effective**: One server, one database connection pool
- ✅ **Type Safety**: Shared TypeScript types across modules
- ✅ **ACID Transactions**: Cross-module database operations
- ✅ **Easy Development**: Single codebase, unified debugging
- ✅ **Fast Communication**: In-process module communication

### **Module Boundaries**

```typescript
// Clear module interfaces with dependency injection
@Module({
  imports: [ArchivistModule, AnalystModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService]
})
export class OrchestratorModule {}

@Module({
  providers: [SentinelService, FirecrawlService],
  exports: [SentinelService]
})
export class SentinelModule {}

// Modules communicate through well-defined interfaces
interface AnalystServicePort {
  analyzeOpportunity(opportunity: OpportunityDto): Promise<ScoredOpportunity>;
}
```

### **Deployment Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Deployment                        │
│                                                             │
│  Frontend (Vercel)     Backend (Railway)     Database      │
│  ┌───────────────┐    ┌─────────────────┐   ┌───────────┐  │
│  │               │    │                 │   │           │  │
│  │   Next.js     │◄──►│  NestJS App     │◄─►│PostgreSQL │  │
│  │               │    │                 │   │           │  │
│  │ - UI Components│    │ ┌─────────────┐ │   │ - Users   │  │
│  │ - Auth State   │    │ │Orchestrator │ │   │ - Opps    │  │
│  │ - API Calls   │    │ │Sentinel     │ │   │ - Profiles│  │
│  │               │    │ │Analyst      │ │   │           │  │
│  │               │    │ │Archivist    │ │   │           │  │
│  │               │    │ │Liaison      │ │   │           │  │
│  │               │    │ └─────────────┘ │   │           │  │
│  └───────────────┘    └─────────────────┘   └───────────┘  │
│                                                             │
│      CDN Edge            App Server         Managed DB     │
└─────────────────────────────────────────────────────────────┘
```

### **Evolution Path**

**Phase 1: Modular Monolith** (Current)
- Single NestJS application
- Modules as TypeScript modules
- Shared database

**Phase 2: Modular Services** (If needed)
```typescript
// Extract high-load modules to separate services
const services = {
  core: "NestJS app with Auth, Orchestrator, Archivist",
  scraping: "Separate service for Sentinel module", 
  analysis: "Separate service for Analyst module"
};
```

**Phase 3: Full Microservices** (If scaling beyond personal use)
- Each module becomes independent service
- Event-driven communication
- Distributed database per service

## Five Core Modules

The application consists of five main modules, each responsible for specific tasks:

### 1. Orchestrator (Agent Core)
**Role**: The system's central nervous system

**Responsibilities**:
- Scheduling tasks and managing execution timelines
- Managing workflows and process orchestration
- Coordinating communication between modules
- Implementing agent-based reasoning with LlamaIndex.ts
- Handling event-driven automation logic

**Key Technologies**:
- LlamaIndex.ts for RAG and multi-agent orchestration
- BullMQ for job queue management (Redis-based)
- Cloud cron scheduling for automated workflows
- Pluggable AI service adapters

### 2. Sentinel (Scanning and Data Collection Module)
**Role**: The agent's sensory input system

**Responsibilities**:
- Discovering new opportunities from web sources
- Extracting raw data from various platforms
- Managing scraping strategies per source type
- Handling authentication for protected sources
- Implementing rate limiting and retry logic

**Key Technologies**:
- Firecrawl for structured site scraping
- Playwright for dynamic content and browser automation
- Custom playbooks for source-specific strategies

### 3. Analyst (Semantic Matching and Filtering Engine)
**Role**: The agent's cognitive core

**Responsibilities**:
- Evaluating opportunity relevance against artist profile
- Performing semantic similarity analysis
- Calculating hybrid relevance scores
- Processing natural language descriptions
- Maintaining and updating scoring algorithms

**Key Technologies**:
- transformers.js for on-device AI processing
- Sentence transformers for semantic embeddings
- Custom scoring algorithms for hybrid matching

### 4. Archivist (Data Storage and Management Layer)
**Role**: The agent's long-term memory

**Responsibilities**:
- Managing data persistence in PostgreSQL
- Implementing deduplication strategies
- Ensuring data integrity and consistency
- Handling database migrations and updates
- Providing efficient query interfaces

**Key Technologies**:
- PostgreSQL for cloud database
- Prisma for type-safe ORM functionality
- SHA-256 hashing for deduplication

### 5. Liaison (User Interface and External Integrations)
**Role**: The communication interface

**Responsibilities**:
- Providing user interface components
- Managing Notion synchronization
- Handling API integrations
- Processing user feedback and preferences
- Coordinating external service connections

**Key Technologies**:
- React/Next.js for frontend
- @notionhq/client for Notion integration
- RESTful APIs for external services

## Core Framework Selection: NestJS

### Why NestJS over Express.js

**NestJS** framework is strongly recommended for this project's backend infrastructure for several key reasons:

#### Express.js Limitations
- **Unopinionated structure**: Leaves all architectural decisions to developers
- **Risk of inconsistency**: Can lead to maintenance difficulties in complex systems
- **Manual setup required**: Dependency injection, modularity need custom implementation

#### NestJS Advantages
- **Opinionated architecture**: Provides structure out of the box
- **Built-in modularity**: Natural fit for our five-module design
- **Dependency Injection**: First-class DI support for better testability
- **TypeScript integration**: Strong typing throughout the application
- **Decorator-based**: Clean, declarative code structure
- **Angular-inspired**: Proven patterns from enterprise applications

### Architectural Benefits

NestJS directly supports our modular design through:
- **Module system**: Each of our five modules maps to a NestJS module
- **Service layer**: Clean separation of business logic
- **Controller layer**: Well-defined API endpoints
- **Middleware support**: Cross-cutting concerns like logging, auth
- **Built-in testing**: Unit and integration testing support

## Data Flow Architecture

### Standard Opportunity Processing Flow

1. **Discovery Phase**
   - Orchestrator triggers scheduled scan
   - Sentinel modules activate for each source
   - Raw data extracted from websites

2. **Analysis Phase**
   - Raw opportunities sent to Analyst
   - Semantic matching performed
   - Relevance scores calculated

3. **Storage Phase**
   - Scored opportunities sent to Archivist
   - Deduplication checks performed
   - Data persisted to PostgreSQL cloud database

4. **Presentation Phase**
   - Liaison queries Archivist for updates
   - UI refreshed with new opportunities
   - Notion synchronization triggered

### Event-Driven Communication

The system uses an event-driven architecture for loose coupling:

```javascript
// Example event flow
EventEmitter.emit('SCAN_SOURCES')
  → Sentinel.on('SCAN_SOURCES') → scrape()
  → EventEmitter.emit('OPPORTUNITY_FOUND', data)
  → Analyst.on('OPPORTUNITY_FOUND') → analyze()
  → EventEmitter.emit('OPPORTUNITY_ANALYZED', scoredData)
  → Archivist.on('OPPORTUNITY_ANALYZED') → save()
```

## Pluggable AI Service Architecture

### Design Philosophy

The OPPO system implements a **port-adapter pattern** for AI services, allowing seamless switching between different AI providers based on performance, cost, and privacy requirements.

### Architecture Components

```typescript
// Core AI Service Interface (Port)
interface AIServicePort {
  generateEmbedding(text: string): Promise<number[]>;
  analyzeRelevance(profile: string, opportunity: string): Promise<AnalysisResult>;
  answerQuery(query: string, context: string[]): Promise<string>;
  getMetrics(): ServiceMetrics;
}

// Service Registry for Performance Management
class AIServiceOrchestrator {
  private services = new Map<string, AIServicePort>();
  private metrics = new Map<string, ServiceMetrics>();
  
  async selectOptimalService(operation: string): Promise<AIServicePort> {
    // Automatically select best service based on:
    // - Current performance metrics
    // - Cost constraints
    // - Privacy requirements
    // - Service availability
  }
}
```

### Available Service Adapters

1. **OpenAI Adapter**: Best quality, moderate cost
2. **Hugging Face Adapter**: Budget-friendly, good quality
3. **Transformers.js Adapter**: Privacy-focused, local processing
4. **Custom Adapter Interface**: For future AI services

### Performance Monitoring Dashboard

Each AI service is continuously monitored for:
- **Response Time**: Average latency per request
- **Accuracy Score**: Semantic matching quality
- **Cost Per Request**: Financial efficiency
- **Uptime**: Service availability
- **Rate Limits**: Usage constraints

### Automatic Failover

```typescript
class ResilientAIService {
  async processWithFallback(request: AIRequest): Promise<AIResponse> {
    const primaryService = await this.selectPrimary();
    
    try {
      return await primaryService.process(request);
    } catch (error) {
      console.warn(`Primary service failed: ${error.message}`);
      const fallbackService = await this.selectFallback();
      return await fallbackService.process(request);
    }
  }
}
```

## Scalability Considerations

### Horizontal Scalability
- Modules can be deployed independently
- Multiple Sentinel instances for parallel scraping
- Queue-based processing for load distribution

### Vertical Scalability
- Efficient algorithms for large datasets
- Indexed database queries
- Caching strategies for frequent operations

## Security Architecture

### Data Privacy
- Personal cloud deployment for data control
- Pluggable AI services with configurable privacy levels
- Encrypted credential storage and secure environment variables
- Option to use local AI models for maximum privacy

### Access Control & Authentication

**Better Auth Integration**:
```typescript
// Authentication middleware for NestJS
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }
    
    request.user = session.user;
    return true;
  }
}

// Protected API routes
@Controller('api/opportunities')
@UseGuards(AuthGuard)
export class OpportunitiesController {
  @Get()
  async getOpportunities(@Request() req) {
    // Only authenticated users can access opportunities
    return this.opportunitiesService.findByUserId(req.user.id);
  }
}
```

**Security Features**:
- **Session Management**: Secure JWT tokens with rotation
- **Email-Only Auth**: Simple email/password authentication
- **API Protection**: All endpoints require authentication
- **Rate Limiting**: Per-user rate limiting for API calls
- **Email Verification**: Required for account activation
- **Audit Logging**: Track user actions and API usage

## Error Handling Strategy

### Resilience Patterns
- Circuit breakers for external services
- Retry logic with exponential backoff
- Graceful degradation for non-critical failures

### Monitoring and Logging
- Structured logging for all modules
- Error tracking and alerting
- Performance metrics collection

## Next Steps

- Review [Technology Stack](./technology-stack.md) for detailed technology choices
- Explore individual [Module Documentation](../modules/) for implementation details
- See [Development Roadmap](../implementation/roadmap.md) for implementation phases