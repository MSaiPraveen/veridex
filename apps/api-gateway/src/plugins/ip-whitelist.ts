import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

/**
 * IP Whitelist Plugin for Admin Routes
 * 
 * Security layer that restricts admin API access to whitelisted IPs.
 * In production, this should be VPN/office IPs only.
 * 
 * Returns 404 (not 403) to hide admin route existence.
 */

// Parse whitelist from environment or use defaults
const ADMIN_IP_WHITELIST = (process.env.ADMIN_IP_WHITELIST || '')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

// In development, allow all IPs if no whitelist configured
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

/**
 * Check if an IP matches a CIDR range or exact IP
 */
function ipMatches(clientIp: string, pattern: string): boolean {
  // Handle exact match
  if (!pattern.includes('/')) {
    return clientIp === pattern;
  }

  // Handle CIDR notation
  const [network, bits] = pattern.split('/');
  const maskBits = parseInt(bits, 10);
  
  const clientParts = clientIp.split('.').map(Number);
  const networkParts = network.split('.').map(Number);
  
  if (clientParts.length !== 4 || networkParts.length !== 4) {
    return false;
  }

  // Convert to 32-bit integers
  const clientInt = clientParts.reduce((acc, part) => (acc << 8) + part, 0) >>> 0;
  const networkInt = networkParts.reduce((acc, part) => (acc << 8) + part, 0) >>> 0;
  
  // Create mask
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  
  return (clientInt & mask) === (networkInt & mask);
}

/**
 * Check if client IP is whitelisted for admin access
 */
function isIpWhitelisted(clientIp: string): boolean {
  // In development, allow all if no whitelist configured
  if (IS_DEVELOPMENT && ADMIN_IP_WHITELIST.length === 0) {
    return true;
  }

  // Always allow localhost in development
  if (IS_DEVELOPMENT && (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost')) {
    return true;
  }

  // Check against whitelist
  return ADMIN_IP_WHITELIST.some(pattern => ipMatches(clientIp, pattern));
}

/**
 * Get real client IP from request headers
 * Handles proxies, load balancers, etc.
 */
function getClientIp(request: FastifyRequest): string {
  // Check X-Forwarded-For header (from proxies/load balancers)
  const xForwardedFor = request.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor).split(',');
    return ips[0].trim();
  }

  // Check X-Real-IP header (nginx)
  const xRealIp = request.headers['x-real-ip'];
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
  }

  // Fall back to socket address
  return request.ip;
}

/**
 * Admin IP restriction hook
 * Call this in admin routes to enforce IP whitelist
 */
export async function requireAdminIp(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const clientIp = getClientIp(request);
  
  if (!isIpWhitelisted(clientIp)) {
    request.log.warn({ 
      clientIp, 
      path: request.url,
      event: 'ADMIN_ACCESS_BLOCKED' 
    }, 'Admin access blocked - IP not whitelisted');
    
    // Return 404 to hide admin existence
    return reply.status(404).send({ error: 'Not Found' });
  }

  request.log.info({ 
    clientIp, 
    path: request.url,
    event: 'ADMIN_ACCESS_ALLOWED' 
  }, 'Admin access allowed');
}

/**
 * Plugin to automatically check admin routes
 */
async function ipWhitelistPlugin(app: FastifyInstance) {
  // Add hook for all /admin routes
  app.addHook('preHandler', async (request, reply) => {
    // Only check admin routes
    if (!request.url.startsWith('/admin')) {
      return;
    }

    // Check X-Admin-Portal header (from admin frontend)
    const isAdminPortal = request.headers['x-admin-portal'] === 'true';
    if (!isAdminPortal && process.env.NODE_ENV === 'production') {
      request.log.warn({ 
        path: request.url,
        event: 'ADMIN_ACCESS_NO_HEADER' 
      }, 'Admin access without portal header');
      return reply.status(404).send({ error: 'Not Found' });
    }

    await requireAdminIp(request, reply);
  });
}

export default fp(ipWhitelistPlugin, {
  name: 'ip-whitelist',
  fastify: '4.x',
});

export { isIpWhitelisted, getClientIp };
