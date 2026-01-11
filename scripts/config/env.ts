import 'dotenv/config';

/**
 * Script-level environment configuration.
 * Separate from service configs to maintain isolation.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const DB_URIS = {
  auth: requireEnv('MONGO_AUTH_URI'),
  userOrg: requireEnv('MONGO_USER_ORG_URI'),
  products: requireEnv('MONGO_PRODUCTS_URI'),
  documents: requireEnv('MONGO_DOCUMENTS_URI'),
  compliance: requireEnv('MONGO_COMPLIANCE_URI'),
  audit: requireEnv('MONGO_AUDIT_URI'),
  notifications: requireEnv('MONGO_NOTIFICATIONS_URI'),
} as const;

export type DatabaseName = keyof typeof DB_URIS;
