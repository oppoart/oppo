import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';

export interface WSMessage {
  type: 'OPPORTUNITY_ADDED' | 'OPPORTUNITY_UPDATED' | 'SYNC_COMPLETED' | 'ERROR' | 'HEARTBEAT';
  data: any;
  timestamp: string;
}

export class OppoWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: async (info: { origin: string; secure: boolean; req: IncomingMessage }) => {
        try {
          // Extract token from query string or headers
          const url = parseUrl(info.req.url || '', true);
          const token = url.query.token as string || 
                       info.req.headers.authorization?.replace('Bearer ', '');

          if (!token) {
            return false;
          }

          // Verify token using the auth system
          // For now, we'll skip auth verification in WebSocket
          // In production, you might want to verify the JWT token here
          return true;
        } catch (error) {
          console.error('WebSocket auth error:', error);
          return false;
        }
      }
    });

    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      console.log('New WebSocket connection established');
      this.clients.add(ws);

      // Send welcome message
      this.sendToClient(ws, {
        type: 'SYNC_COMPLETED',
        data: { message: 'Connected to OPPO WebSocket server' },
        timestamp: new Date().toISOString()
      });

      ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Handle ping/pong for connection health
      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });
    });
  }

  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'HEARTBEAT':
        this.sendToClient(ws, {
          type: 'HEARTBEAT',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
        break;
        
      default:
        console.log('Received unknown message type:', message.type);
    }
  }

  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message to client:', error);
      }
    }
  }

  public broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('Failed to broadcast message:', error);
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    });
  }

  public broadcastOpportunityAdded(opportunity: any): void {
    this.broadcast({
      type: 'OPPORTUNITY_ADDED',
      data: opportunity,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastOpportunityUpdated(opportunity: any): void {
    this.broadcast({
      type: 'OPPORTUNITY_UPDATED',
      data: opportunity,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastSyncCompleted(count: number): void {
    this.broadcast({
      type: 'SYNC_COMPLETED',
      data: { count },
      timestamp: new Date().toISOString()
    });
  }

  public broadcastError(error: Error): void {
    this.broadcast({
      type: 'ERROR',
      data: {
        message: error.message,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach(client => {
        if ((client as any).isAlive === false) {
          client.terminate();
          this.clients.delete(client);
          return;
        }

        (client as any).isAlive = false;
        client.ping();
      });
    }, 30000); // 30 seconds
  }

  public getStats(): {
    connectedClients: number;
    totalConnections: number;
  } {
    return {
      connectedClients: this.clients.size,
      totalConnections: this.clients.size // This could be tracked over time
    };
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.clients.forEach(client => {
      client.close();
    });
    
    this.wss.close();
    console.log('WebSocket server closed');
  }
}

let webSocketServer: OppoWebSocketServer | null = null;

export const createWebSocketServer = (server: HTTPServer): OppoWebSocketServer => {
  if (webSocketServer) {
    return webSocketServer;
  }
  
  webSocketServer = new OppoWebSocketServer(server);
  return webSocketServer;
};

export const getWebSocketServer = (): OppoWebSocketServer | null => {
  return webSocketServer;
};