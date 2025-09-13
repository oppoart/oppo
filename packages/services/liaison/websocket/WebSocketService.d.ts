import { EventEmitter } from 'events';
import { LiaisonConfig, WSMessage } from '../types';
export declare class WebSocketService extends EventEmitter {
    private wsUrl;
    private ws?;
    private config;
    private reconnectAttempts;
    private reconnectTimer?;
    private isConnected;
    private messageQueue;
    private heartbeatInterval?;
    constructor(wsUrl: string, config: LiaisonConfig['realtime']);
    initialize(): Promise<void>;
    connect(): void;
    disconnect(): void;
    sendMessage(message: Omit<WSMessage, 'timestamp'>): void;
    broadcastOpportunityAdded(opportunity: any): void;
    broadcastOpportunityUpdated(opportunity: any): void;
    broadcastSyncCompleted(count: number): void;
    broadcastError(error: Error): void;
    getConnectionStatus(): {
        connected: boolean;
        reconnectAttempts: number;
        queuedMessages: number;
        lastHeartbeat?: string;
    };
    healthCheck(): Promise<boolean>;
    shutdown(): Promise<void>;
    private setupEventHandlers;
    private handleMessage;
    private handleReconnect;
    private queueMessage;
    private processMessageQueue;
    private lastHeartbeat?;
    private startHeartbeat;
    private stopHeartbeat;
}
export declare class ClientWebSocketService extends EventEmitter {
    private wsUrl;
    private config;
    private ws?;
    private reconnectAttempts;
    private reconnectTimer?;
    private isConnected;
    constructor(wsUrl: string, config: {
        reconnectDelay: number;
        maxReconnectAttempts: number;
    });
    connect(): void;
    disconnect(): void;
    private setupClientEventHandlers;
    private handleClientReconnect;
}
