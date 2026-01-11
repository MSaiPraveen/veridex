import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import fastifyMultipart from '@fastify/multipart';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { z } from 'zod';
import { DocumentService } from '../services/document.service';
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentQuerySchema,
} from '../schemas/document.schemas';
import { ValidationError, FileUploadError } from '../errors/service.errors';
import { env } from '../config/env';
import { 
  validateUploadedFile, 
  ALLOWED_MIME_TYPES,
  getAllowedFileTypesDescription,
  FILE_SIZE_LIMITS,
} from '../validators/file.validator';
import {
  validateUploadInput,
  requiresProductId,
  PRODUCT_REQUIRED_TYPES,
} from '../validators/upload.validator';
import { emitDocumentRejected, RejectionReason } from '../events/document.producer';

// Type for multipart file
interface MultipartFile {
  file: NodeJS.ReadableStream;
  filename: string;
  mimetype: string;
  encoding: string;
  fields: Record<string, unknown>;
}

// Helper for Zod validation with proper type inference
function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ValidationError(message);
  }
  return result.data;
}

// Helper to safely cleanup temp files
async function safeCleanup(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Helper to emit rejection and throw error
async function rejectUpload(
  ownerId: string,
  organizationId: string,
  fileName: string,
  reason: RejectionReason,
  details: string,
  productId?: string,
  tempPath?: string
): Promise<never> {
  // Cleanup temp file if exists
  if (tempPath) {
    await safeCleanup(tempPath);
  }
  
  // Emit rejection event for notifications and audit
  await emitDocumentRejected({
    ownerId,
    organizationId,
    productId,
    fileName,
    reason,
    details,
  });
  
  throw new FileUploadError(details);
}

export async function documentRoutes(app: FastifyInstance) {
  // Register multipart support with strict limits
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: FILE_SIZE_LIMITS.MAX_SIZE,
      files: 1, // Only 1 file per request
      fieldSize: 1024 * 100, // 100KB max for metadata fields
    },
  });

  // ================== DOCUMENT CRUD ==================

  /**
   * POST /documents - Upload a new document
   * 
   * VALIDATION FLOW:
   * 1. Check file exists
   * 2. Validate MIME type against whitelist
   * 3. Validate required metadata (productId for certain types)
   * 4. Save to temp location
   * 5. Verify file content (magic bytes)
   * 6. Check file size limits
   * 7. Create document and start extraction
   */
  app.post('/documents', async (request: FastifyRequest, reply: FastifyReply) => {
    // Cast request to include file method added by @fastify/multipart
    const reqWithFile = request as FastifyRequest & { file: () => Promise<MultipartFile | undefined> };
    
    // Get user context from headers
    const ownerId = request.headers['x-user-id'] as string;
    const organizationId = request.headers['x-organization-id'] as string;
    
    if (!ownerId) {
      throw new ValidationError('User ID is required (x-user-id header)');
    }
    
    let data: MultipartFile | undefined;
    try {
      data = await reqWithFile.file();
    } catch (error: any) {
      // Handle multipart parsing errors
      if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
        await rejectUpload(
          ownerId,
          organizationId || 'unknown',
          'unknown',
          'FILE_TOO_LARGE',
          `File exceeds maximum size of ${FILE_SIZE_LIMITS.MAX_SIZE / 1024 / 1024}MB`
        );
      }
      throw error;
    }
    
    if (!data) {
      throw new FileUploadError('No file uploaded. Please select a file to upload.');
    }

    const fileName = data.filename;
    const mimeType = data.mimetype;

    // ===== STEP 1: Validate MIME type against whitelist =====
    if (!ALLOWED_MIME_TYPES[mimeType.toLowerCase()]) {
      await rejectUpload(
        ownerId,
        organizationId || 'unknown',
        fileName,
        'UNSUPPORTED_FILE_TYPE',
        `Unsupported file type: ${mimeType}. Allowed types: ${getAllowedFileTypesDescription()}`
      );
    }

    // ===== STEP 2: Parse and validate metadata fields =====
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(data.fields)) {
      if (value && typeof value === 'object' && 'value' in value) {
        fields[key] = (value as { value: string }).value;
      }
    }

    // Use header organizationId if not in fields
    if (!fields.organizationId && organizationId) {
      fields.organizationId = organizationId;
    }

    // Use filename as document name if not provided
    const name = fields.name || fileName;

    // Build input object for validation
    const rawInput = {
      ...fields,
      ownerId,
      name,
      tags: fields.tags ? fields.tags.split(',').map(t => t.trim()) : undefined,
    };

    // ===== STEP 3: Validate required fields including productId =====
    const inputValidation = validateUploadInput(rawInput);
    if (!inputValidation.isValid) {
      const errorDetails = inputValidation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      
      // Determine rejection reason
      let reason: RejectionReason = 'VALIDATION_ERROR';
      if (inputValidation.errors.some(e => e.code === 'MISSING_PRODUCT_ID')) {
        reason = 'MISSING_PRODUCT_ID';
      } else if (inputValidation.errors.some(e => e.code === 'MISSING_ORGANIZATION_ID')) {
        reason = 'MISSING_ORGANIZATION_ID';
      }
      
      await rejectUpload(
        ownerId,
        fields.organizationId || organizationId || 'unknown',
        fileName,
        reason,
        errorDetails,
        fields.productId
      );
    }

    // Also run standard schema validation
    const input = validate(createDocumentSchema, rawInput);

    // ===== STEP 4: Save file to temp location =====
    const tempPath = path.join(env.FILE_STORAGE_PATH, 'temp', `${Date.now()}-${fileName}`);
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      await pipeline(data.file, fs.createWriteStream(tempPath));
    } catch (error: any) {
      await rejectUpload(
        ownerId,
        input.organizationId,
        fileName,
        'CORRUPT_FILE',
        `Failed to save file: ${error.message}`,
        input.productId,
        tempPath
      );
    }

    // Get file stats
    const stats = fs.statSync(tempPath);

    // ===== STEP 5: Comprehensive file validation =====
    const fileValidation = await validateUploadedFile(tempPath, fileName, mimeType, stats.size);
    
    if (!fileValidation.isValid) {
      const errorDetails = fileValidation.errors.join('; ');
      
      // Determine specific rejection reason
      let reason: RejectionReason = 'VALIDATION_ERROR';
      if (fileValidation.errors.some(e => e.includes('too small') || e.includes('empty'))) {
        reason = 'EMPTY_FILE';
      } else if (fileValidation.errors.some(e => e.includes('too large'))) {
        reason = 'FILE_TOO_LARGE';
      } else if (fileValidation.errors.some(e => e.includes('mismatch') || e.includes('content'))) {
        reason = 'MIME_TYPE_MISMATCH';
      } else if (fileValidation.errors.some(e => e.includes('corrupt') || e.includes('integrity'))) {
        reason = 'CORRUPT_FILE';
      }
      
      await rejectUpload(
        ownerId,
        input.organizationId,
        fileName,
        reason,
        errorDetails,
        input.productId,
        tempPath
      );
    }

    // ===== STEP 6: Create document (starts async extraction) =====
    const document = await DocumentService.create({
      ...input,
      file: {
        path: tempPath,
        originalname: fileName,
        size: stats.size,
        mimetype: mimeType,
      },
    });

    return reply.status(201).send({ 
      success: true, 
      data: document,
      message: 'Document uploaded successfully. Extraction in progress.',
    });
  });

  /**
   * GET /documents - List all documents with pagination
   * CRITICAL: Documents are ALWAYS organization-scoped. No global documents.
   */
  app.get('/documents', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = validate(documentQuerySchema, request.query);
    
    // Get user context from headers (set by API gateway)
    const userRole = request.headers['x-user-role'] as string;
    const userOrgId = request.headers['x-organization-id'] as string;
    
    let organizationId: string | undefined;
    
    // CRITICAL: Enforce organization isolation
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      // Admins can query any organization
      organizationId = query.organizationId || userOrgId;
    } else if (userRole === 'MERCHANT') {
      // Merchants MUST use their organization - cannot access other org's docs
      if (!userOrgId) {
        // Return empty result if merchant has no organization yet
        return reply.send({
          success: true,
          data: [],
          total: 0,
          page: query.page || 1,
          limit: query.limit || 20,
          totalPages: 0,
        });
      }
      organizationId = userOrgId;
    } else if (userRole === 'CONSUMER') {
      // Consumers cannot access documents list
      return reply.status(403).send({
        success: false,
        error: 'Access denied',
        message: 'Document access requires merchant or admin role',
      });
    } else {
      // Unknown role - return empty for safety
      return reply.send({
        success: true,
        data: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: 0,
      });
    }
    
    const options = {
      ...query,
      tags: query.tags ? query.tags.split(',').map(t => t.trim()) : undefined,
      organizationId,
    };
    
    const result = await DocumentService.getAll(options);
    return reply.send({ success: true, ...result });
  });

  /**
   * GET /documents/:id - Get a specific document
   */
  app.get('/documents/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const document = await DocumentService.getById(id);
    return reply.send({ success: true, data: document });
  });

  /**
   * PATCH /documents/:id - Update a document
   */
  app.patch('/documents/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const input = validate(updateDocumentSchema, request.body);
    const document = await DocumentService.update(id, input as any);
    return reply.send({ success: true, data: document });
  });

  /**
   * DELETE /documents/:id - Delete a document
   */
  app.delete('/documents/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    await DocumentService.delete(id);
    return reply.send({ success: true, message: 'Document deleted' });
  });

  /**
   * POST /documents/:id/archive - Archive a document
   */
  app.post('/documents/:id/archive', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const document = await DocumentService.archive(id);
    return reply.send({ success: true, data: document });
  });

  // ================== FILE DOWNLOAD ==================

  /**
   * GET /documents/:id/download - Download document file
   */
  app.get('/documents/:id/download', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { stream, filename, mimeType } = await DocumentService.getFileStream(id);
    
    return reply
      .header('Content-Type', mimeType)
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(stream);
  });

  // ================== EXTRACTION ==================

  /**
   * POST /documents/:id/retry-extraction - Retry failed extraction
   */
  app.post('/documents/:id/retry-extraction', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const document = await DocumentService.retryExtraction(id);
    return reply.send({ success: true, data: document });
  });

  /**
   * GET /documents/extraction/pending - Get documents pending extraction
   */
  app.get('/documents/extraction/pending', async (_request: FastifyRequest, reply: FastifyReply) => {
    const documents = await DocumentService.getPendingExtraction();
    return reply.send({ success: true, data: documents });
  });

  /**
   * GET /documents/extraction/failed - Get failed extractions
   */
  app.get('/documents/extraction/failed', async (_request: FastifyRequest, reply: FastifyReply) => {
    const documents = await DocumentService.getFailedExtraction();
    return reply.send({ success: true, data: documents });
  });

  // ================== EXPIRATION ==================

  /**
   * GET /documents/expiring - Get documents expiring soon
   */
  app.get('/documents/expiring', async (request: FastifyRequest<{ Querystring: { days?: number } }>, reply: FastifyReply) => {
    const { days = 30 } = request.query;
    const documents = await DocumentService.getExpiringSoon(days);
    return reply.send({ success: true, data: documents });
  });

  /**
   * GET /documents/expired - Get expired documents
   */
  app.get('/documents/expired', async (_request: FastifyRequest, reply: FastifyReply) => {
    const documents = await DocumentService.getExpired();
    return reply.send({ success: true, data: documents });
  });

  // ================== VERSIONING ==================

  /**
   * POST /documents/:id/versions - Upload a new version
   */
  app.post('/documents/:id/versions', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const data = await request.file();
    
    if (!data) {
      throw new FileUploadError('No file uploaded');
    }

    // Save file to temp location
    const tempPath = path.join(env.FILE_STORAGE_PATH, 'temp', `${Date.now()}-${data.filename}`);
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await pipeline(data.file, fs.createWriteStream(tempPath));
    const stats = fs.statSync(tempPath);

    const document = await DocumentService.uploadVersion(id, {
      file: {
        path: tempPath,
        originalname: data.filename,
        size: stats.size,
        mimetype: data.mimetype,
      },
    });

    return reply.status(201).send({ success: true, data: document });
  });

  /**
   * GET /documents/:id/versions - Get document versions
   */
  app.get('/documents/:id/versions', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const versions = await DocumentService.getVersions(id);
    return reply.send({ success: true, data: versions });
  });

  // ================== OWNER/ORG/PRODUCT QUERIES ==================

  /**
   * GET /owners/:ownerId/documents - Get documents by owner
   */
  app.get('/owners/:ownerId/documents', async (request: FastifyRequest<{ Params: { ownerId: string } }>, reply: FastifyReply) => {
    const { ownerId } = request.params;
    const documents = await DocumentService.getByOwner(ownerId);
    return reply.send({ success: true, data: documents });
  });

  /**
   * GET /organizations/:organizationId/documents - Get documents by organization
   */
  app.get('/organizations/:organizationId/documents', async (request: FastifyRequest<{ Params: { organizationId: string } }>, reply: FastifyReply) => {
    const { organizationId } = request.params;
    const documents = await DocumentService.getByOrganization(organizationId);
    return reply.send({ success: true, data: documents });
  });

  /**
   * GET /products/:productId/documents - Get documents by product
   */
  app.get('/products/:productId/documents', async (request: FastifyRequest<{ Params: { productId: string } }>, reply: FastifyReply) => {
    const { productId } = request.params;
    const documents = await DocumentService.getByProduct(productId);
    return reply.send({ success: true, data: documents });
  });

  // ================== HEALTH CHECK ==================

  app.get('/health', async (_request, reply) => {
    return reply.send({ 
      status: 'ok', 
      service: 'document-service',
      timestamp: new Date().toISOString(),
    });
  });
}
