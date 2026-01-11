import { NotificationModel, INotification, LeanNotification, INotificationBase } from '../domain/notification.entity';
import { Types } from 'mongoose';

type FilterQuery = Record<string, unknown>;
type SortOrder = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';

export interface NotificationQueryOptions {
  userId?: string;
  organizationId?: string;
  channel?: string;
  category?: string;
  priority?: string;
  status?: string;
  read?: boolean;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedNotifications {
  data: LeanNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byChannel: { _id: string; count: number }[];
  byCategory: { _id: string; count: number }[];
  byStatus: { _id: string; count: number }[];
}

export const NotificationRepo = {
  async create(data: Partial<INotificationBase>): Promise<INotification> {
    return NotificationModel.create(data);
  },

  async createMany(data: Partial<INotificationBase>[]): Promise<INotification[]> {
    return NotificationModel.insertMany(data) as Promise<INotification[]>;
  },

  async findById(id: string): Promise<LeanNotification | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return NotificationModel.findById(id).lean() as Promise<LeanNotification | null>;
  },

  async findByUser(userId: string, limit = 50): Promise<LeanNotification[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    return NotificationModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as Promise<LeanNotification[]>;
  },

  async findUnreadByUser(userId: string): Promise<LeanNotification[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    return NotificationModel.find({
      userId: new Types.ObjectId(userId),
      read: false,
    })
      .sort({ priority: 1, createdAt: -1 })
      .lean() as Promise<LeanNotification[]>;
  },

  async findAll(options: NotificationQueryOptions = {}): Promise<PaginatedNotifications> {
    const {
      userId,
      organizationId,
      channel,
      category,
      priority,
      status,
      read,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const filter: FilterQuery = {};

    if (userId && Types.ObjectId.isValid(userId)) {
      filter.userId = new Types.ObjectId(userId);
    }
    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }
    if (channel) filter.channel = channel;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;
    if (typeof read === 'boolean') filter.read = read;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) (filter.createdAt as Record<string, unknown>).$gte = fromDate;
      if (toDate) (filter.createdAt as Record<string, unknown>).$lte = toDate;
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total, unreadCount] = await Promise.all([
      NotificationModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean() as Promise<LeanNotification[]>,
      NotificationModel.countDocuments(filter),
      userId
        ? NotificationModel.countDocuments({
            ...filter,
            read: false,
          })
        : 0,
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  },

  async markAsRead(id: string): Promise<LeanNotification | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return NotificationModel.findByIdAndUpdate(
      id,
      { $set: { read: true, readAt: new Date(), status: 'READ' } },
      { new: true }
    ).lean() as Promise<LeanNotification | null>;
  },

  async markManyAsRead(ids: string[]): Promise<number> {
    const validIds = ids.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0) return 0;

    const result = await NotificationModel.updateMany(
      { _id: { $in: validIds.map((id) => new Types.ObjectId(id)) } },
      { $set: { read: true, readAt: new Date(), status: 'READ' } }
    );
    return result.modifiedCount;
  },

  async markAllAsReadForUser(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) return 0;

    const result = await NotificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true, readAt: new Date(), status: 'READ' } }
    );
    return result.modifiedCount;
  },

  async updateStatus(
    id: string,
    status: string,
    additionalData?: Partial<INotificationBase>
  ): Promise<LeanNotification | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const update: Record<string, unknown> = { status, ...additionalData };

    switch (status) {
      case 'SENT':
        update.sentAt = new Date();
        break;
      case 'DELIVERED':
        update.deliveredAt = new Date();
        break;
      case 'FAILED':
        update.failedAt = new Date();
        break;
    }

    return NotificationModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean() as Promise<LeanNotification | null>;
  },

  async incrementRetryCount(id: string): Promise<LeanNotification | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return NotificationModel.findByIdAndUpdate(
      id,
      { $inc: { retryCount: 1 } },
      { new: true }
    ).lean() as Promise<LeanNotification | null>;
  },

  async delete(id: string): Promise<LeanNotification | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return NotificationModel.findByIdAndDelete(id).lean() as Promise<LeanNotification | null>;
  },

  async deleteByUser(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) return 0;
    const result = await NotificationModel.deleteMany({ userId: new Types.ObjectId(userId) });
    return result.deletedCount;
  },

  async deleteReadByUser(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) return 0;
    const result = await NotificationModel.deleteMany({
      userId: new Types.ObjectId(userId),
      read: true,
    });
    return result.deletedCount;
  },

  async getStatsForUser(userId: string): Promise<NotificationStats> {
    if (!Types.ObjectId.isValid(userId)) {
      return { total: 0, unread: 0, byChannel: [], byCategory: [], byStatus: [] };
    }

    const userIdObj = new Types.ObjectId(userId);

    const [total, unread, byChannel, byCategory, byStatus] = await Promise.all([
      NotificationModel.countDocuments({ userId: userIdObj }),
      NotificationModel.countDocuments({ userId: userIdObj, read: false }),
      NotificationModel.aggregate([
        { $match: { userId: userIdObj } },
        { $group: { _id: '$channel', count: { $sum: 1 } } },
      ]),
      NotificationModel.aggregate([
        { $match: { userId: userIdObj } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      NotificationModel.aggregate([
        { $match: { userId: userIdObj } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return { total, unread, byChannel, byCategory, byStatus };
  },

  async findPendingScheduled(): Promise<LeanNotification[]> {
    return NotificationModel.find({
      status: 'PENDING',
      scheduledFor: { $lte: new Date() },
    })
      .sort({ priority: 1, scheduledFor: 1 })
      .limit(100)
      .lean() as Promise<LeanNotification[]>;
  },

  async findFailedForRetry(): Promise<LeanNotification[]> {
    return NotificationModel.find({
      status: 'FAILED',
      $expr: { $lt: ['$retryCount', '$maxRetries'] },
    })
      .sort({ failedAt: 1 })
      .limit(50)
      .lean() as Promise<LeanNotification[]>;
  },

  async getUnreadCount(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) return 0;
    return NotificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
  },
};
