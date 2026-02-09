import mongoose from 'mongoose';
import { DocumentModel, IDocument, DocumentType, ExtractionStatus, DocumentStatus, IExtractedData } from '../domain/document.entity';

// Simple filter type compatible with Mongoose 9
type FilterQuery = Record<string, unknown>;
type SortOrder = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';

export interface DocumentQueryOptions {
  ownerId?: string;
  organizationId?: string;
  productId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  extractionStatus?: ExtractionStatus;
  reviewStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
  complianceStatus?: 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
  visibility?: string;
  isExpired?: boolean;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const DocumentRepo = {
  /**
   * Create a new document
   */
  async create(data: Partial<IDocument>): Promise<IDocument> {
    const document = new DocumentModel(data);
    return document.save();
  },

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<IDocument | null> {
    return DocumentModel.findById(id).lean();
  },

  /**
   * Find document by file hash (for deduplication)
   */
  async findByHash(fileHash: string, organizationId: string): Promise<IDocument | null> {
    return DocumentModel.findOne({ 
      fileHash, 
      organizationId,
      status: { $ne: 'DELETED' },
    }).lean();
  },

  /**
   * Find all documents by owner
   */
  async findByOwner(ownerId: string): Promise<IDocument[]> {
    return DocumentModel.find({ 
      ownerId, 
      status: { $ne: 'DELETED' } 
    }).lean();
  },

  /**
   * Find all documents by organization
   */
  async findByOrganization(organizationId: string): Promise<IDocument[]> {
    return DocumentModel.find({ 
      organizationId, 
      status: { $ne: 'DELETED' } 
    }).lean();
  },

  /**
   * Find all documents for a product
   */
  async findByProduct(productId: string): Promise<IDocument[]> {
    return DocumentModel.find({ 
      productId, 
      status: { $ne: 'DELETED' } 
    }).lean();
  },

  /**
   * Get document counts for multiple products (for admin product list)
   */
  async countByProductIds(productIds: string[]): Promise<Record<string, number>> {
    const objectIds = productIds.map(id => new mongoose.Types.ObjectId(id));
    
    const results = await DocumentModel.aggregate([
      { 
        $match: { 
          productId: { $in: objectIds },
          status: { $ne: 'DELETED' }
        } 
      },
      { 
        $group: { 
          _id: '$productId', 
          count: { $sum: 1 } 
        } 
      }
    ]);
    
    const countMap: Record<string, number> = {};
    for (const result of results) {
      countMap[result._id.toString()] = result.count;
    }
    
    return countMap;
  },

  /**
   * Find all documents with pagination and filtering
   */
  async findAll(options: DocumentQueryOptions = {}): Promise<PaginatedResult<IDocument>> {
    const {
      ownerId,
      organizationId,
      productId,
      type,
      status,
      extractionStatus,
      reviewStatus,
      complianceStatus,
      visibility,
      isExpired,
      search,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const filter: FilterQuery = {};

    if (ownerId) filter.ownerId = ownerId;
    if (organizationId) filter.organizationId = organizationId;
    if (productId) filter.productId = productId;
    if (type) filter.type = type;
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $ne: 'DELETED' };
    }
    if (extractionStatus) filter.extractionStatus = extractionStatus;
    if (reviewStatus) filter.reviewStatus = reviewStatus;
    if (complianceStatus) filter.complianceStatus = complianceStatus;
    if (visibility) filter.visibility = visibility;

    // Expired filter
    if (typeof isExpired === 'boolean') {
      if (isExpired) {
        filter.expiresAt = { $lt: new Date() };
      } else {
        filter.$or = [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gte: new Date() } },
        ];
      }
    }

    // Tags filter
    if (tags && tags.length > 0) {
      filter.tags = { $all: tags };
    }

    // Text search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { fileName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      DocumentModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      DocumentModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  },

  /**
   * Update a document
   */
  async update(id: string, data: Partial<IDocument>): Promise<IDocument | null> {
    return DocumentModel.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
  },

  /**
   * Update extraction data
   */
  async updateExtraction(
    id: string,
    extracted: IExtractedData,
    status: ExtractionStatus,
    failureReason?: string
  ): Promise<IDocument | null> {
    return DocumentModel.findByIdAndUpdate(
      id,
      {
        extracted,
        extractionStatus: status,
        extractedAt: status === 'SUCCESS' ? new Date() : undefined,
        failureReason,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();
  },

  /**
   * Set extraction status to processing
   */
  async startExtraction(id: string): Promise<IDocument | null> {
    return DocumentModel.findByIdAndUpdate(
      id,
      { extractionStatus: 'PROCESSING', updatedAt: new Date() },
      { new: true }
    ).lean();
  },

  /**
   * Archive a document
   */
  async archive(id: string): Promise<IDocument | null> {
    return DocumentModel.findByIdAndUpdate(
      id,
      { status: 'ARCHIVED', updatedAt: new Date() },
      { new: true }
    ).lean();
  },

  /**
   * Soft delete a document
   */
  async softDelete(id: string): Promise<IDocument | null> {
    return DocumentModel.findByIdAndUpdate(
      id,
      { status: 'DELETED', isActive: false, updatedAt: new Date() },
      { new: true }
    ).lean();
  },

  /**
   * Hard delete a document (use with caution)
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await DocumentModel.findByIdAndDelete(id);
    return result !== null;
  },

  /**
   * Check if document exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await DocumentModel.countDocuments({ _id: id });
    return count > 0;
  },

  /**
   * Count documents by filter
   */
  async count(filter: FilterQuery = {}): Promise<number> {
    return DocumentModel.countDocuments(filter);
  },

  /**
   * Find documents pending extraction
   */
  async findPendingExtraction(): Promise<IDocument[]> {
    return DocumentModel.find({ 
      extractionStatus: 'PENDING',
      status: 'ACTIVE',
    }).lean();
  },

  /**
   * Find failed extractions for retry
   */
  async findFailedExtraction(): Promise<IDocument[]> {
    return DocumentModel.find({ 
      extractionStatus: 'FAILED',
      status: 'ACTIVE',
    }).lean();
  },

  /**
   * Find expiring documents
   */
  async findExpiringSoon(daysAhead: number = 30): Promise<IDocument[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return DocumentModel.find({
      expiresAt: { $lte: futureDate, $gt: new Date() },
      status: 'ACTIVE',
    }).lean();
  },

  /**
   * Find expired documents
   */
  async findExpired(): Promise<IDocument[]> {
    return DocumentModel.find({
      expiresAt: { $lt: new Date() },
      status: 'ACTIVE',
    }).lean();
  },

  /**
   * Create a new version of a document
   */
  async createVersion(parentId: string, data: Partial<IDocument>): Promise<IDocument> {
    const parent = await DocumentModel.findById(parentId);
    if (!parent) {
      throw new Error('Parent document not found');
    }

    const newVersion = new DocumentModel({
      ...data,
      parentDocumentId: parentId,
      version: parent.version + 1,
    });
    
    return newVersion.save();
  },

  /**
   * Get document versions
   */
  async getVersions(documentId: string): Promise<IDocument[]> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) return [];

    // Find root document
    let rootId = documentId;
    if (doc.parentDocumentId) {
      rootId = doc.parentDocumentId.toString();
    }

    return DocumentModel.find({
      $or: [
        { _id: rootId },
        { parentDocumentId: rootId },
      ],
    }).sort({ version: 1 }).lean();
  },

  // ================== ADMIN STATISTICS ==================

  /**
   * Count documents by status
   */
  async countByStatus(status: DocumentStatus): Promise<number> {
    return DocumentModel.countDocuments({ status });
  },

  /**
   * Count documents by extraction status
   */
  async countByExtractionStatus(extractionStatus: ExtractionStatus): Promise<number> {
    return DocumentModel.countDocuments({ 
      extractionStatus,
      status: { $ne: 'DELETED' },
    });
  },

  /**
   * Count documents by type
   */
  async countByType(type: DocumentType): Promise<number> {
    return DocumentModel.countDocuments({ 
      type,
      status: { $ne: 'DELETED' },
    });
  },

  /**
   * Get document statistics for an organization
   */
  async getOrganizationStats(organizationId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byExtractionStatus: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const pipeline = [
      { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), status: { $ne: 'DELETED' } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          archived: { $sum: { $cond: [{ $eq: ['$status', 'ARCHIVED'] }, 1, 0] } },
          extractionPending: { $sum: { $cond: [{ $eq: ['$extractionStatus', 'PENDING'] }, 1, 0] } },
          extractionSuccess: { $sum: { $cond: [{ $eq: ['$extractionStatus', 'SUCCESS'] }, 1, 0] } },
          extractionFailed: { $sum: { $cond: [{ $eq: ['$extractionStatus', 'FAILED'] }, 1, 0] } },
        },
      },
    ];

    const [result] = await DocumentModel.aggregate(pipeline);

    if (!result) {
      return {
        total: 0,
        byStatus: { ACTIVE: 0, ARCHIVED: 0, DELETED: 0 },
        byExtractionStatus: { PENDING: 0, PROCESSING: 0, SUCCESS: 0, FAILED: 0 },
        byType: {},
      };
    }

    return {
      total: result.total,
      byStatus: {
        ACTIVE: result.active,
        ARCHIVED: result.archived,
        DELETED: 0,
      },
      byExtractionStatus: {
        PENDING: result.extractionPending,
        PROCESSING: 0,
        SUCCESS: result.extractionSuccess,
        FAILED: result.extractionFailed,
      },
      byType: {},
    };
  },

  /**
   * Find documents pending review (extraction success, not yet reviewed)
   */
  async findPendingReview(options: {
    organizationId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResult<IDocument>> {
    const { organizationId, page = 1, limit = 20 } = options;
    
    const filter: FilterQuery = {
      extractionStatus: 'SUCCESS',
      status: 'ACTIVE',
      'metadata.reviewStatus': { $exists: false },
    };

    if (organizationId) {
      filter.organizationId = new mongoose.Types.ObjectId(organizationId);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      DocumentModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      DocumentModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  },
};
