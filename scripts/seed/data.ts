import bcrypt from 'bcryptjs';

/**
 * Seed data generators.
 * Creates realistic test data for all entities.
 */

// ============================================================
// CONSTANTS
// ============================================================

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Password123!';

// ============================================================
// CONSUMER DATA
// ============================================================

export interface ConsumerData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export const CONSUMERS: ConsumerData[] = [
  { email: 'consumer1@example.com', firstName: 'Alice', lastName: 'Johnson', password: DEFAULT_PASSWORD },
  { email: 'consumer2@example.com', firstName: 'Bob', lastName: 'Smith', password: DEFAULT_PASSWORD },
  { email: 'consumer3@example.com', firstName: 'Carol', lastName: 'Williams', password: DEFAULT_PASSWORD },
  { email: 'consumer4@example.com', firstName: 'David', lastName: 'Brown', password: DEFAULT_PASSWORD },
  { email: 'consumer5@example.com', firstName: 'Emma', lastName: 'Davis', password: DEFAULT_PASSWORD },
  { email: 'consumer6@example.com', firstName: 'Frank', lastName: 'Miller', password: DEFAULT_PASSWORD },
  { email: 'consumer7@example.com', firstName: 'Grace', lastName: 'Wilson', password: DEFAULT_PASSWORD },
  { email: 'consumer8@example.com', firstName: 'Henry', lastName: 'Moore', password: DEFAULT_PASSWORD },
  { email: 'consumer9@example.com', firstName: 'Ivy', lastName: 'Taylor', password: DEFAULT_PASSWORD },
  { email: 'consumer10@example.com', firstName: 'Jack', lastName: 'Anderson', password: DEFAULT_PASSWORD },
];

// ============================================================
// MERCHANT DATA
// ============================================================

export interface MerchantData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  organizationName: string;
  membershipRole: 'OWNER' | 'ADMIN' | 'STAFF';
}

export const MERCHANTS: MerchantData[] = [
  // GreenLeaf Labs - 2 members
  { email: 'owner@greenleaflabs.com', firstName: 'Michael', lastName: 'Green', password: DEFAULT_PASSWORD, organizationName: 'GreenLeaf Labs', membershipRole: 'OWNER' },
  { email: 'staff@greenleaflabs.com', firstName: 'Sarah', lastName: 'Leaf', password: DEFAULT_PASSWORD, organizationName: 'GreenLeaf Labs', membershipRole: 'STAFF' },
  
  // Pure Wellness Co - 2 members
  { email: 'owner@purewellness.co', firstName: 'Jennifer', lastName: 'Pure', password: DEFAULT_PASSWORD, organizationName: 'Pure Wellness Co', membershipRole: 'OWNER' },
  { email: 'admin@purewellness.co', firstName: 'Robert', lastName: 'Wellness', password: DEFAULT_PASSWORD, organizationName: 'Pure Wellness Co', membershipRole: 'ADMIN' },
  
  // Herbal Remedies Inc - 1 member
  { email: 'owner@herbalremedies.inc', firstName: 'Patricia', lastName: 'Herbal', password: DEFAULT_PASSWORD, organizationName: 'Herbal Remedies Inc', membershipRole: 'OWNER' },
];

// Admin user
export const ADMIN_USER = {
  email: 'admin@veridex.io',
  firstName: 'System',
  lastName: 'Admin',
  password: 'AdminSecure123!',
};

// ============================================================
// PRODUCT DATA
// ============================================================

export interface ProductData {
  name: string;
  category: string;
  organizationName: string;
  complianceStatus: 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT';
}

export const PRODUCTS: ProductData[] = [
  // GreenLeaf Labs products
  { name: 'CBD Oil 500mg', category: 'CBD', organizationName: 'GreenLeaf Labs', complianceStatus: 'PENDING' },
  { name: 'CBD Oil 1000mg', category: 'CBD', organizationName: 'GreenLeaf Labs', complianceStatus: 'COMPLIANT' },
  { name: 'Hemp Gummies 25mg', category: 'EDIBLES', organizationName: 'GreenLeaf Labs', complianceStatus: 'COMPLIANT' },
  { name: 'CBD Topical Cream', category: 'TOPICALS', organizationName: 'GreenLeaf Labs', complianceStatus: 'PENDING' },
  { name: 'Full Spectrum Tincture', category: 'TINCTURES', organizationName: 'GreenLeaf Labs', complianceStatus: 'NON_COMPLIANT' },
  { name: 'Sleep Aid Capsules', category: 'CAPSULES', organizationName: 'GreenLeaf Labs', complianceStatus: 'PENDING' },
  
  // Pure Wellness Co products
  { name: 'Organic Hemp Extract', category: 'CBD', organizationName: 'Pure Wellness Co', complianceStatus: 'COMPLIANT' },
  { name: 'Relaxation Drops', category: 'TINCTURES', organizationName: 'Pure Wellness Co', complianceStatus: 'PENDING' },
  { name: 'Pain Relief Balm', category: 'TOPICALS', organizationName: 'Pure Wellness Co', complianceStatus: 'COMPLIANT' },
  { name: 'Daily Wellness Caps', category: 'CAPSULES', organizationName: 'Pure Wellness Co', complianceStatus: 'NON_COMPLIANT' },
  { name: 'Pet CBD Oil', category: 'PET', organizationName: 'Pure Wellness Co', complianceStatus: 'PENDING' },
  { name: 'Recovery Cream', category: 'TOPICALS', organizationName: 'Pure Wellness Co', complianceStatus: 'PENDING' },
  { name: 'Focus Gummies', category: 'EDIBLES', organizationName: 'Pure Wellness Co', complianceStatus: 'COMPLIANT' },
  
  // Herbal Remedies Inc products
  { name: 'Traditional Hemp Oil', category: 'CBD', organizationName: 'Herbal Remedies Inc', complianceStatus: 'PENDING' },
  { name: 'Herbal Sleep Aid', category: 'CAPSULES', organizationName: 'Herbal Remedies Inc', complianceStatus: 'PENDING' },
  { name: 'Muscle Relief Gel', category: 'TOPICALS', organizationName: 'Herbal Remedies Inc', complianceStatus: 'COMPLIANT' },
  { name: 'Calm Drops', category: 'TINCTURES', organizationName: 'Herbal Remedies Inc', complianceStatus: 'NON_COMPLIANT' },
  { name: 'Energy Boost Gummies', category: 'EDIBLES', organizationName: 'Herbal Remedies Inc', complianceStatus: 'PENDING' },
  { name: 'Immunity Capsules', category: 'CAPSULES', organizationName: 'Herbal Remedies Inc', complianceStatus: 'PENDING' },
  { name: 'Skin Repair Lotion', category: 'TOPICALS', organizationName: 'Herbal Remedies Inc', complianceStatus: 'PENDING' },
];

// ============================================================
// DOCUMENT DATA
// ============================================================

export type DocumentType = 'LAB_REPORT' | 'BUSINESS_LICENSE' | 'INSURANCE';
export type ExtractionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface DocumentData {
  type: DocumentType;
  productName: string; // Links to product
  extractionStatus: ExtractionStatus;
  isValid: boolean; // Whether document passes compliance
  failureReason?: string;
}

// Helper to generate future/past dates
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function generateExtractedData(type: DocumentType, isValid: boolean, orgName: string) {
  const baseDate = isValid ? daysFromNow(365) : daysFromNow(-30); // Valid = future, Invalid = expired
  
  switch (type) {
    case 'LAB_REPORT':
      return {
        validUntil: baseDate,
        issuedTo: orgName,
        labName: isValid ? 'Certified Labs Inc.' : 'Unknown Lab',
      };
    case 'BUSINESS_LICENSE':
      return {
        validUntil: baseDate,
        issuedTo: orgName,
        licenseNumber: `LIC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      };
    case 'INSURANCE':
      return {
        validUntil: baseDate,
        issuedTo: orgName,
        policyNumber: `POL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        coverageAmount: isValid ? 1000000 : 50000, // Valid = adequate, Invalid = insufficient
      };
  }
}

// Documents linked to specific products for realistic testing
export const DOCUMENTS: DocumentData[] = [
  // Valid documents for compliant products
  { type: 'LAB_REPORT', productName: 'CBD Oil 1000mg', extractionStatus: 'SUCCESS', isValid: true },
  { type: 'BUSINESS_LICENSE', productName: 'CBD Oil 1000mg', extractionStatus: 'SUCCESS', isValid: true },
  { type: 'INSURANCE', productName: 'CBD Oil 1000mg', extractionStatus: 'SUCCESS', isValid: true },
  
  { type: 'LAB_REPORT', productName: 'Hemp Gummies 25mg', extractionStatus: 'SUCCESS', isValid: true },
  { type: 'LAB_REPORT', productName: 'Organic Hemp Extract', extractionStatus: 'SUCCESS', isValid: true },
  { type: 'BUSINESS_LICENSE', productName: 'Organic Hemp Extract', extractionStatus: 'SUCCESS', isValid: true },
  
  { type: 'LAB_REPORT', productName: 'Pain Relief Balm', extractionStatus: 'SUCCESS', isValid: true },
  { type: 'LAB_REPORT', productName: 'Focus Gummies', extractionStatus: 'SUCCESS', isValid: true },
  { type: 'LAB_REPORT', productName: 'Muscle Relief Gel', extractionStatus: 'SUCCESS', isValid: true },
  
  // Invalid documents for non-compliant products (expired, failed extraction, etc.)
  { type: 'LAB_REPORT', productName: 'Full Spectrum Tincture', extractionStatus: 'SUCCESS', isValid: false },
  { type: 'LAB_REPORT', productName: 'Daily Wellness Caps', extractionStatus: 'FAILED', isValid: false, failureReason: 'Unable to parse document format' },
  { type: 'LAB_REPORT', productName: 'Calm Drops', extractionStatus: 'SUCCESS', isValid: false },
  { type: 'INSURANCE', productName: 'Calm Drops', extractionStatus: 'SUCCESS', isValid: false },
  
  // Pending documents for pending products
  { type: 'LAB_REPORT', productName: 'CBD Oil 500mg', extractionStatus: 'PENDING', isValid: true },
  { type: 'LAB_REPORT', productName: 'CBD Topical Cream', extractionStatus: 'PENDING', isValid: true },
  { type: 'LAB_REPORT', productName: 'Sleep Aid Capsules', extractionStatus: 'PENDING', isValid: true },
  { type: 'LAB_REPORT', productName: 'Relaxation Drops', extractionStatus: 'PENDING', isValid: true },
  { type: 'LAB_REPORT', productName: 'Pet CBD Oil', extractionStatus: 'PENDING', isValid: true },
  { type: 'LAB_REPORT', productName: 'Recovery Cream', extractionStatus: 'PENDING', isValid: true },
  { type: 'LAB_REPORT', productName: 'Traditional Hemp Oil', extractionStatus: 'PENDING', isValid: true },
  { type: 'LAB_REPORT', productName: 'Herbal Sleep Aid', extractionStatus: 'PENDING', isValid: true },
  { type: 'LAB_REPORT', productName: 'Energy Boost Gummies', extractionStatus: 'PENDING', isValid: true },
  { type: 'LAB_REPORT', productName: 'Immunity Capsules', extractionStatus: 'PENDING', isValid: true },
  { type: 'LAB_REPORT', productName: 'Skin Repair Lotion', extractionStatus: 'PENDING', isValid: true },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function generateFilePath(type: DocumentType, productId: string): string {
  const prefix = type.toLowerCase().replace('_', '-');
  return `/uploads/${prefix}/${productId}/${Date.now()}.pdf`;
}
