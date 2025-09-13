# Liaison Service

The Liaison module serves as the communication interface between the OPPO agent and the outside world. It provides intuitive user interface support and manages seamless integration with external services, particularly Notion for workflow continuity.

## Features

### 🎛️ User Interface Support
- Dashboard data and statistics
- Opportunity management with status updates
- Human-in-the-loop feedback system
- Real-time updates via WebSocket

### 📊 Export Functionality
- Multiple export formats (CSV, JSON, Notion)
- Filtered exports with advanced criteria
- Template generation for sample data
- Batch processing with configurable limits

### 🔄 Notion Integration
- Two-way synchronization with Notion databases
- Automatic retry logic for failed syncs
- Batch processing for performance
- Real-time status updates

### 🔗 Real-time Communication
- WebSocket service for live updates
- Automatic reconnection handling
- Message queuing for offline scenarios
- Heartbeat monitoring

## Installation

```bash
npm install @oppo/liaison
```

## Quick Start

```typescript
import { LiaisonService, getLiaisonConfig } from '@oppo/liaison';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const config = getLiaisonConfig('production');

// Initialize with Notion and WebSocket support
const liaison = new LiaisonService(
  prisma, 
  {
    ...config,
    notion: {
      ...config.notion,
      apiKey: process.env.NOTION_API_KEY,
      databaseId: process.env.NOTION_DATABASE_ID
    }
  },
  'ws://localhost:8080'
);

await liaison.initialize();

// Get dashboard data
const dashboardData = await liaison.getDashboardData();
console.log('Total opportunities:', dashboardData.stats.totalOpportunities);

// Export opportunities to CSV
const csvBlob = await liaison.exportOpportunities('csv', {
  status: ['new', 'reviewing']
});

// Capture user feedback
await liaison.captureFeedback({
  opportunityId: 'opp-123',
  action: 'accepted',
  reason: 'Perfect fit for my artistic practice'
});
```

## Configuration

### Environment Variables

```bash
# Notion Integration
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_database_id
NOTION_SYNC_INTERVAL=300000  # 5 minutes

# WebSocket
WEBSOCKET_URL=ws://localhost:8080
WEBSOCKET_ENABLED=true

# Export Settings
EXPORT_MAX_ITEMS=1000
```

### Configuration Object

```typescript
import { getLiaisonConfig } from '@oppo/liaison';

const config = getLiaisonConfig('production');
// or customize:
const customConfig = {
  ui: {
    theme: 'dark',
    kanbanColumns: ['new', 'review', 'apply', 'done'],
    defaultView: 'calendar',
    itemsPerPage: 25
  },
  notion: {
    syncInterval: 600000, // 10 minutes
    retryAttempts: 5,
    batchSize: 20
  },
  export: {
    formats: ['csv', 'json'],
    maxItems: 5000
  },
  realtime: {
    enabled: true,
    reconnectDelay: 10000,
    maxReconnectAttempts: 15
  }
};
```

## API Reference

### LiaisonService

#### Core Methods

```typescript
// Initialize the service
await liaison.initialize();

// Get opportunities with filtering and pagination
const opportunities = await liaison.getOpportunities({
  status: ['new', 'reviewing'],
  type: ['grant', 'residency'],
  page: 1,
  limit: 20
});

// Update opportunity status
await liaison.updateOpportunityStatus('opp-123', 'applying');

// Get dashboard statistics
const dashboard = await liaison.getDashboardData();
```

#### Feedback System

```typescript
// Capture user feedback
await liaison.captureFeedback({
  opportunityId: 'opp-123',
  action: 'accepted', // 'accepted' | 'rejected' | 'saved' | 'applied'
  reason: 'Interesting opportunity',
  userId: 'user-456'
});
```

#### Export Operations

```typescript
// Export with filters
const csvBlob = await liaison.exportOpportunities('csv', {
  status: ['new'],
  relevanceMinScore: 80,
  deadlineAfter: new Date('2024-01-01')
});

// Generate template
const template = await liaison.generateExportTemplate('json');
```

#### Notion Sync

```typescript
// Sync specific opportunities
await liaison.syncToNotion(['opp-1', 'opp-2']);

// Sync all opportunities
await liaison.syncToNotion();

// Sync from Notion (updates from Notion to local DB)
await liaison.syncFromNotion();
```

### Individual Services

#### NotionSyncService

```typescript
import { NotionSyncService } from '@oppo/liaison';

const notionSync = new NotionSyncService(prisma, {
  apiKey: 'your-api-key',
  databaseId: 'your-db-id',
  syncInterval: 300000,
  retryAttempts: 3,
  batchSize: 10
});

await notionSync.syncOpportunityToNotion(opportunity);
const result = await notionSync.syncMultipleOpportunities(opportunities);
```

#### ExportService

```typescript
import { ExportService } from '@oppo/liaison';

const exportService = new ExportService(prisma, {
  formats: ['csv', 'json'],
  maxItems: 1000
});

const csvBlob = await exportService.exportToCSV(opportunities);
const jsonBlob = await exportService.exportToJSON(opportunities);
```

#### WebSocketService

```typescript
import { WebSocketService } from '@oppo/liaison';

const wsService = new WebSocketService('ws://localhost:8080', {
  enabled: true,
  reconnectDelay: 5000,
  maxReconnectAttempts: 10
});

wsService.on('websocket.connected', () => {
  console.log('Connected to WebSocket');
});

wsService.broadcastOpportunityAdded(opportunity);
```

## Events

The LiaisonService emits various events for real-time updates:

```typescript
liaison.on('opportunity.updated', (opportunity) => {
  console.log('Opportunity updated:', opportunity.id);
});

liaison.on('sync.completed', (count) => {
  console.log(`Synced ${count} opportunities to Notion`);
});

liaison.on('export.completed', (format, count) => {
  console.log(`Exported ${count} opportunities as ${format}`);
});

liaison.on('feedback.received', (feedback) => {
  console.log('User feedback:', feedback);
});
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- LiaisonService.test.ts
npm test -- ExportService.test.ts
npm test -- config.test.ts

# Run with coverage
npm test -- --coverage
```

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  await liaison.syncToNotion();
} catch (error) {
  if (error.message.includes('Notion is not configured')) {
    console.log('Notion integration not set up');
  } else {
    console.error('Sync failed:', error);
  }
}
```

## Health Monitoring

```typescript
const health = await liaison.healthCheck();
console.log('Service status:', health.status);
console.log('Database OK:', health.details.database);
console.log('Notion OK:', health.details.notion);
console.log('WebSocket OK:', health.details.websocket);
```

## Graceful Shutdown

```typescript
// Cleanup when shutting down
process.on('SIGTERM', async () => {
  await liaison.shutdown();
  process.exit(0);
});
```

## Development

### Directory Structure

```
liaison/
├── core/
│   └── LiaisonService.ts      # Main service
├── integration/
│   └── NotionSyncService.ts   # Notion integration
├── export/
│   └── ExportService.ts       # Export functionality
├── websocket/
│   └── WebSocketService.ts    # Real-time updates
├── types/
│   └── index.ts               # Type definitions
├── config/
│   └── index.ts               # Configuration
├── __tests__/                 # Test files
└── index.ts                   # Main exports
```

### Contributing

1. Follow existing code patterns and TypeScript conventions
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure all health checks pass

## License

Part of the OPPO project - see main project license.