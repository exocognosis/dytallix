/**
 * WebSocket event bus for real-time Oracle updates
 * Broadcasts oracle_risk_updated events to connected clients
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface OracleRiskUpdatedEvent {
  type: 'oracle_risk_updated';
  txHash: string;
  score: string;
  modelId: string;
  timestamp: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export class WebSocketBus extends EventEmitter {
  private wss: WebSocket.Server | null = null;
  private clients = new Set<WebSocket>();
  
  constructor() {
    super();
    this.setupEventHandlers();
  }
  
  /**
   * Initialize WebSocket server
   */
  initialize(server: any, path = '/ws'): void {
    this.wss = new WebSocket.Server({ 
      server,
      path,
      perMessageDeflate: false 
    });
    
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('WebSocket client connected:', req.socket.remoteAddress);
      
      this.clients.add(ws);
      
      // Send welcome message
      this.sendToClient(ws, {
        type: 'connection_established',
        data: {
          message: 'Connected to Dytallix Oracle WebSocket',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          this.sendError(ws, 'Invalid JSON message');
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
    
    console.log(`WebSocket server initialized on path: ${path}`);
  }
  
  /**
   * Broadcast Oracle risk update to all connected clients
   */
  broadcastOracleUpdate(txHash: string, score: string, modelId: string): void {
    const event: OracleRiskUpdatedEvent = {
      type: 'oracle_risk_updated',
      txHash,
      score,
      modelId,
      timestamp: new Date().toISOString()
    };
    
    this.broadcast({
      type: 'oracle_risk_updated',
      data: event,
      timestamp: new Date().toISOString()
    });
    
    // Emit for internal listeners
    this.emit('oracle_risk_updated', event);
  }
  
  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage): void {
    if (this.clients.size === 0) {
      return;
    }
    
    const messageStr = JSON.stringify(message);
    const deadClients = new Set<WebSocket>();
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('Error sending to WebSocket client:', error);
          deadClients.add(client);
        }
      } else {
        deadClients.add(client);
      }
    });
    
    // Clean up dead connections
    deadClients.forEach((client) => {
      this.clients.delete(client);
    });
  }
  
  /**
   * Send message to specific client
   */
  private sendToClient(client: WebSocket, message: WebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending to WebSocket client:', error);
        this.clients.delete(client);
      }
    }
  }
  
  /**
   * Send error message to client
   */
  private sendError(client: WebSocket, error: string): void {
    this.sendToClient(client, {
      type: 'error',
      data: { error },
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Handle incoming client messages
   */
  private handleClientMessage(client: WebSocket, message: any): void {
    switch (message.type) {
      case 'ping':
        this.sendToClient(client, {
          type: 'pong',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'subscribe':
        // For future subscription-based filtering
        this.sendToClient(client, {
          type: 'subscribed',
          data: { channels: message.channels || ['all'] },
          timestamp: new Date().toISOString()
        });
        break;
        
      default:
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }
  
  /**
   * Setup internal event handlers
   */
  private setupEventHandlers(): void {
    this.on('oracle_risk_updated', (event: OracleRiskUpdatedEvent) => {
      console.log('Oracle risk updated:', {
        txHash: event.txHash,
        score: event.score,
        modelId: event.modelId
      });
    });
  }
  
  /**
   * Get connection statistics
   */
  getStats(): { connectedClients: number; totalEvents: number } {
    return {
      connectedClients: this.clients.size,
      totalEvents: this.listenerCount('oracle_risk_updated')
    };
  }
  
  /**
   * Close all connections and cleanup
   */
  close(): void {
    if (this.wss) {
      this.clients.forEach((client) => {
        client.close(1000, 'Server shutting down');
      });
      
      this.wss.close();
      this.clients.clear();
    }
  }
}

// Global WebSocket bus instance
export const webSocketBus = new WebSocketBus();