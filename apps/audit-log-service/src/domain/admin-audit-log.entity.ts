// Admin-specific audit log types and schemas
// Separate from public user audit to maintain complete isolation

import { Schema, model, Document, Types, FlattenMaps } from 'mongoose';

// Admin-specific action types
export type AdminAuditAction =
  // Authentication
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_MFA_SETUP'
  | 'ADMIN_MFA_VERIFIED'
  | 'ADMIN_MFA_FAILED'
  | 'ADMIN_PASSWORD_RESET'
  | 'ADMIN_SESSION_EXPIRED'
  // Organization management
  | 'ORG_VIEWED'
  | 'ORG_APPROVED'
  | 'ORG_REJECTED'
  | 'ORG_SUSPENDED'
  | 'ORG_REACTIVATED'
  // Document management
  | 'DOC_VIEWED'
  | 'DOC_APPROVED'
  | 'DOC_REJECTED'
  | 'DOC_DOWNLOADED'
  // Compliance actions
  | 'COMPLIANCE_VIEWED'
  | 'COMPLIANCE_APPROVED'
  | 'COMPLIANCE_REJECTED'
  | 'COMPLIANCE_OVERRIDE'
  | 'COMPLIANCE_ASSIGNED'
  // Product/Batch actions
  | 'PRODUCT_VIEWED'
  | 'PRODUCT_SUSPENDED'
  | 'PRODUCT_REACTIVATED'
  | 'BATCH_APPROVED'
  | 'BATCH_QUARANTINED'
  | 'BATCH_RECALLED'
  // Rule management
  | 'RULE_VIEWED'
  | 'RULE_CREATED'
  | 'RULE_UPDATED'
  | 'RULE_ACTIVATED'
  | 'RULE_DEACTIVATED'
  | 'RULE_TESTED'
  // Admin user management
  | 'ADMIN_USER_CREATED'
  | 'ADMIN_USER_UPDATED'
  | 'ADMIN_USER_DEACTIVATED'
  | 'ADMIN_USER_REACTIVATED'
  | 'ADMIN_USER_UNLOCKED'
  | 'ADMIN_USER_MFA_RESET'
  | 'ADMIN_ROLE_CHANGED'
  // Settings & config
  | 'SETTINGS_UPDATED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'SYSTEM_CONFIG_CHANGED'
  // Data export
  | 'AUDIT_EXPORT'
  | 'DATA_EXPORT';

// Admin audit entity types
export type AdminAuditEntityType =
  | 'ADMIN_USER'
  | 'ORGANIZATION'
  | 'DOCUMENT'
  | 'PRODUCT'
  | 'BATCH'
  | 'COMPLIANCE_ITEM'
  | 'COMPLIANCE_RULE'
  | 'SETTINGS'
  | 'API_KEY'
  | 'SYSTEM';

// Severity levels for admin actions
export type AdminAuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURITY';

// Reason codes for admin actions
export type AdminReasonCode =
  | 'ROUTINE_REVIEW'
  | 'COMPLIANCE_REQUIREMENT'
  | 'USER_REQUEST'
  | 'SECURITY_CONCERN'
  | 'POLICY_VIOLATION'
  | 'REGULATORY_REQUEST'
  | 'INVESTIGATION'
  | 'MAINTENANCE'
  | 'ERROR_CORRECTION'
  | 'EXCEPTION_GRANTED'
  | 'OTHER';

// Base interface for admin audit logs
export interface IAdminAuditLogBase {
  // Admin actor info
  adminId: Types.ObjectId;
  adminEmail: string;
  adminRole: string;
  
  // Action details
  action: AdminAuditAction;
  entityType: AdminAuditEntityType;
  entityId: string;
  entityName?: string;
  
  // Severity and reason
  severity: AdminAuditSeverity;
  reasonCode: AdminReasonCode;
  reasonDetails?: string;
  
  // Request context
  ipAddress: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  
  // State changes (for auditable mutations)
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  
  // Additional metadata
  metadata: Record<string, unknown>;
  
  // Timing
  timestamp: Date;
  duration?: number;
  
  // Success/failure
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

// Full document interface
export interface IAdminAuditLog extends Document, IAdminAuditLogBase {
  _id: Types.ObjectId;
}

// Lean document type
export type LeanAdminAuditLog = FlattenMaps<IAdminAuditLogBase> & { _id: Types.ObjectId };

// Schema definition - designed for immutability and compliance
const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminId: { 
      type: Schema.Types.ObjectId, 
      required: true, 
      index: true,
      immutable: true,
    },
    adminEmail: { 
      type: String, 
      required: true,
      immutable: true,
    },
    adminRole: { 
      type: String, 
      required: true, 
      index: true,
      immutable: true,
    },
    action: { 
      type: String, 
      required: true, 
      index: true,
      immutable: true,
    },
    entityType: { 
      type: String, 
      required: true,
      index: true,
      immutable: true,
    },
    entityId: { 
      type: String, 
      required: true, 
      index: true,
      immutable: true,
    },
    entityName: { 
      type: String,
      immutable: true,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL', 'SECURITY'],
      default: 'INFO',
      index: true,
      immutable: true,
    },
    reasonCode: {
      type: String,
      required: true,
      index: true,
      immutable: true,
    },
    reasonDetails: {
      type: String,
      maxlength: 2000,
      immutable: true,
    },
    ipAddress: { 
      type: String, 
      required: true,
      immutable: true,
    },
    userAgent: { 
      type: String,
      immutable: true,
    },
    requestId: { 
      type: String, 
      index: true,
      immutable: true,
    },
    sessionId: { 
      type: String, 
      index: true,
      immutable: true,
    },
    previousState: { 
      type: Schema.Types.Mixed,
      immutable: true,
    },
    newState: { 
      type: Schema.Types.Mixed,
      immutable: true,
    },
    metadata: { 
      type: Schema.Types.Mixed, 
      required: true, 
      default: {},
      immutable: true,
    },
    timestamp: { 
      type: Date, 
      required: true, 
      index: true,
      immutable: true,
    },
    duration: { 
      type: Number,
      immutable: true,
    },
    success: { 
      type: Boolean, 
      required: true, 
      default: true,
      immutable: true,
    },
    errorCode: { 
      type: String,
      immutable: true,
    },
    errorMessage: { 
      type: String,
      immutable: true,
    },
  },
  {
    timestamps: false, // We use our own timestamp field
    collection: 'admin_audit_logs',
  }
);

// Compound indexes for common query patterns
AdminAuditLogSchema.index({ adminId: 1, timestamp: -1 });
AdminAuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AdminAuditLogSchema.index({ action: 1, timestamp: -1 });
AdminAuditLogSchema.index({ severity: 1, timestamp: -1 });
AdminAuditLogSchema.index({ timestamp: -1 }); // For chronological queries

// TTL index - keep admin audit logs for 7 years (regulatory requirement)
// 7 years = 7 * 365 * 24 * 60 * 60 = 220752000 seconds
// AdminAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 220752000 });

// Block any updates to documents (immutability enforcement)
AdminAuditLogSchema.pre('updateOne', function() {
  throw new Error('Admin audit logs are immutable and cannot be updated');
});

AdminAuditLogSchema.pre('updateMany', function() {
  throw new Error('Admin audit logs are immutable and cannot be updated');
});

AdminAuditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Admin audit logs are immutable and cannot be updated');
});

AdminAuditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Admin audit logs are immutable and cannot be deleted');
});

AdminAuditLogSchema.pre('deleteOne', function() {
  throw new Error('Admin audit logs are immutable and cannot be deleted');
});

AdminAuditLogSchema.pre('deleteMany', function() {
  throw new Error('Admin audit logs are immutable and cannot be deleted');
});

export const AdminAuditLog = model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);
