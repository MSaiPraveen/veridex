import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { redis } from '../config/redis';

/**
 * Idempotency Key Header
 */
const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_PREFIX = 'idempotency:';
const DEFAULT_TTL_SECONDS = 86400; // 24 hours

/**
 * Stored idempotency record
 */
interface IdempotencyRecord {
  status: 'processing' | 'completed';
  requestHash: string;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Routes that require idempotency protection
 * POST/PUT/PATCH methods with side effects
 */
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH'];

/**
 * Routes that should be excluded from idempotency
 */
const EXCLUDED_ROUTES = [
  '/health',
  '/health/live',
  '/health/ready',
  '/auth/login',
  '/auth/refresh',
  '/api/version',
];

/**
 * Generate a hash of the request for comparison
 */
function hashRequest(request: FastifyRequest): string {
  const data = {
    method: request.method,
    url: request.url,
    body: request.body,
    userId: (request as any).user?.userId,
  };
  
  // Simple hash for comparison
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Idempotency Plugin
 * 
 * Prevents duplicate request processing using idempotency keys.
 * 
 * How it works:
 * 1. Client sends request with `Idempotency-Key` header
 * 2. Server checks if key exists in Redis
 * 3. If exists and processing: return 409 Conflict
 * 4. If exists and completed: return cached response
 * 5. If new: mark as processing, execute, cache response
 * 
 * Headers:
 * - Idempotency-Key: Client-provided unique key (UUID recommended)
 * - Idempotency-Replay: 'true' if returning cached response
 * 
 * @example
 * POST /orders
 * Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
 */
const idempotencyPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Add hook before processing
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip non-protected methods
    if (!PROTECTED_METHODS.includes(request.method)) {
      return;
    }
    
    // Skip excluded routes
    if (EXCLUDED_ROUTES.some((route) => request.url.startsWith(route))) {
      return;
    }
    
    // Check for idempotency key
    const idempotencyKey = request.headers[IDEMPOTENCY_HEADER];
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      // No key provided - proceed normally
      // In strict mode, you might want to require the key for certain routes
      return;
    }
    
    // Validate key format (should be UUID or similar)
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return reply.status(400).send({
        error: 'Invalid Idempotency Key',
        message: 'Idempotency-Key must be between 8 and 128 characters',
      });
    }
    
    const redisKey = `${IDEMPOTENCY_PREFIX}${idempotencyKey}`;
    
    try {
      // Check if key exists
      const existing = await redis.get(redisKey);
      
      if (existing) {
        const record: IdempotencyRecord = JSON.parse(existing);
        
        // Verify request matches (prevent key reuse for different requests)
        const currentHash = hashRequest(request);
        if (record.requestHash !== currentHash) {
          return reply.status(422).send({
            error: 'Idempotency Key Mismatch',
            message: 'Idempotency key was used for a different request',
          });
        }
        
        if (record.status === 'processing') {
          // Request is still being processed
          return reply.status(409).send({
            error: 'Request In Progress',
            message: 'A request with this idempotency key is currently being processed',
          });
        }
        
        if (record.status === 'completed') {
          // Return cached response
          reply.header('Idempotency-Replay', 'true');
          
          if (record.headers) {
            for (const [key, value] of Object.entries(record.headers)) {
              if (key.toLowerCase() !== 'content-length') {
                reply.header(key, value);
              }
            }
          }
          
          return reply.status(record.statusCode || 200).send(
            record.body ? JSON.parse(record.body) : undefined
          );
        }
      }
      
      // New request - mark as processing
      const processingRecord: IdempotencyRecord = {
        status: 'processing',
        requestHash: hashRequest(request),
        createdAt: new Date().toISOString(),
      };
      
      // Use SET NX to prevent race conditions
      const set = await redis.set(
        redisKey, 
        JSON.stringify(processingRecord), 
        'EX', 
        DEFAULT_TTL_SECONDS,
        'NX'
      );
      
      if (!set) {
        // Another request beat us to it
        return reply.status(409).send({
          error: 'Request In Progress',
          message: 'A request with this idempotency key is currently being processed',
        });
      }
      
      // Store key on request for response hook
      (request as any).idempotencyKey = idempotencyKey;
      (request as any).idempotencyRedisKey = redisKey;
      
    } catch (error) {
      // Redis error - log but don't block request
      request.log.warn({ err: error }, 'Idempotency check failed');
    }
  });
  
  // Add hook to cache response
  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
    const redisKey = (request as any).idempotencyRedisKey;
    if (!redisKey) {
      return payload;
    }
    
    try {
      // Cache the response
      const record: IdempotencyRecord = {
        status: 'completed',
        requestHash: hashRequest(request),
        statusCode: reply.statusCode,
        headers: reply.getHeaders() as Record<string, string>,
        body: typeof payload === 'string' ? payload : JSON.stringify(payload),
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      
      await redis.set(
        redisKey, 
        JSON.stringify(record), 
        'EX', 
        DEFAULT_TTL_SECONDS
      );
      
    } catch (error) {
      request.log.warn({ err: error }, 'Failed to cache idempotent response');
    }
    
    return payload;
  });
  
  // Add hook to clean up on error
  app.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const redisKey = (request as any).idempotencyRedisKey;
    if (!redisKey) {
      return;
    }
    
    try {
      // On error, we should either:
      // 1. Delete the key (allowing retry)
      // 2. Or cache the error response
      // We'll delete the key to allow retry
      await redis.del(redisKey);
    } catch (redisError) {
      request.log.warn({ err: redisError }, 'Failed to clean up idempotency key');
    }
  });
};

export default fp(idempotencyPlugin, {
  name: 'idempotency',
  fastify: '4.x',
});
