import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DocumentService } from '../services/document.service';
import { DocumentRepo, DocumentQueryOptions } from '../repositories/document.repo';
import { ValidationError, ForbiddenError, NotFoundError } from '../errors/service.errors';
import { 
  emitDocumentRejected, 
  emitAdminReviewRequired,
  emitDocumentReviewDecision,
} from '../events/document.producer';

// ================== HELPER FUNCTIONS ==================

// Admin roles that are allowed to access review endpoints
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_REVIEWER'];

function isAdminRole(role: string | undefined): boolean {
  return ADMIN_ROLES.includes((role || '').toUpperCase());
}

// ================== SCHEMAS ==================

const adminReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ALL', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED']).optional(),
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
    
    if (!isAdminRole(userRole)) {
      throw new ForbiddenError('Admin access required');
    }

    const query = validate(adminReviewQuerySchema, request.query);

    // Query documents that are ready for review
    // Note: We don't filter by status=ACTIVE to include all documents in review
    const options: DocumentQueryOptions = {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy as any,
      sortOrder: query.sortOrder,
    };

    // Filter by reviewStatus - 'ALL' or undefined shows all statuses
    if (query.status && query.status !== 'ALL') {
      options.reviewStatus = query.status as any;
    }
    // If no status specified, show all documents (no filter)
    
    if (query.complianceStatus) {
      options.complianceStatus = query.complianceStatus as any;
    }

    if (query.documentType) {
      options.type = query.documentType as any;
    }

    if (query.organizationId) {
      options.organizationId = query.organizationId;
    }

    const result = await DocumentRepo.findAll(options);

    // Transform documents to match admin portal expected format
    const documents = result.data.map(doc => ({
      id: doc._id?.toString() || (doc as any).id,
      fileName: doc.fileName || doc.name,
      originalName: doc.name,
      documentType: doc.type,
      organizationId: doc.organizationId?.toString(),
      organizationName: undefined, // Would need to join with org service
      productId: doc.productId?.toString(),
      productName: undefined, // Would need to join with product service
      status: doc.reviewStatus || 'PENDING_REVIEW',
      complianceStatus: doc.complianceStatus || 'PENDING',
      complianceScore: doc.complianceScore,
      complianceReasons: doc.complianceReasons,
      uploadedAt: doc.createdAt,
      uploadedBy: doc.ownerId?.toString(),
      reviewedAt: doc.reviewedAt,
      reviewedBy: doc.reviewedBy,
      reviewNote: doc.reviewNote,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      extractedData: doc.extracted,
      extractionStatus: doc.extractionStatus,
    }));

    // Calculate stats from actual data
    const stats = {
      total: result.total,
      pendingReview: result.data.filter(d => !d.reviewStatus || d.reviewStatus === 'PENDING_REVIEW').length,
      approved: result.data.filter(d => d.reviewStatus === 'APPROVED').length,
      rejected: result.data.filter(d => d.reviewStatus === 'REJECTED').length,
      flagged: result.data.filter(d => d.reviewStatus === 'FLAGGED').length,
      extractionFailed: result.data.filter(d => d.extractionStatus === 'FAILED').length,
    };

    return reply.send({
      success: true,
      data: {
        documents,
        total: result.total,
        totalPages: result.totalPages,
        stats,
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
    
    if (!isAdminRole(userRole)) {
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
    
    if (!isAdminRole(userRole)) {
      throw new ForbiddenError('Admin access required');
    }

    const { id } = request.params;
    const input = validate(adminDecisionSchema, request.body);
    
    const doc = await DocumentService.getById(id);

    // Process decision - use dedicated fields instead of metadata
    switch (input.decision) {
      case 'APPROVE':
        await DocumentRepo.update(id, {
          reviewStatus: 'APPROVED',
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote,
          complianceStatus: 'COMPLIANT',
        });
        
        // Emit event for downstream processing - updates product compliance status
        await emitDocumentReviewDecision({
          documentId: doc._id.toString(),
          productId: doc.productId?.toString(),
          organizationId: doc.organizationId?.toString() || '',
          documentType: doc.type,
          decision: 'APPROVED',
          reviewedBy: userId,
          reviewNote: input.reviewNote,
        });
        break;

      case 'REJECT':
        await DocumentRepo.update(id, {
          reviewStatus: 'REJECTED',
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote,
          complianceStatus: 'NON_COMPLIANT',
          status: 'ARCHIVED', // Move to archived state
        });

        // Emit rejection event to notify merchant
        await emitDocumentRejected({
          documentId: doc._id.toString(),
          ownerId: doc.ownerId?.toString() || '',
          organizationId: doc.organizationId?.toString() || '',
          productId: doc.productId?.toString(),
          fileName: doc.fileName,
          reason: 'COMPLIANCE_VIOLATION',
          details: `Admin rejected: ${input.reviewNote}`,
        });
        
        // Emit review decision for product compliance recalculation
        await emitDocumentReviewDecision({
          documentId: doc._id.toString(),
          productId: doc.productId?.toString(),
          organizationId: doc.organizationId?.toString() || '',
          documentType: doc.type,
          decision: 'REJECTED',
          reviewedBy: userId,
          reviewNote: input.reviewNote,
        });
        break;

      case 'FLAG':
        await DocumentRepo.update(id, {
          reviewStatus: 'FLAGGED',
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNote: input.flagReason || input.reviewNote,
          complianceStatus: 'NEEDS_REVIEW',
        });
        
        // Emit review decision for tracking
        await emitDocumentReviewDecision({
          documentId: doc._id.toString(),
          productId: doc.productId?.toString(),
          organizationId: doc.organizationId?.toString() || '',
          documentType: doc.type,
          decision: 'FLAGGED',
          reviewedBy: userId,
          reviewNote: input.flagReason || input.reviewNote,
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
    
    if (!isAdminRole(userRole)) {
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
    
    if (!isAdminRole(userRole)) {
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
