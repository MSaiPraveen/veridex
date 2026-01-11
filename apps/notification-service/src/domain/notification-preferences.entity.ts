import { Schema, model, Document, Types, FlattenMaps } from 'mongoose';
import { NotificationChannel, NotificationCategory } from './notification.entity';

// Channel settings
export interface IChannelSettings {
  enabled: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;
  frequency?: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
}

// Category preference
export interface ICategoryPreference {
  category: NotificationCategory;
  channels: NotificationChannel[];
  enabled: boolean;
}

// Base interface without Document methods
export interface INotificationPreferencesBase {
  userId: Types.ObjectId;
  organizationId?: Types.ObjectId;
  email: {
    enabled: boolean;
    address?: string;
    digestEnabled: boolean;
    digestFrequency: 'DAILY' | 'WEEKLY' | 'NONE';
  };
  inApp: {
    enabled: boolean;
    showBadge: boolean;
    playSound: boolean;
  };
  sms: {
    enabled: boolean;
    phoneNumber?: string;
  };
  push: {
    enabled: boolean;
    deviceTokens: string[];
  };
  webhook: {
    enabled: boolean;
    url?: string;
    secret?: string;
  };
  categoryPreferences: ICategoryPreference[];
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// Full document interface
export interface INotificationPreferences extends Document, INotificationPreferencesBase {
  _id: Types.ObjectId;
}

// Lean document type for queries with .lean()
export type LeanNotificationPreferences = FlattenMaps<INotificationPreferencesBase> & { _id: Types.ObjectId };

const CategoryPreferenceSchema = new Schema<ICategoryPreference>(
  {
    category: {
      type: String,
      enum: ['COMPLIANCE', 'DOCUMENT', 'PRODUCT', 'USER', 'SYSTEM', 'ALERT', 'REMINDER'],
      required: true,
    },
    channels: [{
      type: String,
      enum: ['EMAIL', 'IN_APP', 'SMS', 'PUSH', 'WEBHOOK'],
    }],
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    email: {
      enabled: { type: Boolean, default: true },
      address: { type: String },
      digestEnabled: { type: Boolean, default: false },
      digestFrequency: {
        type: String,
        enum: ['DAILY', 'WEEKLY', 'NONE'],
        default: 'DAILY',
      },
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      showBadge: { type: Boolean, default: true },
      playSound: { type: Boolean, default: true },
    },
    sms: {
      enabled: { type: Boolean, default: false },
      phoneNumber: { type: String },
    },
    push: {
      enabled: { type: Boolean, default: false },
      deviceTokens: [{ type: String }],
    },
    webhook: {
      enabled: { type: Boolean, default: false },
      url: { type: String },
      secret: { type: String },
    },
    categoryPreferences: [CategoryPreferenceSchema],
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '08:00' },
      timezone: { type: String, default: 'UTC' },
    },
  },
  { timestamps: true }
);

NotificationPreferencesSchema.index({ userId: 1 }, { unique: true });

export const NotificationPreferencesModel = model<INotificationPreferences>(
  'NotificationPreferences',
  NotificationPreferencesSchema
);
