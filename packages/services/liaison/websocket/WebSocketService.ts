import { EventEmitter } from 'events';
import { LiaisonConfig, WSMessage, LiaisonEvents } from '../types';

export class WebSocketService extends EventEmitter {
  private ws?: WebSocket;
  private config: LiaisonConfig['realtime'];
  private reconnectAttempts: number = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private isConnected: boolean = false;
  private messageQueue: WSMessage[] = [];
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(
    private wsUrl: string,
    config: LiaisonConfig['realtime']
  ) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('WebSocket service is disabled');
      return;
    }

    this.connect();
  }

  connect(): void {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this.isConnected = false;
    this.emit('websocket.disconnected');
  }

  sendMessage(message: Omit<WSMessage, 'timestamp'>): void {
    const fullMessage: WSMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(fullMessage));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(fullMessage);
      }
    } else {
      this.queueMessage(fullMessage);
    }
  }

  broadcastOpportunityAdded(opportunity: any): void {
    this.sendMessage({
      type: 'OPPORTUNITY_ADDED',
      data: opportunity
    });
  }

  broadcastOpportunityUpdated(opportunity: any): void {
    this.sendMessage({
      type: 'OPPORTUNITY_UPDATED',
      data: opportunity
    });
  }

  broadcastSyncCompleted(count: number): void {
    this.sendMessage({
      type: 'SYNC_COMPLETED',
      data: { count }
    });
  }

  broadcastError(error: Error): void {
    this.sendMessage({
      type: 'ERROR',
      data: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
  }

  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
    lastHeartbeat?: string;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      lastHeartbeat: this.lastHeartbeat
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down WebSocket service...');
    this.disconnect();
    this.removeAllListeners();
  }

  // Private methods

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('websocket.connected');
      
      // Process queued messages
      this.processMessageQueue();
      
      // Start heartbeat
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      this.isConnected = false;
      this.stopHeartbeat();
      
      if (event.code !== 1000) { // Not a normal closure
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', new Error(`WebSocket error: ${error}`));
    };
  }

  private handleMessage(message: WSMessage): void {
    switch (message.type) {
      case 'OPPORTUNITY_ADDED':
        this.emit('opportunity.added', message.data);
        break;
        
      case 'OPPORTUNITY_UPDATED':
        this.emit('opportunity.updated', message.data);
        break;
        
      case 'SYNC_COMPLETED':
        this.emit('sync.completed', message.data.count);
        break;
        
      case 'ERROR':
        this.emit('remote.error', new Error(message.data.message));
        break;
        
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Maximum reconnection attempts reached');
      this.emit('error', new Error('WebSocket connection permanently failed'));
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectDelay);
  }

  private queueMessage(message: WSMessage): void {
    this.messageQueue.push(message);
    
    // Prevent queue from growing too large
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift(); // Remove oldest message
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          this.ws?.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send queued message:', error);
          // Put message back at front of queue
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  private lastHeartbeat?: string;

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastHeartbeat = new Date().toISOString();
        this.sendMessage({
          type: 'HEARTBEAT' as any,
          data: { timestamp: this.lastHeartbeat }
        });
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }
}

// Client-side WebSocket service for frontend
export class ClientWebSocketService extends EventEmitter {
  private ws?: WebSocket;
  private reconnectAttempts: number = 0;
  private reconnectTimer?: number;
  private isConnected: boolean = false;

  constructor(
    private wsUrl: string,
    private config: {
      reconnectDelay: number;
      maxReconnectAttempts: number;
    }
  ) {
    super();
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.wsUrl);
      this.setupClientEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleClientReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this.isConnected = false;
  }

  private setupClientEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        this.emit('message', message);
        
        // Emit specific event types
        switch (message.type) {
          case 'OPPORTUNITY_ADDED':
            this.emit('opportunityAdded', message.data);
            break;
          case 'OPPORTUNITY_UPDATED':
            this.emit('opportunityUpdated', message.data);
            break;
          case 'SYNC_COMPLETED':
            this.emit('syncCompleted', message.data);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code);
      this.isConnected = false;
      this.emit('disconnected');
      
      if (event.code !== 1000) {
        this.handleClientReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  private handleClientReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Maximum reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.config.reconnectDelay);
  }
}