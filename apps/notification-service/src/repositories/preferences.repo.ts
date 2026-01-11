import { NotificationPreferencesModel, INotificationPreferences, LeanNotificationPreferences, INotificationPreferencesBase } from '../domain/notification-preferences.entity';
import { Types } from 'mongoose';

export const PreferencesRepo = {
  async findByUserId(userId: string): Promise<LeanNotificationPreferences | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    return NotificationPreferencesModel.findOne({ userId: new Types.ObjectId(userId) })
      .lean() as Promise<LeanNotificationPreferences | null>;
  },

  async upsert(
    userId: string,
    data: Partial<INotificationPreferencesBase>
  ): Promise<INotificationPreferences> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const result = await NotificationPreferencesModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { ...data, userId: new Types.ObjectId(userId) } },
      { upsert: true, new: true }
    );
    return result;
  },

  async create(data: Partial<INotificationPreferencesBase>): Promise<INotificationPreferences> {
    return NotificationPreferencesModel.create(data);
  },

  async update(
    userId: string,
    data: Partial<INotificationPreferencesBase>
  ): Promise<LeanNotificationPreferences | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    return NotificationPreferencesModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: data },
      { new: true }
    ).lean() as Promise<LeanNotificationPreferences | null>;
  },

  async delete(userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) return false;
    const result = await NotificationPreferencesModel.deleteOne({
      userId: new Types.ObjectId(userId),
    });
    return result.deletedCount > 0;
  },

  async getDefaultPreferences(): Promise<Partial<INotificationPreferencesBase>> {
    return {
      email: {
        enabled: true,
        digestEnabled: false,
        digestFrequency: 'DAILY',
      },
      inApp: {
        enabled: true,
        showBadge: true,
        playSound: true,
      },
      sms: {
        enabled: false,
      },
      push: {
        enabled: false,
        deviceTokens: [],
      },
      webhook: {
        enabled: false,
      },
      categoryPreferences: [
        { category: 'COMPLIANCE', channels: ['IN_APP', 'EMAIL'], enabled: true },
        { category: 'DOCUMENT', channels: ['IN_APP'], enabled: true },
        { category: 'PRODUCT', channels: ['IN_APP'], enabled: true },
        { category: 'USER', channels: ['IN_APP', 'EMAIL'], enabled: true },
        { category: 'SYSTEM', channels: ['IN_APP'], enabled: true },
        { category: 'ALERT', channels: ['IN_APP', 'EMAIL'], enabled: true },
        { category: 'REMINDER', channels: ['IN_APP'], enabled: true },
      ],
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
    };
  },

  async addDeviceToken(userId: string, token: string): Promise<LeanNotificationPreferences | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    return NotificationPreferencesModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $addToSet: { 'push.deviceTokens': token } },
      { new: true }
    ).lean() as Promise<LeanNotificationPreferences | null>;
  },

  async removeDeviceToken(userId: string, token: string): Promise<LeanNotificationPreferences | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    return NotificationPreferencesModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $pull: { 'push.deviceTokens': token } },
      { new: true }
    ).lean() as Promise<LeanNotificationPreferences | null>;
  },
};
