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
import fastifyMultipart from '@fastify/multipart';
import FormData from 'form-data';

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
    'x-request-id': request.id,
  };
  
  // Only set Content-Type for methods that have a body
  if (method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }
  
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
  // Register multipart support for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max
      files: 1,
    },
  });

  // File upload route - parse multipart and forward to document service
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
    
    try {
      // Parse the multipart form data
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Read the file content
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);
      
      // Create a new FormData to forward to document service
      const formData = new FormData();
      
      // IMPORTANT: Add text fields BEFORE the file
      for (const [key, field] of Object.entries(data.fields)) {
        if (field && typeof field === 'object' && 'value' in field) {
          const fieldValue = (field as { value: string }).value;
          formData.append(key, fieldValue);
          request.log.info({ field: key, value: fieldValue }, 'Adding form field');
        }
      }
      
      // Add the file last
      formData.append('file', fileBuffer, {
        filename: data.filename,
        contentType: data.mimetype,
      });
      
      request.log.info({
        filename: data.filename,
        mimetype: data.mimetype,
        fileSize: fileBuffer.length,
        fields: Object.keys(data.fields),
        userId: user.sub,
        orgId: user.orgId,
      }, 'Forwarding document upload');

      // Build headers
      const headers: Record<string, string> = {
        'x-request-id': request.id,
        'x-user-id': user.sub || '',
        'x-user-role': user.role || 'MERCHANT',
        ...formData.getHeaders(),
      };
      
      if (user.orgId) {
        headers['x-organization-id'] = user.orgId;
      }

      // Get the complete form data buffer and length
      const formBuffer = formData.getBuffer();
      headers['content-length'] = String(formBuffer.length);

      // Forward to document service
      const { statusCode, body } = await undiciRequest(url, {
        method: 'POST',
        headers,
        body: formBuffer,
      });

      const responseData = await body.json();
      request.log.info({ statusCode, response: responseData }, 'Document upload response');
      return reply.status(statusCode).send(responseData);
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

  // Get documents by product ID - MERCHANT and ADMIN only
  app.get('/products/:productId/documents', {
    preHandler: merchantOrAdmin,
  }, async (request, reply) => {
    const params = request.params as { productId: string };
    return proxyToDocument(request, reply, 'GET', `/products/${params.productId}/documents`);
  });

  // Get document content/preview - returns the actual file content
  // Useful for displaying PDFs, images in the browser
  app.get('/documents/:id/content', {
    preHandler: merchantOrAdmin,
    preValidation: validateRequest({ params: documentIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    
    // First get document metadata to determine file type
    const docUrl = `${services.document}/documents/${params.id}`;
    const docResponse = await fetch(docUrl, {
      headers: {
        'x-request-id': request.id,
        'x-user-id': request.headers['x-user-id'] as string || '',
        'x-user-role': request.headers['x-user-role'] as string || '',
        'x-organization-id': request.headers['x-organization-id'] as string || '',
      },
    });
    
    if (!docResponse.ok) {
      return reply.status(docResponse.status).send({ error: 'Document not found' });
    }
    
    const docData = await docResponse.json() as { success: boolean; data: { mimeType: string; fileName: string } };
    
    // Stream the file content
    const downloadUrl = `${services.document}/documents/${params.id}/download`;
    const fileResponse = await fetch(downloadUrl, {
      headers: {
        'x-request-id': request.id,
        'x-user-id': request.headers['x-user-id'] as string || '',
        'x-user-role': request.headers['x-user-role'] as string || '',
        'x-organization-id': request.headers['x-organization-id'] as string || '',
      },
    });
    
    if (!fileResponse.ok) {
      return reply.status(fileResponse.status).send({ error: 'Failed to retrieve document content' });
    }
    
    // Set appropriate headers for inline display
    reply.header('Content-Type', docData.data?.mimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `inline; filename="${docData.data?.fileName || 'document'}"`);
    reply.header('Cache-Control', 'private, max-age=3600');
    
    // Stream the response
    const buffer = await fileResponse.arrayBuffer();
    return reply.send(Buffer.from(buffer));
  });
}
