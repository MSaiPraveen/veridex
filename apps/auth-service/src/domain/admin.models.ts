/**
 * Admin Auth Domain Models
 * 
 * MongoDB schemas for admin authentication.
 * These are SEPARATE from public user schemas.
 */

import { Schema, model, Document, Types } from 'mongoose';

// ============================================
// ADMIN USER
// ============================================

export interface IAdminUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'COMPLIANCE_REVIEWER' | 'VIEWER';
  status: 'ACTIVE' | 'PENDING_MFA' | 'LOCKED' | 'DEACTIVATED';
  
  // MFA
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: string[];
  
  // Security
  allowedIPs?: string[];
  lastLoginAt?: Date;
  lastLoginIP?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  
  // Audit
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deactivatedAt?: Date;
  deactivatedBy?: Types.ObjectId;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_REVIEWER', 'VIEWER'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING_MFA', 'LOCKED', 'DEACTIVATED'],
      default: 'PENDING_MFA',
      index: true,
    },
    
    // MFA
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
      select: false, // Never return by default
    },
    mfaBackupCodes: {
      type: [String],
      select: false, // Never return by default
    },
    
    // Security
    allowedIPs: {
      type: [String],
      default: [],
    },
    lastLoginAt: Date,
    lastLoginIP: String,
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: Date,
    passwordChangedAt: Date,
    
    // Audit
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: false, // Optional for system-created admins
    },
    deactivatedAt: Date,
    deactivatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
  },
  {
    timestamps: true,
    collection: 'admin_users',
  }
);

// Indexes for performance
AdminUserSchema.index({ email: 1, status: 1 });
AdminUserSchema.index({ role: 1, status: 1 });
AdminUserSchema.index({ createdAt: -1 });

export const AdminUser = model<IAdminUser>('AdminUser', AdminUserSchema);

// ============================================
// ADMIN SESSION
// ============================================

export interface IAdminSession extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  tokenHash: string;
  refreshTokenHash?: string;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  
  // MFA
  mfaVerified: boolean;
  mfaVerifiedAt?: Date;
  
  // Lifecycle
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  
  // Revocation
  revoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  revokedBy?: Types.ObjectId;
}

const AdminSessionSchema = new Schema<IAdminSession>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    deviceId: String,
    
    // MFA
    mfaVerified: {
      type: Boolean,
      default: false,
    },
    mfaVerifiedAt: Date,
    
    // Lifecycle
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    
    // Revocation
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: Date,
    revokedReason: String,
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
  },
  {
    timestamps: true,
    collection: 'admin_sessions',
  }
);

// TTL index - automatically delete expired sessions
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for queries
AdminSessionSchema.index({ adminId: 1, revoked: 1 });
AdminSessionSchema.index({ tokenHash: 1, revoked: 1 });

export const AdminSession = model<IAdminSession>('AdminSession', AdminSessionSchema);

// ============================================
// ADMIN MFA SETUP
// ============================================

export interface IAdminMFASetup extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  tempSecret: string;
  verified: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const AdminMFASetupSchema = new Schema<IAdminMFASetup>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: true,
      unique: true,
    },
    tempSecret: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'admin_mfa_setup',
  }
);

// TTL index - automatically delete expired setups
AdminMFASetupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminMFASetup = model<IAdminMFASetup>('AdminMFASetup', AdminMFASetupSchema);

// ============================================
// ADMIN LOGIN ATTEMPT (For Rate Limiting)
// ============================================

export interface IAdminLoginAttempt extends Document {
  _id: Types.ObjectId;
  email: string;
  ipAddress: string;
  success: boolean;
  failureReason?: string;
  userAgent: string;
  timestamp: Date;
}

const AdminLoginAttemptSchema = new Schema<IAdminLoginAttempt>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    success: {
      type: Boolean,
      required: true,
    },
    failureReason: String,
    userAgent: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: 'admin_login_attempts',
  }
);

// TTL index - keep attempts for 24 hours
AdminLoginAttemptSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

// Compound indexes for rate limiting queries
AdminLoginAttemptSchema.index({ ipAddress: 1, timestamp: -1 });
AdminLoginAttemptSchema.index({ email: 1, timestamp: -1 });

export const AdminLoginAttempt = model<IAdminLoginAttempt>('AdminLoginAttempt', AdminLoginAttemptSchema);
