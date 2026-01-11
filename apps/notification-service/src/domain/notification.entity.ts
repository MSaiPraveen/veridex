import { Schema, model, Document, Types, FlattenMaps } from 'mongoose';

// Notification channel types
export type NotificationChannel = 'EMAIL' | 'IN_APP' | 'SMS' | 'PUSH' | 'WEBHOOK';

// Notification priority levels
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

// Notification status
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';

// Notification category
export type NotificationCategory = 
  | 'COMPLIANCE' 
  | 'DOCUMENT' 
  | 'PRODUCT' 
  | 'USER' 
  | 'SYSTEM' 
  | 'ALERT' 
  | 'REMINDER';

// Base interface without Document methods
export interface INotificationBase {
  userId: Types.ObjectId;
  organizationId?: Types.ObjectId;
  channel: NotificationChannel;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  htmlContent?: string;
  data?: Record<string, unknown>;
  recipientEmail?: string;
  recipientPhone?: string;
  webhookUrl?: string;
  read: boolean;
  readAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  scheduledFor?: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  sourceService?: string;
  sourceEventId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Full document interface
export interface INotification extends Document, INotificationBase {
  _id: Types.ObjectId;
}

// Lean document type for queries with .lean()
export type LeanNotification = FlattenMaps<INotificationBase> & { _id: Types.ObjectId };

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    channel: {
      type: String,
      enum: ['EMAIL', 'IN_APP', 'SMS', 'PUSH', 'WEBHOOK'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['COMPLIANCE', 'DOCUMENT', 'PRODUCT', 'USER', 'SYSTEM', 'ALERT', 'REMINDER'],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL',
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ'],
      default: 'PENDING',
      index: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 2000 },
    htmlContent: { type: String, maxlength: 50000 },
    data: { type: Map, of: Schema.Types.Mixed },
    recipientEmail: { type: String },
    recipientPhone: { type: String },
    webhookUrl: { type: String },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    failedAt: { type: Date },
    failureReason: { type: String },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    scheduledFor: { type: Date, index: true },
    expiresAt: { type: Date, index: true },
    actionUrl: { type: String },
    actionLabel: { type: String },
    templateId: { type: String },
    templateData: { type: Map, of: Schema.Types.Mixed },
    sourceService: { type: String },
    sourceEventId: { type: String },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ status: 1, scheduledFor: 1 });
NotificationSchema.index({ category: 1, createdAt: -1 });
NotificationSchema.index({ organizationId: 1, category: 1 });

export const NotificationModel = model<INotification>(
  'Notification',
  NotificationSchema
);
