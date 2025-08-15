import { WebSocketServer, WebSocket } from 'ws';
import { LiveMatchData, LiveBallEvent } from '@shared/schema';

export interface CricketWebSocketService {
  broadcastMatchUpdate(matchId: string, data: LiveMatchData): void;
  broadcastBallEvent(matchId: string, event: LiveBallEvent): void;
  subscribeToMatch(ws: WebSocket, matchId: string): void;
  unsubscribeFromMatch(ws: WebSocket, matchId: string): void;
  getConnectedClients(matchId?: string): number;
}

export class CricketWebSocketManager implements CricketWebSocketService {
  private matchSubscriptions = new Map<string, Set<WebSocket>>();
  private clientSubscriptions = new Map<WebSocket, Set<string>>();

  constructor(private wss: WebSocketServer) {
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Cricket WebSocket client connected');
      
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });

      ws.on('close', () => {
        console.log('Cricket WebSocket client disconnected');
        this.cleanupClientSubscriptions(ws);
      });

      ws.on('error', (error) => {
        console.error('Cricket WebSocket error:', error);
        this.cleanupClientSubscriptions(ws);
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        timestamp: new Date().toISOString()
      }));
    });
  }

  private handleMessage(ws: WebSocket, data: any): void {
    switch (data.type) {
      case 'subscribe':
        if (data.matchId) {
          this.subscribeToMatch(ws, data.matchId);
          ws.send(JSON.stringify({
            type: 'subscription',
            matchId: data.matchId,
            status: 'subscribed',
            timestamp: new Date().toISOString()
          }));
        }
        break;

      case 'unsubscribe':
        if (data.matchId) {
          this.unsubscribeFromMatch(ws, data.matchId);
          ws.send(JSON.stringify({
            type: 'subscription',
            matchId: data.matchId,
            status: 'unsubscribed',
            timestamp: new Date().toISOString()
          }));
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }

  subscribeToMatch(ws: WebSocket, matchId: string): void {
    // Add client to match subscription
    if (!this.matchSubscriptions.has(matchId)) {
      this.matchSubscriptions.set(matchId, new Set());
    }
    this.matchSubscriptions.get(matchId)!.add(ws);

    // Track client's subscriptions
    if (!this.clientSubscriptions.has(ws)) {
      this.clientSubscriptions.set(ws, new Set());
    }
    this.clientSubscriptions.get(ws)!.add(matchId);

    console.log(`Client subscribed to match ${matchId}. Total subscribers: ${this.matchSubscriptions.get(matchId)!.size}`);
  }

  unsubscribeFromMatch(ws: WebSocket, matchId: string): void {
    // Remove client from match subscription
    if (this.matchSubscriptions.has(matchId)) {
      this.matchSubscriptions.get(matchId)!.delete(ws);
      
      // Clean up empty subscription sets
      if (this.matchSubscriptions.get(matchId)!.size === 0) {
        this.matchSubscriptions.delete(matchId);
      }
    }

    // Remove from client's subscription tracking
    if (this.clientSubscriptions.has(ws)) {
      this.clientSubscriptions.get(ws)!.delete(matchId);
    }

    console.log(`Client unsubscribed from match ${matchId}`);
  }

  private cleanupClientSubscriptions(ws: WebSocket): void {
    // Get all matches this client was subscribed to
    const subscribedMatches = this.clientSubscriptions.get(ws);
    
    if (subscribedMatches) {
      // Unsubscribe from all matches
      subscribedMatches.forEach(matchId => {
        this.unsubscribeFromMatch(ws, matchId);
      });
      
      // Remove client tracking
      this.clientSubscriptions.delete(ws);
    }
  }

  broadcastMatchUpdate(matchId: string, data: LiveMatchData): void {
    const subscribers = this.matchSubscriptions.get(matchId);
    
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message = JSON.stringify({
      type: 'match_update',
      data,
      timestamp: new Date().toISOString()
    });

    const deadConnections: WebSocket[] = [];

    subscribers.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        } else {
          deadConnections.push(ws);
        }
      } catch (error) {
        console.error('Error sending match update:', error);
        deadConnections.push(ws);
      }
    });

    // Clean up dead connections
    deadConnections.forEach(ws => {
      this.cleanupClientSubscriptions(ws);
    });

    console.log(`Broadcasted match update for ${matchId} to ${subscribers.size - deadConnections.length} clients`);
  }

  broadcastBallEvent(matchId: string, event: LiveBallEvent): void {
    const subscribers = this.matchSubscriptions.get(matchId);
    
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message = JSON.stringify({
      type: 'ball_event',
      data: event,
      timestamp: new Date().toISOString()
    });

    const deadConnections: WebSocket[] = [];

    subscribers.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        } else {
          deadConnections.push(ws);
        }
      } catch (error) {
        console.error('Error sending ball event:', error);
        deadConnections.push(ws);
      }
    });

    // Clean up dead connections
    deadConnections.forEach(ws => {
      this.cleanupClientSubscriptions(ws);
    });

    console.log(`Broadcasted ball event for ${matchId} to ${subscribers.size - deadConnections.length} clients`);
  }

  getConnectedClients(matchId?: string): number {
    if (matchId) {
      return this.matchSubscriptions.get(matchId)?.size || 0;
    }
    
    // Total unique clients across all matches
    return this.clientSubscriptions.size;
  }

  // Health check method
  getHealthStatus() {
    return {
      totalClients: this.clientSubscriptions.size,
      activeMatches: Array.from(this.matchSubscriptions.keys()),
      matchSubscriptions: Object.fromEntries(
        Array.from(this.matchSubscriptions.entries()).map(([matchId, clients]) => 
          [matchId, clients.size]
        )
      )
    };
  }

  // Admin method to broadcast system messages
  broadcastSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const systemMessage = JSON.stringify({
      type: 'system_message',
      level,
      message,
      timestamp: new Date().toISOString()
    });

    this.clientSubscriptions.forEach((_, ws) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(systemMessage);
        }
      } catch (error) {
        console.error('Error sending system message:', error);
      }
    });
  }
}