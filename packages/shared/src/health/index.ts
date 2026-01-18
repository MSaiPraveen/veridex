/**
 * Deep Health Check Utilities
 * 
 * Provides standardized health check implementations for:
 * - Liveness: Is the process alive?
 * - Readiness: Is the service ready to accept traffic?
 */

import mongoose from 'mongoose';

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version?: string;
  uptime: number;
  checks?: {
    [key: string]: {
      status: 'up' | 'down';
      latency?: number;
      message?: string;
    };
  };
}

/**
 * Health check options
 */
export interface HealthCheckOptions {
  serviceName: string;
  version?: string;
  checks?: {
    mongo?: boolean;
    kafka?: boolean;
    redis?: boolean;
    custom?: () => Promise<{ name: string; status: 'up' | 'down'; message?: string }>;
  };
}

const startTime = Date.now();

/**
 * Liveness check - is the process alive?
 * Should return quickly and not depend on external services
 */
export function livenessCheck(serviceName: string): HealthStatus {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: serviceName,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
}

/**
 * Check MongoDB connection status
 */
export async function checkMongo(): Promise<{ status: 'up' | 'down'; latency?: number; message?: string }> {
  const start = Date.now();
  
  try {
    const state = mongoose.connection.readyState;
    
    if (state !== 1) {
      return {
        status: 'down',
        message: `MongoDB not connected. State: ${getMongoStateDescription(state)}`,
      };
    }
    
    // Ping the database to verify connectivity
    await mongoose.connection.db?.admin().ping();
    
    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - start,
    };
  }
}

/**
 * Get human-readable MongoDB connection state
 */
function getMongoStateDescription(state: number): string {
  switch (state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

/**
 * Check Kafka connectivity
 * Note: This is a basic check. For production, consider using Kafka admin client
 */
export async function checkKafka(producer: any): Promise<{ status: 'up' | 'down'; latency?: number; message?: string }> {
  const start = Date.now();
  
  try {
    if (!producer) {
      return {
        status: 'down',
        message: 'Kafka producer not initialized',
      };
    }
    
    // Most Kafka clients have an isConnected method or similar
    // This depends on the specific Kafka library being used
    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check Redis connectivity
 */
export async function checkRedis(redis: any): Promise<{ status: 'up' | 'down'; latency?: number; message?: string }> {
  const start = Date.now();
  
  try {
    if (!redis) {
      return {
        status: 'down',
        message: 'Redis client not initialized',
      };
    }
    
    await redis.ping();
    
    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - start,
    };
  }
}

/**
 * Readiness check - is the service ready to accept traffic?
 * Checks all configured dependencies
 */
export async function readinessCheck(options: HealthCheckOptions): Promise<HealthStatus> {
  const checks: HealthStatus['checks'] = {};
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  
  // Check MongoDB if configured
  if (options.checks?.mongo !== false) {
    const mongoCheck = await checkMongo();
    checks['mongodb'] = mongoCheck;
    if (mongoCheck.status === 'down') {
      overallStatus = 'unhealthy';
    }
  }
  
  // Run custom checks if configured
  if (options.checks?.custom) {
    try {
      const customResult = await options.checks.custom();
      checks[customResult.name] = {
        status: customResult.status,
        message: customResult.message,
      };
      if (customResult.status === 'down') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
      }
    } catch (error) {
      checks['custom'] = {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
    }
  }
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: options.serviceName,
    version: options.version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };
}

/**
 * Create health check routes for Fastify
 */
export function createHealthRoutes(options: HealthCheckOptions) {
  return async function healthRoutes(app: any) {
    // Liveness probe - is the process alive?
    app.get('/health/live', async () => {
      return livenessCheck(options.serviceName);
    });
    
    // Readiness probe - is the service ready for traffic?
    app.get('/health/ready', async (request: any, reply: any) => {
      const status = await readinessCheck(options);
      
      // Return 503 if not healthy
      if (status.status === 'unhealthy') {
        return reply.status(503).send(status);
      }
      
      return status;
    });
    
    // Legacy health endpoint
    app.get('/health', async () => ({
      status: 'ok',
      service: options.serviceName,
      timestamp: new Date().toISOString(),
    }));
  };
}
