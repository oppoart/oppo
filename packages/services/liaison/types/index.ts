export interface LiaisonConfig {
  ui: {
    theme: 'light' | 'dark';
    kanbanColumns: string[];
    defaultView: 'kanban' | 'list' | 'calendar';
    itemsPerPage: number;
  };
  export: {
    formats: ExportFormat[];
    maxItems: number;
  };
  realtime: {
    enabled: boolean;
    reconnectDelay: number;
    maxReconnectAttempts: number;
  };
}

export type ExportFormat = 'csv' | 'json';

export type FeedbackAction = 'accepted' | 'rejected' | 'saved' | 'applied';

export interface UserFeedback {
  opportunityId: string;
  action: FeedbackAction;
  reason?: string;
  timestamp: Date;
  context: {
    previousStatus: string;
    timeToDecision: number;
  };
}


export interface ExportData {
  exportDate: string;
  version: string;
  count: number;
  opportunities: any[];
}

export interface WSMessage {
  type: 'OPPORTUNITY_ADDED' | 'OPPORTUNITY_UPDATED' | 'SYNC_COMPLETED' | 'ERROR';
  data: any;
  timestamp: string;
}

export interface LiaisonEvents {
  'export.completed': (format: ExportFormat, count: number) => void;
  'feedback.received': (feedback: UserFeedback) => void;
  'websocket.connected': () => void;
  'websocket.disconnected': () => void;
  'error': (error: Error) => void;
}

export interface LiaisonStats {
  totalExports: number;
  feedbackCount: number;
  lastExport?: Date;
}