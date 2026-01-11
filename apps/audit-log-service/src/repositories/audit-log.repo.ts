import { AuditLogModel, IAuditLog, LeanAuditLog, IAuditLogBase } from '../domain/audit-log.entity';
import { Types } from 'mongoose';

type FilterQuery = Record<string, unknown>;
type SortOrder = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';

export interface AuditQueryOptions {
  actorId?: string;
  organizationId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  severity?: string;
  success?: boolean;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedAuditLogs {
  data: LeanAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditStats {
  total: number;
  byAction: { _id: string; count: number }[];
  byResourceType: { _id: string; count: number }[];
  bySeverity: { _id: string; count: number }[];
  successRate: number;
}

export const AuditLogRepo = {
  async append(entry: Partial<IAuditLogBase>): Promise<IAuditLog> {
    return AuditLogModel.create({
      ...entry,
      createdAt: new Date(),
    });
  },

  async findById(id: string): Promise<LeanAuditLog | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return AuditLogModel.findById(id).lean() as Promise<LeanAuditLog | null>;
  },

  async findByResource(resourceType: string, resourceId: string, limit = 100): Promise<LeanAuditLog[]> {
    return AuditLogModel.find({ resourceType, resourceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as Promise<LeanAuditLog[]>;
  },

  async findByActor(actorId: string, limit = 100): Promise<LeanAuditLog[]> {
    if (!Types.ObjectId.isValid(actorId)) return [];
    return AuditLogModel.find({ actorId: new Types.ObjectId(actorId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as Promise<LeanAuditLog[]>;
  },

  async findAll(options: AuditQueryOptions = {}): Promise<PaginatedAuditLogs> {
    const {
      actorId,
      organizationId,
      action,
      resourceType,
      resourceId,
      severity,
      success,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const filter: FilterQuery = {};

    if (actorId && Types.ObjectId.isValid(actorId)) {
      filter.actorId = new Types.ObjectId(actorId);
    }
    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }
    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (resourceId) filter.resourceId = resourceId;
    if (severity) filter.severity = severity;
    if (typeof success === 'boolean') filter.success = success;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) (filter.createdAt as Record<string, unknown>).$gte = fromDate;
      if (toDate) (filter.createdAt as Record<string, unknown>).$lte = toDate;
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean() as Promise<LeanAuditLog[]>,
      AuditLogModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getStats(organizationId?: string, days = 30): Promise<AuditStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const match: FilterQuery = { createdAt: { $gte: startDate } };
    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      match.organizationId = new Types.ObjectId(organizationId);
    }

    const [total, byAction, byResourceType, bySeverity, successCount] = await Promise.all([
      AuditLogModel.countDocuments(match),
      AuditLogModel.aggregate([
        { $match: match },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLogModel.aggregate([
        { $match: match },
        { $group: { _id: '$resourceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLogModel.aggregate([
        { $match: match },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      AuditLogModel.countDocuments({ ...match, success: true }),
    ]);

    return {
      total,
      byAction,
      byResourceType,
      bySeverity,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 100,
    };
  },

  async getTimeline(
    resourceType: string,
    resourceId: string,
    limit = 50
  ): Promise<LeanAuditLog[]> {
    return AuditLogModel.find({ resourceType, resourceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as Promise<LeanAuditLog[]>;
  },

  async getActivityTrend(
    organizationId?: string,
    days = 30
  ): Promise<{ date: string; count: number; actions: Record<string, number> }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const match: FilterQuery = { createdAt: { $gte: startDate } };
    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      match.organizationId = new Types.ObjectId(organizationId);
    }

    const results = await AuditLogModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            action: '$action',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Transform into daily data
    const dailyData: Record<string, { count: number; actions: Record<string, number> }> = {};

    for (const result of results) {
      const date = result._id.date;
      if (!dailyData[date]) {
        dailyData[date] = { count: 0, actions: {} };
      }
      dailyData[date].count += result.count;
      dailyData[date].actions[result._id.action] = result.count;
    }

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    }));
  },

  async searchByMetadata(
    key: string,
    value: unknown,
    limit = 100
  ): Promise<LeanAuditLog[]> {
    return AuditLogModel.find({ [`metadata.${key}`]: value })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as Promise<LeanAuditLog[]>;
  },
};
