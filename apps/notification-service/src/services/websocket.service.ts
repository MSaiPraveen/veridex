import { FastifyInstance } from 'fastify';
import { WebSocket, RawData } from 'ws';
import * as crypto from 'crypto';

interface ConnectionInfo {
  socket: WebSocket;
  userId: string;
  organizationId?: string;
  connectedAt: Date;
  lastPingAt: Date;
}

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
}

/**
 * WebSocket Manager for Real-time Notifications
 * 
 * Manages WebSocket connections and provides methods to:
 * - Track active connections by user and organization
 * - Send notifications to specific users or organizations
 * - Broadcast system-wide notifications
 * - Handle connection lifecycle and heartbeat
 */
class WebSocketManager {
  private connections: Map<string, ConnectionInfo> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private orgConnections: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timer | null = null;
  
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds
  
  constructor() {
    this.startHeartbeat();
  }
  
  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * Add a new connection
   */
  addConnection(socket: WebSocket, userId: string, organizationId?: string): string {
    const connectionId = this.generateConnectionId();
    const now = new Date();
    
    this.connections.set(connectionId, {
      socket,
      userId,
      organizationId,
      connectedAt: now,
      lastPingAt: now,
    });
    
    // Track by user
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);
    
    // Track by organization
    if (organizationId) {
      if (!this.orgConnections.has(organizationId)) {
        this.orgConnections.set(organizationId, new Set());
      }
      this.orgConnections.get(organizationId)!.add(connectionId);
    }
    
    console.log(`[WebSocket] Connection ${connectionId} added for user ${userId}`);
    
    // Setup connection handlers
    this.setupConnectionHandlers(connectionId, socket);
    
    // Send welcome message
    this.sendToConnection(connectionId, {
      type: 'connected',
      connectionId,
      timestamp: now.toISOString(),
    });
    
    return connectionId;
  }
  
  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;
    
    // Remove from user tracking
    const userConns = this.userConnections.get(conn.userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(conn.userId);
      }
    }
    
    // Remove from org tracking
    if (conn.organizationId) {
      const orgConns = this.orgConnections.get(conn.organizationId);
      if (orgConns) {
        orgConns.delete(connectionId);
        if (orgConns.size === 0) {
          this.orgConnections.delete(conn.organizationId);
        }
      }
    }
    
    // Close socket if still open
    if (conn.socket.readyState === WebSocket.OPEN) {
      conn.socket.close();
    }
    
    this.connections.delete(connectionId);
    console.log(`[WebSocket] Connection ${connectionId} removed`);
  }
  
  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(connectionId: string, socket: WebSocket): void {
    socket.on('message', (data: RawData) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(connectionId, message);
      } catch (error) {
        console.error(`[WebSocket] Error parsing message from ${connectionId}:`, error);
      }
    });
    
    socket.on('close', () => {
      this.removeConnection(connectionId);
    });
    
    socket.on('error', (error: Error) => {
      console.error(`[WebSocket] Error on connection ${connectionId}:`, error.message);
      this.removeConnection(connectionId);
    });
    
    socket.on('pong', () => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.lastPingAt = new Date();
      }
    });
  }
  
  /**
   * Handle incoming message
   */
  private handleMessage(connectionId: string, message: { type: string; [key: string]: unknown }): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;
    
    switch (message.type) {
      case 'ping':
        conn.lastPingAt = new Date();
        this.sendToConnection(connectionId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      case 'subscribe':
        // Handle subscription to specific channels/topics
        console.log(`[WebSocket] User ${conn.userId} subscribed to:`, message.channels);
        break;
      
      case 'acknowledge':
        // Handle notification acknowledgment
        console.log(`[WebSocket] User ${conn.userId} acknowledged notification:`, message.notificationId);
        break;
      
      default:
        console.log(`[WebSocket] Unknown message type from ${connectionId}:`, message.type);
    }
  }
  
  /**
   * Send message to a specific connection
   */
  private sendToConnection(connectionId: string, message: Record<string, unknown>): boolean {
    const conn = this.connections.get(connectionId);
    if (!conn || conn.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      conn.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[WebSocket] Error sending to ${connectionId}:`, error);
      return false;
    }
  }
  
  /**
   * Send notification to a specific user (all their connections)
   */
  sendToUser(userId: string, notification: NotificationPayload): number {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return 0;
    
    let sent = 0;
    const message = {
      ...notification,
      eventType: 'notification',
    };
    
    for (const connectionId of connectionIds) {
      if (this.sendToConnection(connectionId, message)) {
        sent++;
      }
    }
    
    console.log(`[WebSocket] Sent notification to ${sent} connections for user ${userId}`);
    return sent;
  }
  
  /**
   * Send notification to all members of an organization
   */
  sendToOrganization(organizationId: string, notification: NotificationPayload): number {
    const connectionIds = this.orgConnections.get(organizationId);
    if (!connectionIds) return 0;
    
    let sent = 0;
    const message = {
      ...notification,
      eventType: 'notification',
    };
    
    for (const connectionId of connectionIds) {
      if (this.sendToConnection(connectionId, message)) {
        sent++;
      }
    }
    
    console.log(`[WebSocket] Sent notification to ${sent} connections for org ${organizationId}`);
    return sent;
  }
  
  /**
   * Broadcast to all connections
   */
  broadcast(notification: NotificationPayload): number {
    let sent = 0;
    const message = {
      ...notification,
      eventType: 'notification',
    };
    
    for (const connectionId of this.connections.keys()) {
      if (this.sendToConnection(connectionId, message)) {
        sent++;
      }
    }
    
    console.log(`[WebSocket] Broadcast notification to ${sent} connections`);
    return sent;
  }
  
  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [connectionId, conn] of this.connections) {
        // Check for timeout
        if (now - conn.lastPingAt.getTime() > this.CONNECTION_TIMEOUT) {
          console.log(`[WebSocket] Connection ${connectionId} timed out`);
          this.removeConnection(connectionId);
          continue;
        }
        
        // Send ping
        if (conn.socket.readyState === WebSocket.OPEN) {
          conn.socket.ping();
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }
  
  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    uniqueUsers: number;
    organizations: number;
    connections: Array<{ userId: string; organizationId?: string; connectedAt: Date }>;
  } {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      organizations: this.orgConnections.size,
      connections: Array.from(this.connections.values()).map((c) => ({
        userId: c.userId,
        organizationId: c.organizationId,
        connectedAt: c.connectedAt,
      })),
    };
  }
  
  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval as NodeJS.Timeout);
    }
    
    // Close all connections
    for (const [connectionId, conn] of this.connections) {
      try {
        conn.socket.close(1001, 'Server shutting down');
      } catch (error) {
        // Ignore close errors
      }
    }
    
    this.connections.clear();
    this.userConnections.clear();
    this.orgConnections.clear();
    
    console.log('[WebSocket] Manager shut down');
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

/**
 * Register WebSocket route
 */
export async function registerWebSocketRoute(app: FastifyInstance): Promise<void> {
  // Register WebSocket plugin
  await app.register(import('@fastify/websocket'));
  
  // WebSocket endpoint for real-time notifications
  app.get('/ws/notifications', { websocket: true }, (socket, request) => {
    // Extract user info from query params or headers
    // In production, this should validate a JWT token
    const userId = (request.query as Record<string, string>).userId;
    const organizationId = (request.query as Record<string, string>).organizationId;
    
    if (!userId) {
      socket.close(4001, 'User ID required');
      return;
    }
    
    // Add connection
    wsManager.addConnection(socket, userId, organizationId);
  });
  
  // REST endpoint to check WebSocket stats
  app.get('/ws/stats', async () => {
    return {
      success: true,
      data: wsManager.getStats(),
    };
  });
}

export default wsManager;
