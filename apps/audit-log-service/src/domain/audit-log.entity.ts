import { Schema, model, Document, Types, FlattenMaps } from 'mongoose';

// Audit action categories
export type AuditAction = 
  | 'CREATE' 
  | 'READ' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'EXPORT' 
  | 'IMPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'UPLOAD'
  | 'DOWNLOAD';

// Resource types
export type ResourceType = 
  | 'USER' 
  | 'ORGANIZATION' 
  | 'PRODUCT' 
  | 'DOCUMENT' 
  | 'COMPLIANCE_RULE' 
  | 'COMPLIANCE_RESULT'
  | 'NOTIFICATION'
  | 'SESSION';

// Audit severity levels
export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Base interface without Document methods
export interface IAuditLogBase {
  actorId: Types.ObjectId;
  actorEmail?: string;
  actorRole: string;
  organizationId?: Types.ObjectId;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  description?: string;
  severity: AuditSeverity;
  metadata: Record<string, unknown>;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
  duration?: number;
  createdAt: Date;
}

// Full document interface
export interface IAuditLog extends Document, IAuditLogBase {
  _id: Types.ObjectId;
}

// Lean document type for queries with .lean()
export type LeanAuditLog = FlattenMaps<IAuditLogBase> & { _id: Types.ObjectId };

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, required: true, index: true },
    actorEmail: { type: String },
    actorRole: { type: String, required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, index: true },
    action: { 
      type: String, 
      required: true, 
      enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'UPLOAD', 'DOWNLOAD'],
      index: true,
    },
    resourceType: { 
      type: String, 
      required: true,
      enum: ['USER', 'ORGANIZATION', 'PRODUCT', 'DOCUMENT', 'COMPLIANCE_RULE', 'COMPLIANCE_RESULT', 'NOTIFICATION', 'SESSION'],
      index: true,
    },
    resourceId: { type: String, required: true, index: true },
    resourceName: { type: String },
    description: { type: String, maxlength: 1000 },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, required: true, default: {} },
    changes: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    requestId: { type: String, index: true },
    sessionId: { type: String, index: true },
    success: { type: Boolean, default: true, index: true },
    errorMessage: { type: String },
    duration: { type: Number },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    versionKey: false,
    timestamps: false, // We only use createdAt, no updatedAt
  }
);

/**
 * HARDEN IMMUTABILITY - Audit logs cannot be modified or deleted
 */
AuditLogSchema.pre(['updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'findOneAndUpdate', 'findOneAndDelete'], function () {
  throw new Error('Audit logs are immutable and cannot be modified or deleted');
});

// Compound indexes for common query patterns
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

// TTL index - auto-delete after 2 years (for compliance retention)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

export const AuditLogModel = model<IAuditLog>('AuditLog', AuditLogSchema);
