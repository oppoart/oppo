# Liaison Module: User Interface and External Integrations

## Overview

The Liaison module serves as the communication interface between the agent and the outside world. It provides intuitive user interface components for the artist and manages seamless integration with external services, particularly Notion for workflow continuity.

## Architecture

### Component Architecture

```
┌─────────────────────────────────────────────┐
│            React/Next.js Frontend            │
├─────────────────────────────────────────────┤
│                Components                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Kanban  │  │ Calendar │  │Dashboard │  │
│  │  Board   │  │   View   │  │  Stats   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
├─────────────────────────────────────────────┤
│             State Management                 │
│         (Redux/Zustand/Context)              │
├─────────────────────────────────────────────┤
│              API Layer                       │
│    ┌─────────────┐  ┌─────────────┐        │
│    │  REST API   │  │  WebSocket  │        │
│    │   Client    │  │   Client    │        │
│    └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│          External Integrations               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Notion  │  │  Google  │  │  Export  │  │
│  │   Sync   │  │ Calendar │  │  Formats │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

## Frontend Components

### 1. Dashboard Overview

The main dashboard providing at-a-glance insights.

```typescript
// components/Dashboard.tsx
import { useOpportunities } from '@/hooks/useOpportunities';

export const Dashboard: React.FC = () => {
  const { stats, recentOpportunities, upcomingDeadlines } = useOpportunities();
  
  return (
    <div className="dashboard-grid">
      <StatsCards stats={stats} />
      <DeadlineAlert deadlines={upcomingDeadlines} />
      <RecentOpportunities opportunities={recentOpportunities} />
      <RelevanceChart data={stats.relevanceDistribution} />
    </div>
  );
};

// Key metrics displayed
interface DashboardStats {
  totalOpportunities: number;
  newThisWeek: number;
  upcomingDeadlines: number;
  highRelevance: number;
  inProgress: number;
  submitted: number;
}
```

### 2. Kanban Board with dnd-kit

Interactive drag-and-drop board for opportunity management.

```typescript
// components/KanbanBoard.tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export const KanbanBoard: React.FC = () => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  
  const columns = [
    { id: 'new', title: 'New Opportunities' },
    { id: 'reviewing', title: 'Reviewing' },
    { id: 'applying', title: 'Applying' },
    { id: 'submitted', title: 'Submitted' },
    { id: 'rejected', title: 'Not Interested' }
  ];
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Update opportunity status
      updateOpportunityStatus(active.id, over.id);
      
      // Track user feedback
      if (over.id === 'rejected') {
        trackNegativeFeedback(active.id);
      }
    }
  };
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-container">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            opportunities={getOpportunitiesByStatus(column.id)}
          />
        ))}
      </div>
    </DndContext>
  );
};
```

#### Kanban Card Component

```typescript
// components/KanbanCard.tsx
export const KanbanCard: React.FC<{ opportunity: Opportunity }> = ({ opportunity }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: opportunity.id });
  
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="kanban-card"
      {...attributes}
      {...listeners}
    >
      <div className="card-header">
        <h3>{opportunity.title}</h3>
        <RelevanceScore score={opportunity.relevanceScore} />
      </div>
      
      <div className="card-body">
        <p className="organization">{opportunity.organization}</p>
        <DeadlineIndicator deadline={opportunity.deadline} />
        
        <div className="card-tags">
          {opportunity.tags.map(tag => (
            <Tag key={tag} label={tag} />
          ))}
        </div>
      </div>
      
      <div className="card-actions">
        <Button onClick={() => viewDetails(opportunity.id)}>View</Button>
        <Button onClick={() => openInNotion(opportunity.id)}>Notion</Button>
      </div>
    </div>
  );
};
```

### 3. Calendar View with react-big-calendar

Visual deadline management and scheduling.

```typescript
// components/CalendarView.tsx
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';

const localizer = momentLocalizer(moment);

export const CalendarView: React.FC = () => {
  const [view, setView] = useState<View>('month');
  const { opportunities } = useOpportunities();
  
  // Convert opportunities to calendar events
  const events = opportunities.map(opp => ({
    id: opp.id,
    title: opp.title,
    start: new Date(opp.deadline),
    end: new Date(opp.deadline),
    resource: {
      type: opp.type,
      relevance: opp.relevanceScore,
      status: opp.status
    }
  }));
  
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    
    if (event.resource.relevance > 80) {
      backgroundColor = '#4caf50'; // High relevance - green
    } else if (event.resource.relevance > 60) {
      backgroundColor = '#ff9800'; // Medium relevance - orange
    }
    
    return {
      style: { backgroundColor }
    };
  };
  
  return (
    <Calendar
      localizer={localizer}
      events={events}
      view={view}
      onView={setView}
      eventPropGetter={eventStyleGetter}
      components={{
        event: CustomEventComponent,
        toolbar: CustomToolbar
      }}
      onSelectEvent={handleEventSelect}
    />
  );
};
```

### 4. Human-in-the-Loop Feedback System

Captures user preferences to improve recommendations.

```typescript
// components/FeedbackCapture.tsx
export const FeedbackCapture: React.FC = () => {
  const captureFeedback = async (
    opportunityId: string,
    action: FeedbackAction,
    reason?: string
  ) => {
    const feedback: UserFeedback = {
      opportunityId,
      action,
      reason,
      timestamp: new Date(),
      context: {
        previousStatus: getCurrentStatus(opportunityId),
        timeToDecision: getTimeToDecision(opportunityId)
      }
    };
    
    // Send to backend for learning
    await api.submitFeedback(feedback);
    
    // Update local state
    updateOpportunityFeedback(opportunityId, feedback);
  };
  
  return (
    <FeedbackModal
      onAccept={(id) => captureFeedback(id, 'accepted')}
      onReject={(id, reason) => captureFeedback(id, 'rejected', reason)}
      onSave={(id) => captureFeedback(id, 'saved')}
    />
  );
};
```

## External Integrations

### 1. Notion Synchronization

Seamless two-way sync with Notion databases.

```typescript
// services/NotionSync.ts
import { Client } from '@notionhq/client';

class NotionSyncService {
  private notion: Client;
  private databaseId: string;
  
  constructor(apiKey: string, databaseId: string) {
    this.notion = new Client({ auth: apiKey });
    this.databaseId = databaseId;
  }
  
  async syncOpportunityToNotion(opportunity: Opportunity): Promise<void> {
    try {
      // Check if page exists
      const existingPage = await this.findExistingPage(opportunity.id);
      
      if (existingPage) {
        // Update existing page
        await this.updateNotionPage(existingPage.id, opportunity);
      } else {
        // Create new page
        await this.createNotionPage(opportunity);
      }
    } catch (error) {
      console.error('Notion sync failed:', error);
      // Queue for retry
      await this.queueForRetry(opportunity);
    }
  }
  
  private async createNotionPage(opportunity: Opportunity) {
    const response = await this.notion.pages.create({
      parent: { database_id: this.databaseId },
      properties: {
        'Title': {
          title: [{ text: { content: opportunity.title } }]
        },
        'Organization': {
          rich_text: [{ text: { content: opportunity.organization } }]
        },
        'Deadline': {
          date: { start: opportunity.deadline }
        },
        'Status': {
          select: { name: opportunity.status }
        },
        'Relevance Score': {
          number: opportunity.relevanceScore
        },
        'URL': {
          url: opportunity.url
        },
        'Application Fee': {
          number: opportunity.applicationFee
        },
        'Type': {
          select: { name: opportunity.type }
        }
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: opportunity.description } }]
          }
        }
      ]
    });
    
    // Store Notion page ID for future updates
    await this.storeNotionMapping(opportunity.id, response.id);
  }
  
  async syncFromNotion(): Promise<void> {
    const response = await this.notion.databases.query({
      database_id: this.databaseId,
      filter: {
        timestamp: 'last_edited_time',
        last_edited_time: {
          after: this.getLastSyncTime()
        }
      }
    });
    
    for (const page of response.results) {
      await this.processNotionUpdate(page);
    }
  }
}
```

### 2. Export Functionality

Multiple export formats for external use.

```typescript
// services/ExportService.ts
class ExportService {
  async exportToCSV(opportunities: Opportunity[]): Promise<Blob> {
    const csv = [
      // Headers
      ['Title', 'Organization', 'Deadline', 'Status', 'Relevance', 'URL'].join(','),
      // Data rows
      ...opportunities.map(opp => [
        this.escapeCSV(opp.title),
        this.escapeCSV(opp.organization),
        opp.deadline,
        opp.status,
        opp.relevanceScore,
        opp.url
      ].join(','))
    ].join('\n');
    
    return new Blob([csv], { type: 'text/csv' });
  }
  
  async exportToJSON(opportunities: Opportunity[]): Promise<Blob> {
    const data = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      count: opportunities.length,
      opportunities: opportunities
    };
    
    return new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    );
  }
  
  async exportToNotion(opportunities: Opportunity[]): Promise<void> {
    // Batch create in Notion
    for (const batch of this.chunk(opportunities, 10)) {
      await Promise.all(
        batch.map(opp => this.notionSync.createPage(opp))
      );
    }
  }
}
```

## State Management

### Global State with Zustand

```typescript
// stores/opportunityStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface OpportunityStore {
  opportunities: Opportunity[];
  filters: FilterState;
  sortBy: SortOption;
  
  // Actions
  setOpportunities: (opportunities: Opportunity[]) => void;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  setFilters: (filters: FilterState) => void;
  setSortBy: (sortBy: SortOption) => void;
}

export const useOpportunityStore = create<OpportunityStore>()(
  devtools(
    persist(
      (set) => ({
        opportunities: [],
        filters: defaultFilters,
        sortBy: 'relevance',
        
        setOpportunities: (opportunities) =>
          set({ opportunities }),
          
        updateOpportunity: (id, updates) =>
          set((state) => ({
            opportunities: state.opportunities.map(opp =>
              opp.id === id ? { ...opp, ...updates } : opp
            )
          })),
          
        setFilters: (filters) =>
          set({ filters }),
          
        setSortBy: (sortBy) =>
          set({ sortBy })
      }),
      {
        name: 'opportunity-storage'
      }
    )
  )
);
```

## Real-time Updates

### WebSocket Integration

```typescript
// services/WebSocketService.ts
class WebSocketService {
  private ws: WebSocket;
  private reconnectAttempts = 0;
  
  connect() {
    this.ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onclose = () => {
      this.handleReconnect();
    };
  }
  
  private handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'OPPORTUNITY_ADDED':
        store.addOpportunity(message.data);
        toast.success('New opportunity found!');
        break;
        
      case 'OPPORTUNITY_UPDATED':
        store.updateOpportunity(message.data.id, message.data);
        break;
        
      case 'SYNC_COMPLETED':
        store.refreshOpportunities();
        break;
    }
  }
}
```

## Performance Optimization

### 1. Virtual Scrolling for Large Lists

```typescript
// components/VirtualizedList.tsx
import { FixedSizeList } from 'react-window';

export const VirtualizedOpportunityList: React.FC = () => {
  const opportunities = useOpportunities();
  
  const Row = ({ index, style }) => (
    <div style={style}>
      <OpportunityCard opportunity={opportunities[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={opportunities.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### 2. Optimistic Updates

```typescript
// hooks/useOptimisticUpdate.ts
export const useOptimisticUpdate = () => {
  const updateOpportunity = async (id: string, updates: Partial<Opportunity>) => {
    // Optimistically update UI
    store.updateOpportunity(id, updates);
    
    try {
      // Send to server
      await api.updateOpportunity(id, updates);
    } catch (error) {
      // Revert on failure
      store.revertOpportunity(id);
      toast.error('Update failed');
    }
  };
  
  return { updateOpportunity };
};
```

## Configuration

```typescript
export const liaisonConfig = {
  ui: {
    theme: 'light',
    kanbanColumns: ['new', 'reviewing', 'applying', 'submitted', 'rejected'],
    defaultView: 'kanban',
    itemsPerPage: 20
  },
  notion: {
    syncInterval: 300000, // 5 minutes
    retryAttempts: 3,
    batchSize: 10
  },
  export: {
    formats: ['csv', 'json', 'notion'],
    maxItems: 1000
  },
  realtime: {
    enabled: true,
    reconnectDelay: 5000,
    maxReconnectAttempts: 10
  }
};
```

## Testing

### Component Testing

```typescript
// __tests__/KanbanBoard.test.tsx
describe('KanbanBoard', () => {
  test('moves opportunity between columns', async () => {
    const { getByText } = render(<KanbanBoard />);
    
    const card = getByText('Test Opportunity');
    const targetColumn = getByText('Reviewing');
    
    // Simulate drag and drop
    fireEvent.dragStart(card);
    fireEvent.drop(targetColumn);
    
    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith('opp-1', 'reviewing');
    });
  });
});
```

## Dependencies

- **React/Next.js**: Frontend framework
- **@dnd-kit/core**: Drag and drop
- **react-big-calendar**: Calendar component
- **@notionhq/client**: Notion API
- **zustand**: State management
- **react-window**: Virtual scrolling
- **recharts**: Data visualization

## Related Documentation

- [System Architecture](../architecture/system-architecture.md)
- [Integration Guide](../implementation/integrations.md)
- [UI/UX Guidelines](../design/ui-guidelines.md)