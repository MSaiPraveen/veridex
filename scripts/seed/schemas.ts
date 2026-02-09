import { Schema, Connection } from 'mongoose';

/**
 * Script-level schemas that mirror service entities.
 * These are registered on script connections, NOT the service connections.
 * 
 * This prevents import conflicts while maintaining schema compatibility.
 */

// ============================================================
// AUTH SERVICE SCHEMAS
// ============================================================

export const AuthUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['CONSUMER', 'MERCHANT', 'ADMIN', 'SUPER_ADMIN'] },
    organizationId: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Admin User Schema (separate collection for admin portal authentication)
export const AdminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_REVIEWER', 'VIEWER'], required: true },
    status: { type: String, enum: ['ACTIVE', 'PENDING_MFA', 'LOCKED', 'DEACTIVATED'], default: 'ACTIVE' },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    mfaBackupCodes: { type: [String] },
    allowedIPs: { type: [String], default: [] },
    lastLoginAt: Date,
    lastLoginIP: String,
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    passwordChangedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    deactivatedAt: Date,
    deactivatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, collection: 'admin_users' }
);

// ============================================================
// USER-ORG SERVICE SCHEMAS
// ============================================================

export const UserProfileSchema = new Schema(
  {
    authUserId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    role: { type: String, required: true, enum: ['CONSUMER', 'MERCHANT', 'ADMIN', 'SUPER_ADMIN'] },
    firstName: { type: String },
    lastName: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['MERCHANT'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MembershipSchema = new Schema(
  {
    userId: { type: String, required: true },
    organizationId: { type: String, required: true },
    role: { type: String, required: true, enum: ['OWNER', 'ADMIN', 'STAFF'] },
  },
  { timestamps: true }
);

MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

// ============================================================
// PRODUCT SERVICE SCHEMAS
// ============================================================

export const ProductSchema = new Schema(
  {
    merchantId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    complianceStatus: {
      type: String,
      enum: ['PENDING', 'COMPLIANT', 'NON_COMPLIANT'],
      default: 'PENDING',
    },
    metadata: { type: Object },
  },
  { timestamps: true }
);

ProductSchema.index({ merchantId: 1 });
ProductSchema.index({ complianceStatus: 1 });

// ============================================================
// DOCUMENT SERVICE SCHEMAS
// ============================================================

export const DocumentSchema = new Schema(
  {
    ownerId: { type: String, required: true },
    productId: { type: String },
    type: {
      type: String,
      enum: ['LAB_REPORT', 'BUSINESS_LICENSE', 'INSURANCE'],
      required: true,
    },
    filePath: { type: String, required: true },
    extracted: {
      validUntil: Date,
      issuedTo: String,
      licenseNumber: String,
      labName: String,
      policyNumber: String,
      coverageAmount: Number,
    },
    extractionStatus: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    failureReason: { type: String },
  },
  { timestamps: true }
);

DocumentSchema.index({ ownerId: 1 });
DocumentSchema.index({ productId: 1 });
DocumentSchema.index({ type: 1 });

// ============================================================
// MODEL FACTORY FUNCTIONS
// ============================================================

/**
 * Get or create models on a specific connection.
 * Mongoose caches models by name, so we check first.
 */

export function getAuthUserModel(conn: Connection) {
  return conn.models.User || conn.model('User', AuthUserSchema);
}

export function getAdminUserModel(conn: Connection) {
  return conn.models.AdminUser || conn.model('AdminUser', AdminUserSchema);
}

export function getUserProfileModel(conn: Connection) {
  return conn.models.User || conn.model('User', UserProfileSchema);
}

export function getOrganizationModel(conn: Connection) {
  return conn.models.Organization || conn.model('Organization', OrganizationSchema);
}

export function getMembershipModel(conn: Connection) {
  return conn.models.Membership || conn.model('Membership', MembershipSchema);
}

export function getProductModel(conn: Connection) {
  return conn.models.Product || conn.model('Product', ProductSchema);
}

export function getDocumentModel(conn: Connection) {
  return conn.models.Document || conn.model('Document', DocumentSchema);
}
