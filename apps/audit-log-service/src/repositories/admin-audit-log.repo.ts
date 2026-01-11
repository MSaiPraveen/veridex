import { Types, FilterQuery } from 'mongoose';
import { 
  AdminAuditLog, 
  IAdminAuditLog, 
  LeanAdminAuditLog,
  AdminAuditAction,
  AdminAuditEntityType,
  AdminAuditSeverity,
  IAdminAuditLogBase,
} from '../domain/admin-audit-log.entity';

export interface AdminAuditQueryOptions {
  adminId?: string;
  action?: AdminAuditAction;
  entityType?: AdminAuditEntityType;
  entityId?: string;
  severity?: AdminAuditSeverity;
  reasonCode?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedAdminAuditLogs {
  data: LeanAdminAuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminAuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  byAdmin: Array<{ adminId: string; adminEmail: string; count: number }>;
  securityAlerts: number;
  failedActions: number;
}

export const AdminAuditLogRepo = {
  /**
   * Append a new admin audit log (immutable insert)
   */
  async append(data: Partial<IAdminAuditLogBase>): Promise<IAdminAuditLog> {
    const entry = new AdminAuditLog({
      ...data,
      timestamp: data.timestamp || new Date(),
    });
    return entry.save();
  },

  /**
   * Find admin audit log by ID
   */
  async findById(id: string): Promise<LeanAdminAuditLog | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return AdminAuditLog.findById(id).lean() as Promise<LeanAdminAuditLog | null>;
  },

  /**
   * Find all admin audit logs with filtering and pagination
   */
  async findAll(options: AdminAuditQueryOptions): Promise<PaginatedAdminAuditLogs> {
    const {
      adminId,
      action,
      entityType,
      entityId,
      severity,
      reasonCode,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
      sortOrder = 'desc',
    } = options;

    const filter: FilterQuery<IAdminAuditLog> = {};

    if (adminId) filter.adminId = new Types.ObjectId(adminId);
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (severity) filter.severity = severity;
    if (reasonCode) filter.reasonCode = reasonCode;

    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = fromDate;
      if (toDate) filter.timestamp.$lte = toDate;
    }

    const skip = (page - 1) * limit;
    const sort = { timestamp: sortOrder === 'asc' ? 1 : -1 } as const;

    const [data, total] = await Promise.all([
      AdminAuditLog.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean() as Promise<LeanAdminAuditLog[]>,
      AdminAuditLog.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Find logs by entity
   */
  async findByEntity(entityType: AdminAuditEntityType, entityId: string): Promise<LeanAdminAuditLog[]> {
    return AdminAuditLog.find({ entityType, entityId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean() as Promise<LeanAdminAuditLog[]>;
  },

  /**
   * Find logs by admin
   */
  async findByAdmin(adminId: string, limit = 100): Promise<LeanAdminAuditLog[]> {
    return AdminAuditLog.find({ adminId: new Types.ObjectId(adminId) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean() as Promise<LeanAdminAuditLog[]>;
  },

  /**
   * Get security alerts (critical/security severity logs)
   */
  async getSecurityAlerts(fromDate?: Date): Promise<LeanAdminAuditLog[]> {
    const filter: FilterQuery<IAdminAuditLog> = {
      severity: { $in: ['CRITICAL', 'SECURITY'] },
    };

    if (fromDate) {
      filter.timestamp = { $gte: fromDate };
    }

    return AdminAuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(100)
      .lean() as Promise<LeanAdminAuditLog[]>;
  },

  /**
   * Get failed actions
   */
  async getFailedActions(fromDate?: Date): Promise<LeanAdminAuditLog[]> {
    const filter: FilterQuery<IAdminAuditLog> = {
      success: false,
    };

    if (fromDate) {
      filter.timestamp = { $gte: fromDate };
    }

    return AdminAuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(100)
      .lean() as Promise<LeanAdminAuditLog[]>;
  },

  /**
   * Get statistics
   */
  async getStats(days = 30): Promise<AdminAuditStats> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [totalLogs, byAction, bySeverity, byAdmin, securityAlerts, failedActions] = await Promise.all([
      AdminAuditLog.countDocuments({ timestamp: { $gte: fromDate } }),
      AdminAuditLog.aggregate([
        { $match: { timestamp: { $gte: fromDate } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ]),
      AdminAuditLog.aggregate([
        { $match: { timestamp: { $gte: fromDate } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      AdminAuditLog.aggregate([
        { $match: { timestamp: { $gte: fromDate } } },
        { $group: { _id: { adminId: '$adminId', adminEmail: '$adminEmail' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AdminAuditLog.countDocuments({ 
        timestamp: { $gte: fromDate }, 
        severity: { $in: ['CRITICAL', 'SECURITY'] } 
      }),
      AdminAuditLog.countDocuments({ 
        timestamp: { $gte: fromDate }, 
        success: false 
      }),
    ]);

    return {
      totalLogs,
      byAction: Object.fromEntries(byAction.map(a => [a._id, a.count])),
      bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
      byAdmin: byAdmin.map(a => ({
        adminId: a._id.adminId.toString(),
        adminEmail: a._id.adminEmail,
        count: a.count,
      })),
      securityAlerts,
      failedActions,
    };
  },

  /**
   * Get activity timeline for an entity
   */
  async getEntityTimeline(entityType: AdminAuditEntityType, entityId: string): Promise<LeanAdminAuditLog[]> {
    return AdminAuditLog.find({ entityType, entityId })
      .sort({ timestamp: 1 })
      .lean() as Promise<LeanAdminAuditLog[]>;
  },

  /**
   * Search logs by text (entity name, reason details, etc.)
   */
  async search(query: string, options: AdminAuditQueryOptions = {}): Promise<PaginatedAdminAuditLogs> {
    const { page = 1, limit = 50, fromDate, toDate } = options;

    const filter: FilterQuery<IAdminAuditLog> = {
      $or: [
        { entityName: { $regex: query, $options: 'i' } },
        { reasonDetails: { $regex: query, $options: 'i' } },
        { adminEmail: { $regex: query, $options: 'i' } },
      ],
    };

    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = fromDate;
      if (toDate) filter.timestamp.$lte = toDate;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      AdminAuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean() as Promise<LeanAdminAuditLog[]>,
      AdminAuditLog.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
