import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

/**
 * API Version Configuration
 */
export const API_VERSIONS = {
  CURRENT: 'v1',
  SUPPORTED: ['v1', 'v2'],
  DEPRECATED: [] as string[],
  SUNSET: {} as Record<string, Date>, // Version -> Sunset date
};

/**
 * Version-specific route handlers
 * Maps version -> original route path -> new handler or new path
 */
export type VersionTransform = {
  /**
   * Transform request for this version
   */
  transformRequest?: (request: FastifyRequest) => FastifyRequest;
  
  /**
   * Transform response for this version
   */
  transformResponse?: (response: unknown) => unknown;
  
  /**
   * Map to a different internal path
   */
  mapToPath?: string;
};

export type VersionConfig = {
  [path: string]: VersionTransform;
};

export const versionConfigs: Record<string, VersionConfig> = {
  v1: {
    // V1 is the current version, no transforms needed
  },
  v2: {
    // V2 example: different response format for products
    '/products': {
      transformResponse: (response: unknown) => {
        // V2 wraps products in an 'items' key instead of 'data'
        if (response && typeof response === 'object' && 'data' in response) {
          const { data, ...rest } = response as Record<string, unknown>;
          return { items: data, ...rest };
        }
        return response;
      },
    },
  },
};

/**
 * API Versioning Plugin
 * 
 * Supports two versioning strategies:
 * 1. URL prefix: /api/v1/products, /api/v2/products
 * 2. Header-based: X-API-Version: v1
 * 
 * Version resolution order:
 * 1. URL prefix (highest priority)
 * 2. X-API-Version header
 * 3. Accept header with version parameter
 * 4. Default to current version
 */
const apiVersionPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Add version property to request
  app.decorateRequest('apiVersion', API_VERSIONS.CURRENT);
  
  // Pre-parsing hook to extract and normalize version
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    let version = API_VERSIONS.CURRENT;
    
    // Check URL prefix first (e.g., /api/v1/products)
    const urlMatch = request.url.match(/^\/api\/(v\d+)\//);
    if (urlMatch) {
      version = urlMatch[1];
      // Store original URL for reference (can't modify request.url directly)
      (request as any).originalVersionedUrl = request.url;
    }
    
    // Check X-API-Version header
    const headerVersion = request.headers['x-api-version'];
    if (!urlMatch && headerVersion && typeof headerVersion === 'string') {
      if (API_VERSIONS.SUPPORTED.includes(headerVersion)) {
        version = headerVersion;
      }
    }
    
    // Check Accept header for version parameter
    // e.g., Accept: application/vnd.veridex.v1+json
    if (!urlMatch && !headerVersion) {
      const accept = request.headers.accept;
      if (accept) {
        const vndMatch = accept.match(/application\/vnd\.veridex\.(v\d+)\+json/);
        if (vndMatch && API_VERSIONS.SUPPORTED.includes(vndMatch[1])) {
          version = vndMatch[1];
        }
      }
    }
    
    // Validate version
    if (!API_VERSIONS.SUPPORTED.includes(version)) {
      return reply.status(400).send({
        error: 'Invalid API Version',
        message: `Version ${version} is not supported. Supported versions: ${API_VERSIONS.SUPPORTED.join(', ')}`,
        currentVersion: API_VERSIONS.CURRENT,
      });
    }
    
    // Check if version is deprecated
    if (API_VERSIONS.DEPRECATED.includes(version)) {
      reply.header('X-API-Deprecation-Warning', `API version ${version} is deprecated`);
      
      // Check sunset date
      const sunsetDate = API_VERSIONS.SUNSET[version];
      if (sunsetDate) {
        reply.header('Sunset', sunsetDate.toUTCString());
        
        if (new Date() > sunsetDate) {
          return reply.status(410).send({
            error: 'API Version Sunset',
            message: `Version ${version} has been retired as of ${sunsetDate.toISOString()}`,
            currentVersion: API_VERSIONS.CURRENT,
          });
        }
      }
    }
    
    // Set version on request
    (request as any).apiVersion = version;
    
    // Add version to response headers
    reply.header('X-API-Version', version);
  });
  
  // Response transformation hook
  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
    const version = (request as any).apiVersion || API_VERSIONS.CURRENT;
    const config = versionConfigs[version];
    
    if (!config) return payload;
    
    // Find matching path config
    const pathConfig = Object.entries(config).find(([path]) => 
      request.url.startsWith(path) || request.routeOptions?.url?.startsWith(path)
    );
    
    if (pathConfig && pathConfig[1].transformResponse) {
      try {
        const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const transformed = pathConfig[1].transformResponse(parsed);
        return JSON.stringify(transformed);
      } catch (e) {
        // If transformation fails, return original
        return payload;
      }
    }
    
    return payload;
  });
};

/**
 * Get version info endpoint handler
 */
export function getVersionInfo() {
  return {
    currentVersion: API_VERSIONS.CURRENT,
    supportedVersions: API_VERSIONS.SUPPORTED,
    deprecatedVersions: API_VERSIONS.DEPRECATED,
    sunsetDates: Object.fromEntries(
      Object.entries(API_VERSIONS.SUNSET).map(([v, d]) => [v, d.toISOString()])
    ),
    documentation: {
      v1: '/docs/v1',
      v2: '/docs/v2',
    },
  };
}

export default fp(apiVersionPlugin, {
  name: 'api-versioning',
  fastify: '4.x',
});
