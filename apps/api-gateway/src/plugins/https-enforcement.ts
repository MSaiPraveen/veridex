import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

/**
 * HTTPS Enforcement Plugin
 * 
 * Redirects HTTP requests to HTTPS in production.
 * 
 * Features:
 * - Only active in production (NODE_ENV=production)
 * - Respects X-Forwarded-Proto header for load balancers/proxies
 * - Excludes health check endpoints
 * - Includes HSTS preload header
 */

const EXCLUDED_PATHS = [
  '/health',
  '/health/live',
  '/health/ready',
];

const httpsEnforcementPluginImpl: FastifyPluginAsync = async (app) => {
  // Only enforce HTTPS in production
  if (process.env.NODE_ENV !== 'production') {
    app.log.info('HTTPS enforcement disabled (not in production)');
    return;
  }

  // Allow opt-out for internal services
  if (process.env.DISABLE_HTTPS_REDIRECT === 'true') {
    app.log.warn('HTTPS enforcement disabled via DISABLE_HTTPS_REDIRECT');
    return;
  }

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?')[0];
    
    // Skip health checks (needed for load balancer health probes over HTTP)
    if (EXCLUDED_PATHS.some(p => path.startsWith(p))) {
      return;
    }

    // Check if request is already HTTPS
    // In production behind a load balancer, check X-Forwarded-Proto
    const proto = request.headers['x-forwarded-proto'] || 
                  (request.socket && (request.socket as any).encrypted ? 'https' : 'http');
    
    if (proto !== 'https') {
      const host = request.headers['x-forwarded-host'] || request.headers.host || '';
      const redirectUrl = `https://${host}${request.url}`;
      
      // Use 301 for permanent redirect (better for SEO and caching)
      // Use 307 for temporary redirect that preserves method and body
      const statusCode = request.method === 'GET' || request.method === 'HEAD' ? 301 : 307;
      
      reply.header('Location', redirectUrl);
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      
      return reply.status(statusCode).send({
        success: false,
        error: 'HTTPS required',
        redirect: redirectUrl,
      });
    }
  });

  app.log.info('HTTPS enforcement enabled');
};

export const httpsEnforcementPlugin = fp(httpsEnforcementPluginImpl, {
  name: 'https-enforcement',
  // Run before other plugins
  dependencies: [],
});
