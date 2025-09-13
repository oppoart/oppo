// Main exports for the Liaison module
export { LiaisonService } from './core/LiaisonService';
export { ExportService } from './export/ExportService';
export { WebSocketService, ClientWebSocketService } from './websocket/WebSocketService';

// Configuration exports
export { 
  defaultLiaisonConfig,
  productionLiaisonConfig,
  developmentLiaisonConfig,
  getLiaisonConfig,
  validateLiaisonConfig,
  ConfigHelpers
} from './config';

// Type exports
export type {
  LiaisonConfig,
  ExportFormat,
  FeedbackAction,
  UserFeedback,
  ExportData,
  WSMessage,
  LiaisonEvents,
  LiaisonStats
} from './types';

// Re-export FeedbackCapture interface from core service
export type { FeedbackCapture } from './core/LiaisonService';