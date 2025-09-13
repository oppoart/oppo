"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientWebSocketService = exports.WebSocketService = void 0;
const events_1 = require("events");
class WebSocketService extends events_1.EventEmitter {
    constructor(wsUrl, config) {
        super();
        this.wsUrl = wsUrl;
        this.reconnectAttempts = 0;
        this.isConnected = false;
        this.messageQueue = [];
        this.config = config;
    }
    async initialize() {
        if (!this.config.enabled) {
            console.log('WebSocket service is disabled');
            return;
        }
        this.connect();
    }
    connect() {
        if (!this.config.enabled) {
            return;
        }
        try {
            this.ws = new WebSocket(this.wsUrl);
            this.setupEventHandlers();
        }
        catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.handleReconnect();
        }
    }
    disconnect() {
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
    sendMessage(message) {
        const fullMessage = {
            ...message,
            timestamp: new Date().toISOString()
        };
        if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(fullMessage));
            }
            catch (error) {
                console.error('Failed to send WebSocket message:', error);
                this.queueMessage(fullMessage);
            }
        }
        else {
            this.queueMessage(fullMessage);
        }
    }
    broadcastOpportunityAdded(opportunity) {
        this.sendMessage({
            type: 'OPPORTUNITY_ADDED',
            data: opportunity
        });
    }
    broadcastOpportunityUpdated(opportunity) {
        this.sendMessage({
            type: 'OPPORTUNITY_UPDATED',
            data: opportunity
        });
    }
    broadcastSyncCompleted(count) {
        this.sendMessage({
            type: 'SYNC_COMPLETED',
            data: { count }
        });
    }
    broadcastError(error) {
        this.sendMessage({
            type: 'ERROR',
            data: {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            }
        });
    }
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            lastHeartbeat: this.lastHeartbeat
        };
    }
    async healthCheck() {
        return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
    }
    async shutdown() {
        console.log('Shutting down WebSocket service...');
        this.disconnect();
        this.removeAllListeners();
    }
    setupEventHandlers() {
        if (!this.ws)
            return;
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('websocket.connected');
            this.processMessageQueue();
            this.startHeartbeat();
        };
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            }
            catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
        this.ws.onclose = (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
            this.isConnected = false;
            this.stopHeartbeat();
            if (event.code !== 1000) {
                this.handleReconnect();
            }
        };
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', new Error(`WebSocket error: ${error}`));
        };
    }
    handleMessage(message) {
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
    handleReconnect() {
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
    queueMessage(message) {
        this.messageQueue.push(message);
        if (this.messageQueue.length > 100) {
            this.messageQueue.shift();
        }
    }
    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            if (message) {
                try {
                    this.ws?.send(JSON.stringify(message));
                }
                catch (error) {
                    console.error('Failed to send queued message:', error);
                    this.messageQueue.unshift(message);
                    break;
                }
            }
        }
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.lastHeartbeat = new Date().toISOString();
                this.sendMessage({
                    type: 'HEARTBEAT',
                    data: { timestamp: this.lastHeartbeat }
                });
            }
        }, 30000);
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = undefined;
        }
    }
}
exports.WebSocketService = WebSocketService;
class ClientWebSocketService extends events_1.EventEmitter {
    constructor(wsUrl, config) {
        super();
        this.wsUrl = wsUrl;
        this.config = config;
        this.reconnectAttempts = 0;
        this.isConnected = false;
    }
    connect() {
        try {
            this.ws = new WebSocket(this.wsUrl);
            this.setupClientEventHandlers();
        }
        catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.handleClientReconnect();
        }
    }
    disconnect() {
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
    setupClientEventHandlers() {
        if (!this.ws)
            return;
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connected');
        };
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.emit('message', message);
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
            }
            catch (error) {
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
    handleClientReconnect() {
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
exports.ClientWebSocketService = ClientWebSocketService;
//# sourceMappingURL=WebSocketService.js.map