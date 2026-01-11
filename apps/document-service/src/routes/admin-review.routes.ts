import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DocumentService } from '../services/document.service';
import { DocumentRepo, DocumentQueryOptions } from '../repositories/document.repo';
import { ValidationError, ForbiddenError, NotFoundError } from '../errors/service.errors';
import { 
  emitDocumentRejected, 
  emitAdminReviewRequired,
} from '../events/document.producer';

// ================== SCHEMAS ==================

const adminReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED']).optional(),
  complianceStatus: z.enum(['COMPLIANT', 'NON_COMPLIANT']).optional(),
  documentType: z.string().optional(),
  organizationId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'complianceScore', 'documentType']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const adminDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'FLAG']),
  reviewNote: z.string().min(1).max(1000),
  flagReason: z.string().max(500).optional(),
});

// Helper for Zod validation
function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ValidationError(message);
  }
  return result.data;
}

// ================== ROUTES ==================

export async function adminReviewRoutes(app: FastifyInstance) {
  /**
   * GET /admin/review - List documents pending admin review
   * 
   * Returns documents that have:
   * - Completed extraction successfully
   * - Been evaluated by compliance engine
   * - Status = COMPLIANT (ready for admin approval)
   */
  app.get('/admin/review', async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.headers['x-user-role'] as string;
    
    if (userRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    const query = validate(adminReviewQuerySchema, request.query);

    // Query documents that are ready for review
    const options: DocumentQueryOptions = {
      page: query.page,
      limit: query.limit,
      extractionStatus: 'SUCCESS',
      status: 'ACTIVE',
      sortBy: query.sortBy as any,
      sortOrder: query.sortOrder,
    };

    if (query.documentType) {
      options.type = query.documentType as any;
    }

    if (query.organizationId) {
      options.organizationId = query.organizationId;
    }

    const result = await DocumentRepo.findAll(options);

    // Enrich with compliance data would happen here in a real implementation
    // For now, return the documents with a reviewStatus field
    const enrichedData = result.data.map(doc => ({
      ...doc,
      reviewStatus: 'PENDING_REVIEW',
      // In production, join with compliance results
    }));

    return reply.send({
      success: true,
      data: enrichedData,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    });
  });

  /**
   * GET /admin/review/:id - Get detailed review information for a document
   * 
   * Returns:
   * - Document metadata
   * - Extracted fields (NOT raw file)
   * - Compliance evaluation result
   * - Review history
   */
  app.get('/admin/review/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userRole = request.headers['x-user-role'] as string;
    
    if (userRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    const { id } = request.params;
    const doc = await DocumentService.getById(id);

    // Build review summary - Admin sees extracted data, NOT raw content
    const reviewSummary = {
      documentId: doc._id,
      name: doc.name,
      type: doc.type,
      organizationId: doc.organizationId,
      ownerId: doc.ownerId,
      productId: doc.productId,
      
      // File info (but not the file itself)
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      uploadedAt: doc.createdAt,
      
      // Extraction results - this is what admin reviews
      extractionStatus: doc.extractionStatus,
      extractedFields: doc.extracted,
      extractedAt: doc.extractedAt,
      extractionConfidence: doc.extracted?.confidence,
      
      // Review status
      reviewStatus: 'PENDING_REVIEW',
      reviewHistory: [], // Would be populated from a review log collection
      
      // Compliance info (would join with compliance service in production)
      complianceStatus: null,
      complianceScore: null,
      complianceReasons: [],
    };

    return reply.send({ success: true, data: reviewSummary });
  });

  /**
   * POST /admin/review/:id/decision - Submit admin review decision
   * 
   * Actions:
   * - APPROVE: Document approved, updates product compliance
   * - REJECT: Document rejected with reason, notifies merchant
   * - FLAG: Flags for further investigation
   */
  app.post('/admin/review/:id/decision', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userRole = request.headers['x-user-role'] as string;
    const userId = request.headers['x-user-id'] as string;
    
    if (userRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    const { id } = request.params;
    const input = validate(adminDecisionSchema, request.body);
    
    const doc = await DocumentService.getById(id);

    // Process decision
    switch (input.decision) {
      case 'APPROVE':
        await DocumentRepo.update(id, {
          metadata: {
            ...doc.metadata,
            reviewStatus: 'APPROVED',
            reviewedBy: userId,
            reviewedAt: new Date(),
            reviewNote: input.reviewNote,
          },
        });
        
        // Emit event for downstream processing
        // In production, this would update product compliance status
        break;

      case 'REJECT':
        await DocumentRepo.update(id, {
          status: 'ARCHIVED', // Move to archived state
          metadata: {
            ...doc.metadata,
            reviewStatus: 'REJECTED',
            reviewedBy: userId,
            reviewedAt: new Date(),
            reviewNote: input.reviewNote,
          },
        });

        // Emit rejection event to notify merchant
        await emitDocumentRejected({
          documentId: doc._id.toString(),
          ownerId: doc.ownerId.toString(),
          organizationId: doc.organizationId.toString(),
          productId: doc.productId?.toString(),
          fileName: doc.fileName,
          reason: 'COMPLIANCE_VIOLATION',
          details: `Admin rejected: ${input.reviewNote}`,
        });
        break;

      case 'FLAG':
        await DocumentRepo.update(id, {
          metadata: {
            ...doc.metadata,
            reviewStatus: 'FLAGGED',
            flaggedBy: userId,
            flaggedAt: new Date(),
            flagReason: input.flagReason || input.reviewNote,
          },
        });
        break;
    }

    const updatedDoc = await DocumentService.getById(id);

    return reply.send({
      success: true,
      data: updatedDoc,
      message: `Document ${input.decision.toLowerCase()}ed successfully`,
    });
  });

  /**
   * GET /admin/stats - Get document processing statistics
   */
  app.get('/admin/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.headers['x-user-role'] as string;
    
    if (userRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    // Get counts by status
    const [
      totalActive,
      pendingExtraction,
      failedExtraction,
      successfulExtraction,
    ] = await Promise.all([
      DocumentRepo.countByStatus('ACTIVE'),
      DocumentRepo.countByExtractionStatus('PENDING'),
      DocumentRepo.countByExtractionStatus('FAILED'),
      DocumentRepo.countByExtractionStatus('SUCCESS'),
    ]);

    return reply.send({
      success: true,
      data: {
        total: totalActive,
        extraction: {
          pending: pendingExtraction,
          processing: 0, // Would track in-progress
          success: successfulExtraction,
          failed: failedExtraction,
        },
        review: {
          pending: successfulExtraction, // All successful extractions need review
          approved: 0, // Would track from metadata
          rejected: 0,
          flagged: 0,
        },
        compliance: {
          compliant: 0, // Would join with compliance service
          nonCompliant: 0,
          pending: 0,
        },
      },
    });
  });

  /**
   * GET /admin/rejected - List rejected documents
   */
  app.get('/admin/rejected', async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.headers['x-user-role'] as string;
    
    if (userRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    const query = validate(adminReviewQuerySchema, request.query);

    const options: DocumentQueryOptions = {
      page: query.page,
      limit: query.limit,
      status: 'ARCHIVED', // Rejected docs are archived
      sortBy: query.sortBy as any,
      sortOrder: query.sortOrder,
    };

    const result = await DocumentRepo.findAll(options);

    // Filter to only show documents with rejection metadata
    const rejectedDocs = result.data.filter(doc => 
      doc.metadata?.reviewStatus === 'REJECTED' || 
      doc.extractionStatus === 'FAILED'
    );

    return reply.send({
      success: true,
      data: rejectedDocs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    });
  });
}
