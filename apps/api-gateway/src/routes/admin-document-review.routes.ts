import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { services } from '../config/services';
import { requireRole } from '../auth/role-guard';
import { validateRequest, objectIdSchema } from '../plugins/validation';
import { Role } from '@veridex/roles-permissions';
import { z } from 'zod';

// ================== SCHEMAS ==================

const documentIdParamsSchema = z.object({
  id: objectIdSchema,
}).strict();

const adminReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED']).optional(),
  complianceStatus: z.enum(['COMPLIANT', 'NON_COMPLIANT']).optional(),
  documentType: z.string().optional(),
  organizationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
  sortBy: z.enum(['createdAt', 'complianceScore', 'documentType']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

const adminReviewDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'FLAG']),
  reviewNote: z.string().min(1).max(1000),
  flagReason: z.string().max(500).optional(),
}).strict();

const adminOverrideSchema = z.object({
  newStatus: z.enum(['COMPLIANT', 'NON_COMPLIANT']),
  justification: z.string().min(10).max(2000),
  supportingDocumentIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(),
}).strict();

// ================== HELPERS ==================

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

async function proxyToCompliance(
  request: FastifyRequest,
  reply: FastifyReply,
  method: string,
  path: string
) {
  const url = `${services.compliance}${path}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-id': request.id,
  };
  
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

// ================== ROUTES ==================

export async function adminDocumentReviewRoutes(app: FastifyInstance) {
  /**
   * GET /admin/documents/review - List documents pending admin review
   * 
   * Returns documents that:
   * - Have passed automated extraction
   * - Have been evaluated by compliance engine
   * - Are marked COMPLIANT and await admin approval
   * 
   * Admin Role: ADMIN only
   */
  app.get('/admin/documents/review', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: adminReviewQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToDocument(request, reply, 'GET', `/admin/review${qs}`);
  });

  /**
   * GET /admin/documents/review/:id - Get document review details
   * 
   * Returns:
   * - Document metadata
   * - Extracted fields
   * - Compliance evaluation result
   * - Previous review history
   * 
   * Admin CANNOT see raw file content directly - only extracted summary
   */
  app.get('/admin/documents/review/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: documentIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToDocument(request, reply, 'GET', `/admin/review/${params.id}`);
  });

  /**
   * POST /admin/documents/review/:id/decision - Submit admin review decision
   * 
   * Possible decisions:
   * - APPROVE: Document is approved, product compliance is updated
   * - REJECT: Document is rejected with reason, merchant is notified
   * - FLAG: Document is flagged for further investigation
   * 
   * Admin Role: ADMIN only
   */
  app.post('/admin/documents/review/:id/decision', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({
      params: documentIdParamsSchema,
      body: adminReviewDecisionSchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToDocument(request, reply, 'POST', `/admin/review/${params.id}/decision`);
  });

  /**
   * POST /admin/documents/:id/compliance-override - Override compliance decision
   * 
   * REQUIRES JUSTIFICATION
   * 
   * Allows admin to override a compliance decision with:
   * - Detailed justification (minimum 10 characters)
   * - Optional supporting document IDs
   * 
   * This creates an audit trail entry
   * 
   * Admin Role: ADMIN only
   */
  app.post('/admin/documents/:id/compliance-override', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({
      params: documentIdParamsSchema,
      body: adminOverrideSchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToCompliance(request, reply, 'POST', `/admin/override/${params.id}`);
  });

  /**
   * GET /admin/documents/stats - Get document processing statistics
   * 
   * Returns:
   * - Total documents by status
   * - Extraction success/failure rates
   * - Compliance pass/fail rates
   * - Average processing time
   * - Pending review count
   */
  app.get('/admin/documents/stats', {
    preHandler: requireRole([Role.ADMIN]),
  }, async (request, reply) => {
    return proxyToDocument(request, reply, 'GET', '/admin/stats');
  });

  /**
   * GET /admin/documents/rejected - List all rejected documents
   * 
   * Includes both:
   * - Auto-rejected (compliance failure)
   * - Admin-rejected documents
   */
  app.get('/admin/documents/rejected', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: adminReviewQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToDocument(request, reply, 'GET', `/admin/rejected${qs}`);
  });

  /**
   * GET /admin/documents/extraction-failures - List extraction failures
   * 
   * Documents where extraction failed - may need manual intervention
   */
  app.get('/admin/documents/extraction-failures', {
    preHandler: requireRole([Role.ADMIN]),
  }, async (request, reply) => {
    return proxyToDocument(request, reply, 'GET', '/documents/extraction/failed');
  });

  /**
   * POST /admin/documents/:id/retry-extraction - Retry document extraction
   * 
   * Allows admin to trigger re-extraction for failed documents
   */
  app.post('/admin/documents/:id/retry-extraction', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: documentIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToDocument(request, reply, 'POST', `/documents/${params.id}/retry-extraction`);
  });
}
