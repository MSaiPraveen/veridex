import { ComplianceResultModel, IComplianceResult, LeanComplianceResult, IComplianceResultBase, generateResultHash, verifyResultIntegrity } from '../domain/compliance-result.entity';
import { Types } from 'mongoose';

type FilterQuery = Record<string, unknown>;
type SortOrder = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';

export interface ResultQueryOptions {
  productId?: string;
  documentId?: string;
  organizationId?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResults {
  data: LeanComplianceResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ComplianceStats {
  total: number;
  compliant: number;
  nonCompliant: number;
  pending: number;
  error: number;
  complianceRate: number;
}

export const ResultRepo = {
  async create(data: Partial<IComplianceResultBase>): Promise<IComplianceResult> {
    return ComplianceResultModel.create(data);
  },

  async findById(id: string): Promise<LeanComplianceResult | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return ComplianceResultModel.findById(id).lean() as Promise<LeanComplianceResult | null>;
  },

  async findByProductId(productId: string, limit = 10): Promise<LeanComplianceResult[]> {
    if (!Types.ObjectId.isValid(productId)) return [];
    return ComplianceResultModel.find({ productId: new Types.ObjectId(productId) })
      .sort({ evaluatedAt: -1 })
      .limit(limit)
      .lean() as Promise<LeanComplianceResult[]>;
  },

  async findLatestByProductId(productId: string): Promise<LeanComplianceResult | null> {
    if (!Types.ObjectId.isValid(productId)) return null;
    return ComplianceResultModel.findOne({ productId: new Types.ObjectId(productId) })
      .sort({ evaluatedAt: -1 })
      .lean() as Promise<LeanComplianceResult | null>;
  },

  async findAll(options: ResultQueryOptions = {}): Promise<PaginatedResults> {
    const {
      productId,
      documentId,
      organizationId,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
      sortBy = 'evaluatedAt',
      sortOrder = 'desc',
    } = options;

    const filter: FilterQuery = {};

    if (productId && Types.ObjectId.isValid(productId)) {
      filter.productId = new Types.ObjectId(productId);
    }
    if (documentId && Types.ObjectId.isValid(documentId)) {
      filter.documentId = new Types.ObjectId(documentId);
    }
    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }
    if (status) filter.status = status;

    if (fromDate || toDate) {
      filter.evaluatedAt = {};
      if (fromDate) (filter.evaluatedAt as Record<string, unknown>).$gte = fromDate;
      if (toDate) (filter.evaluatedAt as Record<string, unknown>).$lte = toDate;
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      ComplianceResultModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean() as Promise<LeanComplianceResult[]>,
      ComplianceResultModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async append(data: Partial<IComplianceResultBase>): Promise<IComplianceResult> {
    const now = new Date();
    const resultData = {
      ...data,
      evaluatedAt: now,
      immutable: true,
      immutableAt: now,
    };
    // Generate integrity hash before saving
    resultData.resultHash = generateResultHash(resultData);
    return this.create(resultData);
  },

  /**
   * Soft archive a result (marks as archived but does not delete)
   * Compliance results should never be truly deleted for audit purposes
   */
  async archive(id: string): Promise<LeanComplianceResult | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    // Instead of deleting, we mark it in metadata
    // Note: This will fail if the document is immutable (by design)
    console.warn('[ResultRepo] Archiving compliance result:', id);
    return ComplianceResultModel.findByIdAndUpdate(
      id,
      { $set: { 'metadata.archived': true, 'metadata.archivedAt': new Date() } },
      { new: true }
    ).lean() as Promise<LeanComplianceResult | null>;
  },

  /**
   * @deprecated Compliance results should not be deleted. Use archive() instead.
   */
  async delete(id: string): Promise<LeanComplianceResult | null> {
    console.error('[ResultRepo] WARNING: Attempted to delete compliance result. This operation is forbidden.');
    console.error('[ResultRepo] Compliance results are immutable for audit purposes. Use archive() instead.');
    throw new Error('Compliance results cannot be deleted. They are immutable for regulatory compliance.');
  },

  /**
   * @deprecated Compliance results should not be deleted. Use archive() instead.
   */
  async deleteByProductId(productId: string): Promise<number> {
    console.error('[ResultRepo] WARNING: Attempted to bulk delete compliance results. This operation is forbidden.');
    throw new Error('Compliance results cannot be deleted. They are immutable for regulatory compliance.');
  },

  /**
   * Verify the integrity of a compliance result
   */
  async verifyIntegrity(id: string): Promise<{ valid: boolean; result: LeanComplianceResult | null }> {
    if (!Types.ObjectId.isValid(id)) return { valid: false, result: null };
    
    const result = await ComplianceResultModel.findById(id).lean() as LeanComplianceResult | null;
    if (!result) return { valid: false, result: null };

    const isValid = verifyResultIntegrity(result);

    return { 
      valid: isValid, 
      result, 
    };
  },

  async getStats(organizationId?: string): Promise<ComplianceStats> {
    const match: FilterQuery = {};
    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      match.organizationId = new Types.ObjectId(organizationId);
    }

    const stats = await ComplianceResultModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result: ComplianceStats = {
      total: 0,
      compliant: 0,
      nonCompliant: 0,
      pending: 0,
      error: 0,
      complianceRate: 0,
    };

    for (const stat of stats) {
      result.total += stat.count;
      switch (stat._id) {
        case 'COMPLIANT':
          result.compliant = stat.count;
          break;
        case 'NON_COMPLIANT':
          result.nonCompliant = stat.count;
          break;
        case 'PENDING':
          result.pending = stat.count;
          break;
        case 'ERROR':
          result.error = stat.count;
          break;
      }
    }

    if (result.total > 0) {
      result.complianceRate = Math.round((result.compliant / result.total) * 100);
    }

    return result;
  },

  async getStatsByProduct(productId: string): Promise<{
    total: number;
    latest: LeanComplianceResult | null;
    history: { date: Date; status: string }[];
  }> {
    if (!Types.ObjectId.isValid(productId)) {
      return { total: 0, latest: null, history: [] };
    }

    const [total, latest, history] = await Promise.all([
      ComplianceResultModel.countDocuments({ productId: new Types.ObjectId(productId) }),
      this.findLatestByProductId(productId),
      ComplianceResultModel.find({ productId: new Types.ObjectId(productId) })
        .select('evaluatedAt status')
        .sort({ evaluatedAt: -1 })
        .limit(30)
        .lean(),
    ]);

    return {
      total,
      latest,
      history: history.map((h) => ({ date: h.evaluatedAt, status: h.status })),
    };
  },

  async getTrendData(organizationId?: string, days = 30): Promise<{ date: string; compliant: number; nonCompliant: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const match: FilterQuery = {
      evaluatedAt: { $gte: startDate },
    };
    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      match.organizationId = new Types.ObjectId(organizationId);
    }

    const results = await ComplianceResultModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$evaluatedAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Transform into daily data
    const dailyData: Record<string, { compliant: number; nonCompliant: number }> = {};
    
    for (const result of results) {
      const date = result._id.date;
      if (!dailyData[date]) {
        dailyData[date] = { compliant: 0, nonCompliant: 0 };
      }
      if (result._id.status === 'COMPLIANT') {
        dailyData[date].compliant = result.count;
      } else if (result._id.status === 'NON_COMPLIANT') {
        dailyData[date].nonCompliant = result.count;
      }
    }

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    }));
  },
};
