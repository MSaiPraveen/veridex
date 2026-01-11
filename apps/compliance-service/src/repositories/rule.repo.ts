import { ComplianceRuleModel, IComplianceRule, LeanComplianceRule, IComplianceRuleBase } from '../domain/compliance-rule.entity';
import { Types } from 'mongoose';

type FilterQuery = Record<string, unknown>;
type SortOrder = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';

export interface RuleQueryOptions {
  documentType?: string;
  category?: string;
  severity?: string;
  active?: boolean;
  organizationId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedRules {
  data: LeanComplianceRule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const RuleRepo = {
  async create(data: Partial<IComplianceRuleBase>): Promise<IComplianceRule> {
    return ComplianceRuleModel.create(data);
  },

  async findById(id: string): Promise<LeanComplianceRule | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return ComplianceRuleModel.findById(id).lean() as Promise<LeanComplianceRule | null>;
  },

  async findByCode(code: string): Promise<LeanComplianceRule | null> {
    return ComplianceRuleModel.findOne({ code: code.toUpperCase() }).lean() as Promise<LeanComplianceRule | null>;
  },

  async findActiveRules(documentType: string, organizationId?: string): Promise<LeanComplianceRule[]> {
    const now = new Date();
    const filter: FilterQuery = {
      documentType,
      active: true,
      effectiveFrom: { $lte: now },
      $or: [
        { effectiveUntil: { $exists: false } },
        { effectiveUntil: null },
        { effectiveUntil: { $gte: now } },
      ],
    };

    if (organizationId) {
      filter.$or = [
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: new Types.ObjectId(organizationId) },
      ];
    }

    return ComplianceRuleModel.find(filter)
      .sort({ version: -1, severity: 1 })
      .lean() as Promise<LeanComplianceRule[]>;
  },

  async findAll(options: RuleQueryOptions = {}): Promise<PaginatedRules> {
    const {
      documentType,
      category,
      severity,
      active,
      organizationId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const filter: FilterQuery = {};

    if (documentType) filter.documentType = documentType;
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (typeof active === 'boolean') filter.active = active;
    if (organizationId) filter.organizationId = new Types.ObjectId(organizationId);

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      ComplianceRuleModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean() as Promise<LeanComplianceRule[]>,
      ComplianceRuleModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async update(id: string, data: Partial<IComplianceRuleBase>): Promise<LeanComplianceRule | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return ComplianceRuleModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    ).lean() as Promise<LeanComplianceRule | null>;
  },

  async delete(id: string): Promise<LeanComplianceRule | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return ComplianceRuleModel.findByIdAndDelete(id).lean() as Promise<LeanComplianceRule | null>;
  },

  async deactivate(id: string): Promise<LeanComplianceRule | null> {
    return this.update(id, { active: false });
  },

  async activate(id: string): Promise<LeanComplianceRule | null> {
    return this.update(id, { active: true });
  },

  async createNewVersion(id: string): Promise<IComplianceRule | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const { _id, createdAt, updatedAt, ...ruleData } = existing;
    return ComplianceRuleModel.create({
      ...ruleData,
      version: existing.version + 1,
      code: `${existing.code}_V${existing.version + 1}`,
    });
  },

  async countByCategory(): Promise<{ _id: string; count: number }[]> {
    return ComplianceRuleModel.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  },

  async countBySeverity(): Promise<{ _id: string; count: number }[]> {
    return ComplianceRuleModel.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
  },
};
