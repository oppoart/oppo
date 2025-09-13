import { EventEmitter } from 'events';
import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { OrchestrationEvent, AgentResponse, ToolCall, WorkflowPattern } from '../types';

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  lastActivity: Date;
}

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'notification';
  data?: any;
  timestamp: Date;
}

export class WebSocketManager extends EventEmitter {
  private server: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private subscriptionGroups: Map<string, Set<string>> = new Map(); // topic -> client IDs
  private heartbeatInterval: NodeJS.Timeout;

  constructor(port: number = 3002) {
    super();
    
    this.server = new WebSocketServer({ 
      port,
      path: '/orchestrator'
    });

    this.setupWebSocketServer();
    this.startHeartbeat();

    console.log(`WebSocket server listening on port ${port}`);
  }

  private setupWebSocketServer(): void {
    this.server.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        lastActivity: new Date()
      };

      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'notification',
        data: {
          message: 'Connected to OPPO Orchestrator',
          clientId
        },
        timestamp: new Date()
      });

      // Handle incoming messages
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data) as WebSocketMessage;
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error(`Invalid WebSocket message from ${clientId}:`, error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.handleClientDisconnect(clientId);
      });
    });
  }

  private handleClientMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message.data);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.data);
        break;

      case 'ping':
        this.sendToClient(clientId, {
          type: 'notification',
          data: { pong: true },
          timestamp: new Date()
        });
        break;

      default:
        console.warn(`Unknown message type from ${clientId}: ${message.type}`);
    }
  }

  private handleSubscribe(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client || !data?.topic) return;

    const topic = data.topic;
    client.subscriptions.add(topic);

    // Add client to subscription group
    if (!this.subscriptionGroups.has(topic)) {
      this.subscriptionGroups.set(topic, new Set());
    }
    this.subscriptionGroups.get(topic)!.add(clientId);

    // Store user ID if provided for user-specific notifications
    if (data.userId) {
      client.userId = data.userId;
    }

    console.log(`Client ${clientId} subscribed to ${topic}`);

    // Send confirmation
    this.sendToClient(clientId, {
      type: 'notification',
      data: {
        message: `Subscribed to ${topic}`,
        topic
      },
      timestamp: new Date()
    });
  }

  private handleUnsubscribe(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client || !data?.topic) return;

    const topic = data.topic;
    client.subscriptions.delete(topic);

    // Remove client from subscription group
    const group = this.subscriptionGroups.get(topic);
    if (group) {
      group.delete(clientId);
      if (group.size === 0) {
        this.subscriptionGroups.delete(topic);
      }
    }

    console.log(`Client ${clientId} unsubscribed from ${topic}`);

    // Send confirmation
    this.sendToClient(clientId, {
      type: 'notification',
      data: {
        message: `Unsubscribed from ${topic}`,
        topic
      },
      timestamp: new Date()
    });
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all subscription groups
    for (const topic of client.subscriptions) {
      const group = this.subscriptionGroups.get(topic);
      if (group) {
        group.delete(clientId);
        if (group.size === 0) {
          this.subscriptionGroups.delete(topic);
        }
      }
    }

    this.clients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  }

  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      this.handleClientDisconnect(clientId);
    }
  }

  // Public notification methods

  broadcastToTopic(topic: string, data: any): void {
    const clientIds = this.subscriptionGroups.get(topic);
    if (!clientIds || clientIds.size === 0) return;

    const message: WebSocketMessage = {
      type: 'notification',
      data: {
        topic,
        ...data
      },
      timestamp: new Date()
    };

    for (const clientId of clientIds) {
      this.sendToClient(clientId, message);
    }

    console.log(`Broadcasted to ${clientIds.size} clients on topic: ${topic}`);
  }

  notifyUserSpecific(userId: string, data: any): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, {
          type: 'notification',
          data: {
            ...data,
            userSpecific: true
          },
          timestamp: new Date()
        });
      }
    }
  }

  // Orchestrator-specific notification methods

  notifyEventProcessed(event: OrchestrationEvent): void {
    this.broadcastToTopic('events', {
      eventType: 'event.processed',
      event: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        source: event.source
      }
    });
  }

  notifyWorkflowStarted(workflow: WorkflowPattern, context: any): void {
    this.broadcastToTopic('workflows', {
      eventType: 'workflow.started',
      workflow: {
        id: workflow.id,
        name: workflow.name,
        context: Object.keys(context)
      }
    });
  }

  notifyWorkflowCompleted(workflow: WorkflowPattern, result: any): void {
    this.broadcastToTopic('workflows', {
      eventType: 'workflow.completed',
      workflow: {
        id: workflow.id,
        name: workflow.name
      },
      success: true
    });
  }

  notifyWorkflowFailed(workflow: WorkflowPattern, error: Error): void {
    this.broadcastToTopic('workflows', {
      eventType: 'workflow.failed',
      workflow: {
        id: workflow.id,
        name: workflow.name
      },
      error: error.message
    });
  }

  notifyAgentResponse(response: AgentResponse): void {
    this.broadcastToTopic('agent', {
      eventType: 'agent.response',
      response: {
        id: response.id,
        confidence: response.confidence,
        processingTime: response.processingTime,
        toolCalls: response.toolCalls.length,
        sources: response.sources.length
      }
    });
  }

  notifyToolCall(toolCall: ToolCall): void {
    this.broadcastToTopic('tools', {
      eventType: 'tool.called',
      toolCall: {
        toolName: toolCall.toolName,
        success: toolCall.success,
        duration: toolCall.duration,
        error: toolCall.error
      }
    });
  }

  notifyOpportunityFound(opportunity: any): void {
    this.broadcastToTopic('opportunities', {
      eventType: 'opportunity.found',
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        organization: opportunity.organization,
        relevanceScore: opportunity.relevanceScore,
        deadline: opportunity.deadline
      }
    });

    // Also notify user-specific if we can determine relevant users
    if (opportunity.relevantUsers) {
      for (const userId of opportunity.relevantUsers) {
        this.notifyUserSpecific(userId, {
          eventType: 'opportunity.found',
          opportunity,
          personalAlert: true
        });
      }
    }
  }

  notifyDeadlineAlert(opportunities: any[], userId?: string): void {
    const alertData = {
      eventType: 'deadline.alert',
      count: opportunities.length,
      opportunities: opportunities.map(opp => ({
        id: opp.id,
        title: opp.title,
        deadline: opp.deadline,
        organization: opp.organization
      }))
    };

    if (userId) {
      this.notifyUserSpecific(userId, alertData);
    } else {
      this.broadcastToTopic('deadlines', alertData);
    }
  }

  // Statistics and monitoring

  getStats() {
    return {
      totalClients: this.clients.size,
      activeClients: Array.from(this.clients.values()).filter(
        c => c.ws.readyState === WebSocket.OPEN
      ).length,
      subscriptionTopics: Array.from(this.subscriptionGroups.keys()),
      subscriptionCounts: Object.fromEntries(
        Array.from(this.subscriptionGroups.entries()).map(
          ([topic, clients]) => [topic, clients.size]
        )
      )
    };
  }

  // Heartbeat to keep connections alive and clean up stale clients
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = 30 * 60 * 1000; // 30 minutes

      for (const [clientId, client] of this.clients.entries()) {
        // Remove stale clients
        if (now.getTime() - client.lastActivity.getTime() > staleThreshold) {
          console.log(`Removing stale client: ${clientId}`);
          this.handleClientDisconnect(clientId);
          continue;
        }

        // Send ping to active clients
        if (client.ws.readyState === WebSocket.OPEN) {
          this.sendToClient(clientId, {
            type: 'notification',
            data: { ping: true },
            timestamp: now
          });
        }
      }
    }, 60000); // Every minute
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down WebSocket server...');
    
    clearInterval(this.heartbeatInterval);
    
    // Close all client connections
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1000, 'Server shutting down');
      }
    }

    // Close the server
    this.server.close();
    this.clients.clear();
    this.subscriptionGroups.clear();
    
    console.log('WebSocket server shutdown complete');
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}