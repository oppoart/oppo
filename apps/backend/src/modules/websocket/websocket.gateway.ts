import {
  WebSocketGateway as NestWebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import * as WebSocket from 'ws';

@NestWebSocketGateway({
  port: 8080,
  transports: ['websocket'],
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('WebSocketGateway');
  private clients: Set<WebSocket> = new Set();

  afterInit() {
    this.logger.log('Native WebSocket Gateway initialized on port 8080');
  }

  handleConnection(client: WebSocket) {
    this.logger.log('Client connected to WebSocket');
    this.clients.add(client);
    
    // Send welcome message
    const welcomeMessage = {
      type: 'HEARTBEAT',
      data: { message: 'Connected to OPPO backend WebSocket' },
      timestamp: new Date().toISOString()
    };
    
    client.send(JSON.stringify(welcomeMessage));

    // Handle messages
    client.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(client, message);
      } catch (error) {
        this.logger.error('Failed to parse WebSocket message:', error);
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('Client disconnected from WebSocket');
    this.clients.delete(client);
  }

  private handleMessage(client: WebSocket, payload: any) {
    this.logger.log('Received WebSocket message:', payload);
    
    // Handle different message types
    switch (payload.type) {
      case 'HEARTBEAT':
        // Respond to heartbeat
        const response = {
          type: 'HEARTBEAT',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        };
        client.send(JSON.stringify(response));
        break;
      default:
        this.logger.log('Unknown message type:', payload.type);
    }
  }

  // Method to broadcast to all clients
  broadcast(message: any) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
    this.logger.log(`Broadcast message to ${this.clients.size} clients`);
  }
}
