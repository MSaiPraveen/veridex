import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DocumentRepo, DocumentQueryOptions } from '../repositories/document.repo';
import { IDocument, IExtractedData, DocumentType, ExtractionStatus } from '../domain/document.entity';
import { extractDocument } from './extraction.service';
import { 
  emitDocumentCreated,
  emitDocumentUpdated,
  emitDocumentDeleted,
  emitDocumentProcessed,
  emitExtractionCompleted,
  emitExtractionFailed,
  emitDocumentRejected,
  emitDocumentReadyForCompliance,
} from '../events/document.producer';
import { 
  NotFoundError, 
  ConflictError, 
  ValidationError,
  ExtractionError,
} from '../errors/service.errors';
import { env } from '../config/env';

export const DocumentService = {
  /**
   * Create a new document
   */
  async create(input: {
    ownerId: string;
    organizationId: string;
    productId?: string;
    name: string;
    type: DocumentType;
    description?: string;
    visibility?: string;
    expiresAt?: Date;
    tags?: string[];
    metadata?: Record<string, any>;
    file: {
      path: string;
      originalname: string;
      size: number;
      mimetype: string;
    };
    createdBy?: string;
  }): Promise<IDocument> {
    const { file, ...docData } = input;

    // Calculate file hash for deduplication
    const fileHash = await calculateFileHash(file.path);

    // Check for duplicate
    const existing = await DocumentRepo.findByHash(fileHash, input.organizationId);
    if (existing) {
      // Remove uploaded file
      await safeUnlink(file.path);
      throw new ConflictError('A document with identical content already exists');
    }

    // Move file to permanent storage
    const permanentPath = await moveToStorage(file.path, file.originalname);

    const document = await DocumentRepo.create({
      ...docData,
      filePath: permanentPath,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileHash,
      extractionStatus: 'PENDING',
      status: 'ACTIVE',
      isActive: true,
      reviewStatus: 'PENDING_REVIEW', // Document starts as pending review
      complianceStatus: 'PENDING',    // Compliance not yet checked
    } as unknown as Partial<IDocument>);

    await emitDocumentCreated(document);

    // Start async extraction
    this.processDocument(document).catch(err => {
      console.error(`[Document Service] Background extraction failed for ${document._id}:`, err);
    });

    return document;
  },

  /**
   * Process document for extraction
   */
  async processDocument(doc: IDocument): Promise<void> {
    try {
      // Mark as processing
      await DocumentRepo.startExtraction(doc._id.toString());

      // Perform extraction
      const extracted = await extractDocument(doc.filePath, doc.type);

      // Validate extraction has minimum required data
      if (!extracted || extracted.confidence === 0) {
        throw new ExtractionError('Extraction produced no usable data');
      }

      // Update with results and set reviewStatus to PENDING_REVIEW
      await DocumentRepo.updateExtraction(
        doc._id.toString(),
        extracted,
        'SUCCESS'
      );
      
      // Set document to PENDING_REVIEW so it appears in admin queue
      await DocumentRepo.update(doc._id.toString(), {
        reviewStatus: 'PENDING_REVIEW',
        complianceStatus: 'PENDING',
      } as any);

      await emitExtractionCompleted(doc, extracted);
      
      // Emit document processed event (legacy compatibility)
      await emitDocumentProcessed({
        documentId: doc._id.toString(),
        ownerId: doc.ownerId?.toString() || '',
        productId: doc.productId?.toString(),
        organizationId: doc.organizationId?.toString() || '',
        extracted,
      });

      // Emit compliance ready event - this triggers automated compliance check
      // Only if document has a productId (required for compliance flow)
      if (doc.productId) {
        await emitDocumentReadyForCompliance(doc, extracted);
        console.log(`[Document Service] Document ${doc._id} ready for compliance evaluation`);
      } else {
        console.log(`[Document Service] Document ${doc._id} has no productId - skipping compliance flow`);
      }

    } catch (err: any) {
      await DocumentRepo.updateExtraction(
        doc._id.toString(),
        {},
        'FAILED',
        err.message
      );

      await emitExtractionFailed(doc, err.message);
      await emitDocumentProcessed({
        documentId: doc._id.toString(),
        ownerId: doc.ownerId?.toString() || '',
        productId: doc.productId?.toString(),
        organizationId: doc.organizationId?.toString() || '',
        failureReason: err.message,
      });
    }
  },

  /**
   * Get a document by ID
   */
  async getById(id: string): Promise<IDocument> {
    const doc = await DocumentRepo.findById(id);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    return doc;
  },

  /**
   * Get all documents with pagination
   */
  async getAll(options: DocumentQueryOptions = {}) {
    return DocumentRepo.findAll(options);
  },

  /**
   * Get documents by owner
   */
  async getByOwner(ownerId: string) {
    return DocumentRepo.findByOwner(ownerId);
  },

  /**
   * Get documents by organization
   */
  async getByOrganization(organizationId: string) {
    return DocumentRepo.findByOrganization(organizationId);
  },

  /**
   * Get documents by product
   */
  async getByProduct(productId: string) {
    return DocumentRepo.findByProduct(productId);
  },

  /**
   * Get document counts for multiple products
   */
  async getCountsByProductIds(productIds: string[]): Promise<Record<string, number>> {
    return DocumentRepo.countByProductIds(productIds);
  },

  /**
   * Update a document
   */
  async update(id: string, data: Partial<IDocument>, updatedBy?: string): Promise<IDocument> {
    const doc = await DocumentRepo.findById(id);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    const updated = await DocumentRepo.update(id, { ...data, updatedBy });
    if (!updated) {
      throw new NotFoundError('Document not found');
    }

    await emitDocumentUpdated(updated);
    return updated;
  },

  /**
   * Retry extraction for a failed document
   */
  async retryExtraction(id: string): Promise<IDocument> {
    const doc = await DocumentRepo.findById(id);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    if (doc.extractionStatus !== 'FAILED') {
      throw new ValidationError('Document extraction is not in failed state');
    }

    // Reset to pending and process
    await DocumentRepo.update(id, { extractionStatus: 'PENDING' });
    
    const updated = await DocumentRepo.findById(id);
    if (updated) {
      this.processDocument(updated).catch(err => {
        console.error(`[Document Service] Retry extraction failed for ${id}:`, err);
      });
    }

    return updated || doc;
  },

  /**
   * Archive a document
   */
  async archive(id: string): Promise<IDocument> {
    const doc = await DocumentRepo.archive(id);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    await emitDocumentUpdated(doc);
    return doc;
  },

  /**
   * Delete a document (soft delete)
   */
  async delete(id: string): Promise<void> {
    const doc = await DocumentRepo.findById(id);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    await DocumentRepo.softDelete(id);
    await emitDocumentDeleted(doc);
  },

  /**
   * Delete a document and its file (hard delete)
   */
  async hardDelete(id: string): Promise<void> {
    const doc = await DocumentRepo.findById(id);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    // Delete the file
    await safeUnlink(doc.filePath);

    // Delete the record
    await DocumentRepo.hardDelete(id);
    await emitDocumentDeleted(doc);
  },

  /**
   * Get file stream for download
   */
  async getFileStream(id: string): Promise<{ stream: fs.ReadStream; filename: string; mimeType: string }> {
    const doc = await DocumentRepo.findById(id);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    if (!fs.existsSync(doc.filePath)) {
      throw new NotFoundError('File not found on storage');
    }

    return {
      stream: fs.createReadStream(doc.filePath),
      filename: doc.fileName,
      mimeType: doc.mimeType,
    };
  },

  /**
   * Get documents with pending extraction
   */
  async getPendingExtraction() {
    return DocumentRepo.findPendingExtraction();
  },

  /**
   * Get failed extractions
   */
  async getFailedExtraction() {
    return DocumentRepo.findFailedExtraction();
  },

  /**
   * Get expiring documents
   */
  async getExpiringSoon(daysAhead: number = 30) {
    return DocumentRepo.findExpiringSoon(daysAhead);
  },

  /**
   * Get expired documents
   */
  async getExpired() {
    return DocumentRepo.findExpired();
  },

  /**
   * Upload a new version
   */
  async uploadVersion(parentId: string, input: {
    file: {
      path: string;
      originalname: string;
      size: number;
      mimetype: string;
    };
    createdBy?: string;
  }): Promise<IDocument> {
    const parent = await DocumentRepo.findById(parentId);
    if (!parent) {
      throw new NotFoundError('Parent document not found');
    }

    const { file } = input;
    const fileHash = await calculateFileHash(file.path);
    const permanentPath = await moveToStorage(file.path, file.originalname);

    const newVersion = await DocumentRepo.createVersion(parentId, {
      ownerId: parent.ownerId,
      organizationId: parent.organizationId,
      productId: parent.productId,
      name: parent.name,
      type: parent.type,
      description: parent.description,
      visibility: parent.visibility,
      expiresAt: parent.expiresAt,
      tags: parent.tags,
      filePath: permanentPath,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileHash,
      extractionStatus: 'PENDING',
      status: 'ACTIVE',
      isActive: true,
      createdBy: input.createdBy,
    });

    await emitDocumentCreated(newVersion);

    // Start extraction
    this.processDocument(newVersion).catch(err => {
      console.error(`[Document Service] Version extraction failed:`, err);
    });

    return newVersion;
  },

  /**
   * Get document versions
   */
  async getVersions(id: string) {
    return DocumentRepo.getVersions(id);
  },
};

// ================== HELPER FUNCTIONS ==================

async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function moveToStorage(tempPath: string, originalName: string): Promise<string> {
  const ext = path.extname(originalName);
  const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const permanentPath = path.join(env.FILE_STORAGE_PATH, uniqueName);
  
  // Ensure directory exists
  const dir = path.dirname(permanentPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.renameSync(tempPath, permanentPath);
  return permanentPath;
}

async function safeUnlink(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`[Document Service] Failed to delete file ${filePath}:`, error);
  }
}

// Legacy export for backwards compatibility
export async function processDocument(doc: any) {
  return DocumentService.processDocument(doc);
}
