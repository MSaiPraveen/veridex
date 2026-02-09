import wsManager from './websocket.service';
import sseManager from './sse.service';

export interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt?: Date;
}

/**
 * Unified Real-time Notification Service
 * 
 * Provides a unified interface for sending real-time notifications
 * through both WebSocket and SSE channels.
 */
export const RealtimeNotificationService = {
  /**
   * Send notification to a specific user via all channels
   */
  sendToUser(userId: string, notification: RealtimeNotification): { ws: number; sse: number } {
    const payload = {
      ...notification,
      createdAt: notification.createdAt || new Date(),
    };
    
    const wsCount = wsManager.sendToUser(userId, payload);
    const sseCount = sseManager.sendToUser(userId, payload);
    
    console.log(`[Realtime] Sent to user ${userId}: WS=${wsCount}, SSE=${sseCount}`);
    
    return { ws: wsCount, sse: sseCount };
  },
  
  /**
   * Send notification to all members of an organization
   */
  sendToOrganization(organizationId: string, notification: RealtimeNotification): { ws: number; sse: number } {
    const payload = {
      ...notification,
      createdAt: notification.createdAt || new Date(),
    };
    
    const wsCount = wsManager.sendToOrganization(organizationId, payload);
    const sseCount = sseManager.sendToOrganization(organizationId, payload);
    
    console.log(`[Realtime] Sent to org ${organizationId}: WS=${wsCount}, SSE=${sseCount}`);
    
    return { ws: wsCount, sse: sseCount };
  },
  
  /**
   * Broadcast notification to all connected users
   */
  broadcast(notification: RealtimeNotification): { ws: number; sse: number } {
    const payload = {
      ...notification,
      createdAt: notification.createdAt || new Date(),
    };
    
    const wsCount = wsManager.broadcast(payload);
    const sseCount = sseManager.broadcast(payload);
    
    console.log(`[Realtime] Broadcast: WS=${wsCount}, SSE=${sseCount}`);
    
    return { ws: wsCount, sse: sseCount };
  },
  
  /**
   * Get combined connection statistics
   */
  getStats(): {
    websocket: { totalConnections: number; uniqueUsers: number; organizations: number };
    sse: { totalConnections: number; uniqueUsers: number; organizations: number };
    total: { connections: number; users: number };
  } {
    const wsStats = wsManager.getStats();
    const sseStats = sseManager.getStats();
    
    return {
      websocket: {
        totalConnections: wsStats.totalConnections,
        uniqueUsers: wsStats.uniqueUsers,
        organizations: wsStats.organizations,
      },
      sse: {
        totalConnections: sseStats.totalConnections,
        uniqueUsers: sseStats.uniqueUsers,
        organizations: sseStats.organizations,
      },
      total: {
        connections: wsStats.totalConnections + sseStats.totalConnections,
        users: wsStats.uniqueUsers + sseStats.uniqueUsers, // May have overlap
      },
    };
  },
  
  /**
   * Shutdown all connections
   */
  shutdown(): void {
    wsManager.shutdown();
    sseManager.shutdown();
    console.log('[Realtime] All connections closed');
  },
};

export default RealtimeNotificationService;
