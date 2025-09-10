# Orchestrator Module: Automating Workflow

## Overview

The Orchestrator module serves as the "brain" that connects all modules, transforming a series of tools into an autonomous and reasoning agent. It implements a two-tier structure to not only execute fixed pipelines but also proactively update its knowledge base and dynamically reason over this knowledge.

## Architecture

### Two-Tier System Design

```
┌─────────────────────────────────────────────┐
│          High-Level Agent Layer              │
│         (LlamaIndex.ts RAG Agent)            │
│   • Natural language understanding           │
│   • Tool selection and execution             │
│   • Result synthesis                         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Low-Level Automation Layer           │
│        (Event-Driven Orchestration)          │
│   • Task scheduling                          │
│   • Event routing                            │
│   • Pipeline execution                       │
└──────────────────────────────────────────────┘
```

## Core Components

### 1. Event-Driven Automation (Huginn-Inspired)

The **huginn/huginn** project inspiration provides an event-driven system where "agents" produce and consume events in a directed graph.

#### Implementation Strategy

```typescript
// Example event-driven implementation
class OrchestrationEngine {
  private eventEmitter: EventEmitter;
  private scheduler: BullQueue;
  
  async initializeWorkflow() {
    // Schedule recurring scans
    await this.scheduler.add('scan-sources', {}, {
      repeat: { cron: '0 0 * * *' } // Daily at midnight
    });
    
    // Register event handlers
    this.eventEmitter.on('SCAN_SOURCES', this.handleScanSources);
    this.eventEmitter.on('OPPORTUNITY_FOUND', this.handleOpportunityFound);
    this.eventEmitter.on('OPPORTUNITY_ANALYZED', this.handleOpportunityAnalyzed);
  }
}
```

#### Event Flow Architecture

1. **SchedulerAgent**: Emits `SCAN_SOURCES` event every 24 hours
2. **SentinelModule**: Listens and emits `OPPORTUNITY_FOUND` for each discovery
3. **AnalystEngine**: Processes and emits `OPPORTUNITY_ANALYZED` with scores
4. **ArchivistModule**: Persists final scored records to database

### 2. Agent-Based RAG System with LlamaIndex.ts

LlamaIndex.ts enables true "agent" behavior through Retrieval-Augmented Generation.

#### Core Concept Implementation

```typescript
// RAG Agent setup example
import { VectorStoreIndex, OpenAI, Document } from 'llamaindex';

class RAGAgent {
  private index: VectorStoreIndex;
  private tools: Map<string, Function>;
  
  async initialize() {
    // Load artist profile and opportunities into vector store
    const documents = await this.loadDocuments();
    this.index = await VectorStoreIndex.fromDocuments(documents);
    
    // Define available tools
    this.tools = new Map([
      ['get_upcoming_deadlines', this.getUpcomingDeadlines],
      ['search_web', this.searchWeb],
      ['summarize_opportunity', this.summarizeOpportunity]
    ]);
  }
  
  async query(question: string) {
    // Agent autonomously processes queries
    const queryEngine = this.index.asQueryEngine();
    const response = await queryEngine.query(question);
    return response;
  }
}
```

## Available Tools

The agent has access to various tools for autonomous operation:

### 1. Database Query Tools
- `get_upcoming_deadline_opportunities()`: Retrieves opportunities with deadlines within 7 days
- `get_high_relevance_opportunities()`: Fetches opportunities above threshold score
- `get_opportunities_by_status()`: Filters by application status

### 2. External Search Tools
- `search_web(query)`: Uses search APIs for new information discovery
- `fetch_source_updates()`: Checks configured sources for updates

### 3. Analysis Tools
- `summarize_opportunity(id)`: Creates concise opportunity summaries
- `compare_opportunities()`: Analyzes multiple opportunities for best fit
- `generate_application_tips()`: Provides application strategy suggestions

## Workflow Patterns

### Pattern 1: Scheduled Discovery
```
Cron Trigger → Scan Sources → Process Results → Store Data
```

### Pattern 2: On-Demand Analysis
```
User Query → RAG Agent → Tool Selection → Result Synthesis → Response
```

### Pattern 3: Proactive Alerts
```
Monitor Deadlines → Identify Urgent → Generate Alert → Notify User
```

## Configuration

### Environment Variables
```env
# Orchestrator Configuration
SCAN_SCHEDULE="0 0 * * *"  # Cron expression
MAX_CONCURRENT_SCANS=3
AGENT_MODEL="gpt-3.5-turbo"
VECTOR_STORE_PATH="./data/vectors"
```

### Module Configuration
```typescript
export const orchestratorConfig = {
  scheduling: {
    scanInterval: '24h',
    alertCheckInterval: '1h',
    cleanupInterval: '7d'
  },
  agent: {
    maxToolCalls: 5,
    timeout: 30000,
    temperature: 0.7
  },
  events: {
    maxRetries: 3,
    retryDelay: 5000
  }
};
```

## Integration Points

### Input Sources
- Scheduler triggers
- User queries via Liaison
- External API webhooks
- Manual triggers

### Output Destinations
- Other modules via events
- User interface updates
- Notification systems
- Log aggregation

## Advanced Features

### 1. Adaptive Scheduling
- Adjusts scan frequency based on opportunity posting patterns
- Prioritizes high-yield sources
- Reduces frequency for consistently empty sources

### 2. Learning from Feedback
- Tracks user interactions with recommendations
- Adjusts scoring weights based on acceptance/rejection
- Improves query understanding over time

### 3. Multi-Step Reasoning
- Breaks complex queries into sub-tasks
- Chains multiple tool calls for comprehensive answers
- Maintains context across conversation turns

## Performance Optimization

### Caching Strategy
- Cache frequent database queries
- Store processed embeddings
- Maintain source metadata

### Resource Management
- Limit concurrent operations
- Implement request pooling
- Use streaming for large responses

## Error Handling

### Failure Recovery
- Automatic retry with exponential backoff
- Dead letter queues for failed events
- Graceful degradation for non-critical paths

### Monitoring
- Event processing metrics
- Agent query performance
- Tool usage statistics

## Testing Strategy

### Unit Tests
- Event handler logic
- Tool function correctness
- Configuration validation

### Integration Tests
- End-to-end event flows
- RAG agent responses
- Module communication

## Future Enhancements

1. **Multi-Agent Collaboration**: Multiple specialized agents working together
2. **Predictive Analytics**: Anticipate opportunity posting patterns
3. **Custom Workflows**: User-defined automation rules
4. **Natural Language Commands**: Voice or text-based system control

## Dependencies

- **LlamaIndex.ts**: RAG framework
- **BullMQ**: Job queue management  
- **Node.js EventEmitter**: Event system
- **Cron**: Schedule parsing
- **Winston**: Logging

## Related Documentation

- [System Architecture](../architecture/system-architecture.md)
- [Sentinel Module](./sentinel.md)
- [Development Roadmap](../implementation/roadmap.md)