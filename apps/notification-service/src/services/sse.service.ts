import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as crypto from 'crypto';

interface SSEConnection {
  reply: FastifyReply;
  userId: string;
  organizationId?: string;
  connectedAt: Date;
}

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  [key: string]: unknown;
}

/**
 * SSE (Server-Sent Events) Manager for Real-time Notifications
 * 
 * Provides an alternative to WebSocket for real-time notifications.
 * SSE is simpler and works over HTTP, making it easier to use behind
 * proxies and in browsers that don't support WebSocket.
 */
class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private orgConnections: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timer | null = null;
  
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  
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
   * Add a new SSE connection
   */
  addConnection(reply: FastifyReply, userId: string, organizationId?: string): string {
    const connectionId = this.generateConnectionId();
    const now = new Date();
    
    this.connections.set(connectionId, {
      reply,
      userId,
      organizationId,
      connectedAt: now,
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
    
    console.log(`[SSE] Connection ${connectionId} added for user ${userId}`);
    
    // Send initial connection event
    this.sendEvent(connectionId, 'connected', {
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
    
    this.connections.delete(connectionId);
    console.log(`[SSE] Connection ${connectionId} removed`);
  }
  
  /**
   * Send SSE event to a specific connection
   */
  private sendEvent(connectionId: string, eventType: string, data: Record<string, unknown>): boolean {
    const conn = this.connections.get(connectionId);
    if (!conn) return false;
    
    try {
      const eventData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      conn.reply.raw.write(eventData);
      return true;
    } catch (error) {
      console.error(`[SSE] Error sending to ${connectionId}:`, error);
      this.removeConnection(connectionId);
      return false;
    }
  }
  
  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, notification: NotificationPayload): number {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return 0;
    
    let sent = 0;
    for (const connectionId of connectionIds) {
      if (this.sendEvent(connectionId, 'notification', notification)) {
        sent++;
      }
    }
    
    console.log(`[SSE] Sent notification to ${sent} connections for user ${userId}`);
    return sent;
  }
  
  /**
   * Send notification to all members of an organization
   */
  sendToOrganization(organizationId: string, notification: NotificationPayload): number {
    const connectionIds = this.orgConnections.get(organizationId);
    if (!connectionIds) return 0;
    
    let sent = 0;
    for (const connectionId of connectionIds) {
      if (this.sendEvent(connectionId, 'notification', notification)) {
        sent++;
      }
    }
    
    console.log(`[SSE] Sent notification to ${sent} connections for org ${organizationId}`);
    return sent;
  }
  
  /**
   * Broadcast to all connections
   */
  broadcast(notification: NotificationPayload): number {
    let sent = 0;
    for (const connectionId of this.connections.keys()) {
      if (this.sendEvent(connectionId, 'notification', notification)) {
        sent++;
      }
    }
    
    console.log(`[SSE] Broadcast notification to ${sent} connections`);
    return sent;
  }
  
  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date().toISOString();
      
      for (const connectionId of this.connections.keys()) {
        // Send heartbeat comment (SSE comment format)
        const conn = this.connections.get(connectionId);
        if (conn) {
          try {
            conn.reply.raw.write(`: heartbeat ${now}\n\n`);
          } catch (error) {
            this.removeConnection(connectionId);
          }
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
  } {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      organizations: this.orgConnections.size,
    };
  }
  
  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval as NodeJS.Timeout);
    }
    
    this.connections.clear();
    this.userConnections.clear();
    this.orgConnections.clear();
    
    console.log('[SSE] Manager shut down');
  }
}

// Singleton instance
export const sseManager = new SSEManager();

/**
 * Register SSE routes
 */
export async function registerSSERoutes(app: FastifyInstance): Promise<void> {
  // SSE endpoint for real-time notifications
  app.get('/sse/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    // Extract user info from query params
    // In production, this should validate a JWT token
    const { userId, organizationId } = request.query as Record<string, string>;
    
    if (!userId) {
      return reply.status(400).send({ error: 'User ID required' });
    }
    
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });
    
    // Add connection
    const connectionId = sseManager.addConnection(reply, userId, organizationId);
    
    // Handle client disconnect
    request.raw.on('close', () => {
      sseManager.removeConnection(connectionId);
    });
    
    // Keep the connection open
    // The response is handled by SSEManager
    return new Promise(() => {
      // This promise never resolves, keeping the connection open
    });
  });
  
  // REST endpoint to check SSE stats
  app.get('/sse/stats', async () => {
    return {
      success: true,
      data: sseManager.getStats(),
    };
  });
}

export default sseManager;
