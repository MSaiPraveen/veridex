import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';

/**
 * Security Headers Plugin
 * 
 * Adds comprehensive security headers using Helmet:
 * - Content-Security-Policy
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - X-XSS-Protection (legacy browsers)
 * - Strict-Transport-Security (HSTS)
 * - Referrer-Policy
 * - Permissions-Policy
 */
const helmetPluginImpl: FastifyPluginAsync = async (app) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Allow framing from frontend and admin portals for document preview
  const frameAncestors = isProduction
    ? ["'self'", process.env.FRONTEND_URL, process.env.ADMIN_FRONTEND_URL].filter(Boolean)
    : ["'self'", 'http://localhost:3000', 'http://localhost:4000'];

  // Use type assertion to handle Fastify version compatibility
  await app.register(helmet as any, {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for some frameworks
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: frameAncestors,
      },
    },
    
    // Prevent MIME type sniffing
    noSniff: true,
    
    // Prevent clickjacking - set to sameorigin to allow document preview
    frameguard: {
      action: 'sameorigin',
    },
    
    // XSS protection for legacy browsers
    xssFilter: true,
    
    // Hide X-Powered-By header
    hidePoweredBy: true,
    
    // HTTP Strict Transport Security
    hsts: process.env.NODE_ENV === 'production' 
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false, // Disable HSTS in development
    
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    
    // Don't cache sensitive pages
    noCache: false, // We handle caching per-route
    
    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // May break some legitimate embeds
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    
    // Origin-Agent-Cluster
    originAgentCluster: true,
    
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    
    // Download options
    ieNoOpen: true,
    
    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  });

  // Add additional custom security headers
  app.addHook('onSend', async (request, reply, payload) => {
    // Permissions-Policy (replaces Feature-Policy)
    reply.header('Permissions-Policy', 
      'accelerometer=(), autoplay=(), camera=(), ' +
      'cross-origin-isolated=(), display-capture=(), ' +
      'encrypted-media=(), fullscreen=(), geolocation=(), ' +
      'gyroscope=(), keyboard-map=(), magnetometer=(), ' +
      'microphone=(), midi=(), payment=(), picture-in-picture=(), ' +
      'publickey-credentials-get=(), screen-wake-lock=(), ' +
      'sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()'
    );
    
    // Clear-Site-Data on logout (handled in logout route)
    // Cache-Control for API responses
    if (!reply.hasHeader('Cache-Control')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }
    
    return payload;
  });
};

export const helmetPlugin = fp(helmetPluginImpl, {
  name: 'helmet-security',
});
