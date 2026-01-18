import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { redis } from '../config/redis';

/**
 * Rate Limiting Configuration
 */
interface RateLimitConfig {
  /** Time window in seconds */
  windowSec: number;
  /** Maximum requests per window */
  maxRequests: number;
  /** Skip rate limiting for certain paths */
  skipPaths?: string[];
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowSec: 60,
  maxRequests: 100,
  skipPaths: ['/health', '/health/live', '/health/ready'],
};

// Stricter limits for specific endpoints
const ENDPOINT_LIMITS: Record<string, { windowSec: number; maxRequests: number }> = {
  '/auth/login': { windowSec: 60, maxRequests: 10 },
  '/auth/register': { windowSec: 60, maxRequests: 5 },
  '/auth/refresh': { windowSec: 60, maxRequests: 30 },
  '/auth/forgot-password': { windowSec: 60, maxRequests: 3 },
};

/**
 * Get rate limit key for request
 * Uses IP + optional user ID for authenticated requests
 */
function getRateLimitKey(req: FastifyRequest, endpoint?: string): string {
  const ip = req.ip || 'unknown';
  const userId = (req as any).user?.sub || 'anonymous';
  const path = endpoint || 'global';
  return `rl:${path}:${ip}:${userId}`;
}

/**
 * Rate Limiting Plugin
 * 
 * Features:
 * - Redis-based distributed rate limiting
 * - Per-endpoint rate limits
 * - Rate limit headers in responses
 * - Skip paths for health checks
 * - Proper 429 HTTP response
 */
const rateLimitPluginImpl: FastifyPluginAsync<Partial<RateLimitConfig>> = async (app, opts) => {
  const config = { ...DEFAULT_CONFIG, ...opts };

  // Add rate limit headers hook
  app.addHook('onSend', async (request, reply, payload) => {
    const remaining = (request as any).rateLimitRemaining;
    const limit = (request as any).rateLimitMax;
    const reset = (request as any).rateLimitReset;

    if (remaining !== undefined) {
      reply.header('X-RateLimit-Limit', String(limit));
      reply.header('X-RateLimit-Remaining', String(Math.max(0, remaining)));
      reply.header('X-RateLimit-Reset', String(reset));
    }

    return payload;
  });

  // Main rate limiting hook
  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const path = req.url.split('?')[0]; // Remove query params

    // Skip rate limiting for certain paths
    if (config.skipPaths?.some(skip => path.startsWith(skip))) {
      return;
    }

    // Get limits for this endpoint (or use defaults)
    const endpointLimits = ENDPOINT_LIMITS[path];
    const windowSec = endpointLimits?.windowSec || config.windowSec;
    const maxRequests = endpointLimits?.maxRequests || config.maxRequests;

    // Get or create rate limit key
    const key = getRateLimitKey(req, endpointLimits ? path : undefined);

    try {
      // Increment counter
      const count = await redis.incr(key);

      // Set expiry on first request
      if (count === 1) {
        await redis.expire(key, windowSec);
      }

      // Get TTL for reset header
      const ttl = await redis.ttl(key);
      const resetTime = Math.floor(Date.now() / 1000) + Math.max(ttl, 0);

      // Store for headers
      (req as any).rateLimitMax = maxRequests;
      (req as any).rateLimitRemaining = maxRequests - count;
      (req as any).rateLimitReset = resetTime;

      // Check if rate limit exceeded
      if (count > maxRequests) {
        reply.header('Retry-After', String(Math.max(ttl, 1)));
        return reply.status(429).send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.max(ttl, 1),
          },
        });
      }
    } catch (error) {
      // Log error but don't block request if Redis fails
      req.log.error({ error }, 'Rate limiting error');
      // Continue without rate limiting
    }
  });
};

export const rateLimitPlugin = fp(rateLimitPluginImpl, {
  name: 'rate-limit',
});

