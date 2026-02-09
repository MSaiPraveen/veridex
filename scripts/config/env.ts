import 'dotenv/config';

/**
 * Script-level environment configuration.
 * Separate from service configs to maintain isolation.
 * 
 * Uses MongoDB Atlas URIs from .env file
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const DB_URIS = {
  auth: requireEnv('MONGO_URI_AUTH'),
  userOrg: requireEnv('MONGO_URI_USERS'),
  products: requireEnv('MONGO_URI_PRODUCTS'),
  documents: requireEnv('MONGO_URI_DOCUMENTS'),
  compliance: requireEnv('MONGO_URI_COMPLIANCE'),
  audit: requireEnv('MONGO_URI_AUDIT'),
  notifications: requireEnv('MONGO_URI_NOTIFICATIONS'),
} as const;

export type DatabaseName = keyof typeof DB_URIS;
