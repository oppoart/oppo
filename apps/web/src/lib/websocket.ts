'use client';

import { EventEmitter } from 'events';
import { useState, useEffect } from 'react';

export interface WSMessage {
  type: 'OPPORTUNITY_ADDED' | 'OPPORTUNITY_UPDATED' | 'SYNC_COMPLETED' | 'ERROR' | 'HEARTBEAT';
  data: any;
  timestamp: string;
}

export class WebSocketClient extends EventEmitter {
  private ws?: WebSocket;
  private reconnectAttempts: number = 0;
  private reconnectTimer?: number;
  private isConnected: boolean = false;
  private url: string;
  private config: {
    reconnectDelay: number;
    maxReconnectAttempts: number;
    heartbeatInterval: number;
  };
  private heartbeatTimer?: number;

  constructor(
    url: string,
    config: {
      reconnectDelay?: number;
      maxReconnectAttempts?: number;
      heartbeatInterval?: number;
    } = {}
  ) {
    super();
    this.url = url;
    this.config = {
      reconnectDelay: config.reconnectDelay || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
  }

  connect(token?: string): void {
    try {
      // Add token to URL if provided
      const wsUrl = token ? `${this.url}?token=${token}` : this.url;
      console.log('Attempting WebSocket connection to:', wsUrl);
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      // Only emit error if there are listeners to prevent unhandled errors
      if (this.listenerCount('error') > 0) {
        this.emit('error', error);
      }
      this.handleReconnect();
    }
  }

  disconnect(): void {
    this.cleanup();
    this.isConnected = false;
    this.emit('disconnected');
  }

  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected to OPPO backend');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
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
      console.log('WebSocket connection closed:', event.code);
      this.isConnected = false;
      this.stopHeartbeat();
      this.emit('disconnected');
      
      // Only reconnect if it wasn't a normal closure
      if (event.code !== 1000) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Only emit error if there are listeners to prevent unhandled errors
      if (this.listenerCount('error') > 0) {
        this.emit('error', error);
      }
    };
  }

  private handleMessage(message: WSMessage): void {
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
      case 'ERROR':
        this.emit('remoteError', new Error(message.data.message));
        break;
      case 'HEARTBEAT':
        // Respond to server heartbeat
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Maximum WebSocket reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.config.reconnectDelay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'HEARTBEAT',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    }
  }

  public getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  public destroy(): void {
    this.cleanup();
    this.removeAllListeners();
  }
}

// Global WebSocket client instance
let globalWebSocketClient: WebSocketClient | null = null;

export const createWebSocketClient = (
  url?: string,
  config?: {
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
  }
): WebSocketClient => {
  const wsUrl = url || (
    typeof window !== 'undefined' 
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//localhost:8080`
      : 'ws://localhost:8080'
  );

  if (globalWebSocketClient) {
    globalWebSocketClient.destroy();
  }

  globalWebSocketClient = new WebSocketClient(wsUrl, config);
  return globalWebSocketClient;
};

export const getWebSocketClient = (): WebSocketClient | null => {
  return globalWebSocketClient;
};

// React hook for using WebSocket
export const useWebSocket = (
  url?: string,
  options?: {
    autoConnect?: boolean;
    token?: string;
    onConnected?: () => void;
    onDisconnected?: () => void;
    onOpportunityAdded?: (opportunity: any) => void;
    onOpportunityUpdated?: (opportunity: any) => void;
    onSyncCompleted?: (data: any) => void;
    onError?: (error: Error) => void;
  }
) => {
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wsClient = createWebSocketClient(url);
    setClient(wsClient);

    // Set up event listeners
    const handleConnected = () => {
      setConnected(true);
      options?.onConnected?.();
    };

    const handleDisconnected = () => {
      setConnected(false);
      options?.onDisconnected?.();
    };

    const handleOpportunityAdded = (opportunity: any) => {
      options?.onOpportunityAdded?.(opportunity);
    };

    const handleOpportunityUpdated = (opportunity: any) => {
      options?.onOpportunityUpdated?.(opportunity);
    };

    const handleSyncCompleted = (data: any) => {
      options?.onSyncCompleted?.(data);
    };

    const handleError = (error: Error) => {
      options?.onError?.(error);
    };

    wsClient.on('connected', handleConnected);
    wsClient.on('disconnected', handleDisconnected);
    wsClient.on('opportunityAdded', handleOpportunityAdded);
    wsClient.on('opportunityUpdated', handleOpportunityUpdated);
    wsClient.on('syncCompleted', handleSyncCompleted);
    wsClient.on('error', handleError);

    // Auto-connect if enabled
    if (options?.autoConnect !== false) {
      wsClient.connect(options?.token);
    }

    return () => {
      wsClient.off('connected', handleConnected);
      wsClient.off('disconnected', handleDisconnected);
      wsClient.off('opportunityAdded', handleOpportunityAdded);
      wsClient.off('opportunityUpdated', handleOpportunityUpdated);
      wsClient.off('syncCompleted', handleSyncCompleted);
      wsClient.off('error', handleError);
      wsClient.destroy();
    };
  }, [url, options?.token]);

  return {
    client,
    connected,
    connect: (token?: string) => client?.connect(token),
    disconnect: () => client?.disconnect(),
  };
};