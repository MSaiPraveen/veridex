import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { request as undiciRequest } from 'undici';
import { services } from '../config/services';
import { requireAuth, requireRole } from '../auth/role-guard';
import { verifyToken } from '../auth/jwt';
import { validateRequest, objectIdSchema } from '../plugins/validation';
import {
  uploadDocumentBodySchema,
  updateDocumentBodySchema,
  documentQuerySchema,
  updateDocumentStatusBodySchema,
} from '../schemas/document.schemas';
import { z } from 'zod';
import { Role } from '@veridex/roles-permissions';

// Document ID param schema
const documentIdParamsSchema = z.object({
  id: objectIdSchema,
}).strict();

// CRITICAL: Consumers CANNOT access documents - only MERCHANT and ADMIN
const merchantOrAdmin = requireRole([Role.MERCHANT, Role.ADMIN]);

// Helper to proxy request to document service
async function proxyToDocument(
  request: FastifyRequest,
  reply: FastifyReply,
  method: string,
  path: string
) {
  const url = `${services.document}${path}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-id': request.id,
  };
  
  // Forward auth headers
  if (request.headers.authorization) {
    headers['Authorization'] = request.headers.authorization;
  }
  if (request.headers['x-user-id']) {
    headers['x-user-id'] = request.headers['x-user-id'] as string;
  }
  if (request.headers['x-user-role']) {
    headers['x-user-role'] = request.headers['x-user-role'] as string;
  }
  if (request.headers['x-organization-id']) {
    headers['x-organization-id'] = request.headers['x-organization-id'] as string;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(request.body) : undefined,
  });

  const data = await response.json();
  return reply.status(response.status).send(data);
}

// Build query string from validated query object
function buildQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function documentRoutes(app: FastifyInstance) {
  // Register content-type parser for multipart/form-data
  // Collect the raw body as a buffer to forward it properly
  app.addContentTypeParser('multipart/form-data', function (request, payload, done) {
    const chunks: Buffer[] = [];
    payload.on('data', (chunk: Buffer) => chunks.push(chunk));
    payload.on('end', () => {
      done(null, Buffer.concat(chunks));
    });
    payload.on('error', done);
  });

  // File upload route - forward multipart data to document service
  // Note: We manually verify JWT here because the content-type parser may interfere with hook order
  app.post('/documents/upload', async (request, reply) => {
    // Manual JWT verification for multipart requests
    const auth = request.headers.authorization;
    if (!auth) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }
    
    const token = auth.replace('Bearer ', '');
    let user;
    try {
      user = verifyToken(token);
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
    }
    
    const url = `${services.document}/documents`;
    
    const headers: Record<string, string> = {
      'x-request-id': request.id,
      'x-user-id': user.sub,
      'x-user-role': user.role,
    };
    
    // Add organization ID if user has one
    if (user.orgId) {
      headers['x-organization-id'] = user.orgId;
    }
    
    // Forward content-type as-is (includes boundary for multipart)
    if (request.headers['content-type']) {
      headers['content-type'] = request.headers['content-type'];
    }

    try {
      // Forward the raw body buffer to document service
      const { statusCode, body } = await undiciRequest(url, {
        method: 'POST',
        headers,
        body: request.body as Buffer,
      });

      const data = await body.json();
      return reply.status(statusCode).send(data);
    } catch (error) {
      request.log.error(error, 'Document upload proxy error');
      return reply.status(500).send({ 
        error: 'Upload failed', 
        message: 'Failed to forward upload to document service' 
      });
    }
  });

  // List documents - MERCHANT and ADMIN only (Consumers CANNOT access)
  app.get('/documents', {
    preHandler: merchantOrAdmin,
    preValidation: validateRequest({ query: documentQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToDocument(request, reply, 'GET', `/documents${qs}`);
  });

  // Get single document - MERCHANT and ADMIN only
  app.get('/documents/:id', {
    preHandler: merchantOrAdmin,
    preValidation: validateRequest({ params: documentIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToDocument(request, reply, 'GET', `/documents/${params.id}`);
  });

  // Upload document (metadata - actual file upload handled separately)
  app.post('/documents', {
    preHandler: merchantOrAdmin,
    preValidation: validateRequest({ body: uploadDocumentBodySchema }),
  }, async (request, reply) => {
    return proxyToDocument(request, reply, 'POST', '/documents');
  });

  // Update document metadata - MERCHANT and ADMIN only
  app.put('/documents/:id', {
    preHandler: merchantOrAdmin,
    preValidation: validateRequest({
      params: documentIdParamsSchema,
      body: updateDocumentBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToDocument(request, reply, 'PUT', `/documents/${params.id}`);
  });

  // Update document status - MERCHANT and ADMIN only
  app.patch('/documents/:id/status', {
    preHandler: merchantOrAdmin,
    preValidation: validateRequest({
      params: documentIdParamsSchema,
      body: updateDocumentStatusBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToDocument(request, reply, 'PATCH', `/documents/${params.id}/status`);
  });

  // Delete document - MERCHANT and ADMIN only
  app.delete('/documents/:id', {
    preHandler: merchantOrAdmin,
    preValidation: validateRequest({ params: documentIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToDocument(request, reply, 'DELETE', `/documents/${params.id}`);
  });

  // Download document - MERCHANT and ADMIN only
  app.get('/documents/:id/download', {
    preHandler: merchantOrAdmin,
    preValidation: validateRequest({ params: documentIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToDocument(request, reply, 'GET', `/documents/${params.id}/download`);
  });
}
