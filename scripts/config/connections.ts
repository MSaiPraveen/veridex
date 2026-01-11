/**
 * Database connection mapping.
 * Maps logical database names to their purpose.
 * 
 * Service → Database Ownership:
 * - auth-service       → veridex-auth
 * - user-org-service   → veridex-user-org
 * - product-service    → veridex-products
 * - document-service   → veridex-documents
 * - compliance-service → veridex-compliance
 * - notification-service → veridex-notifications
 * - audit-log-service  → veridex-audit
 */

export const DATABASE_MAP = {
  auth: {
    name: 'veridex-auth',
    service: 'auth-service',
    collections: ['users', 'refresh_tokens'],
  },
  userOrg: {
    name: 'veridex-user-org',
    service: 'user-org-service',
    collections: ['users', 'organizations', 'memberships'],
  },
  products: {
    name: 'veridex-products',
    service: 'product-service',
    collections: ['products'],
  },
  documents: {
    name: 'veridex-documents',
    service: 'document-service',
    collections: ['documents'],
  },
  compliance: {
    name: 'veridex-compliance',
    service: 'compliance-service',
    collections: ['compliance_rules', 'compliance_results'],
  },
  audit: {
    name: 'veridex-audit',
    service: 'audit-log-service',
    collections: ['audit_logs'],
  },
  notifications: {
    name: 'veridex-notifications',
    service: 'notification-service',
    collections: ['notifications', 'notification_preferences'],
  },
} as const;

export type DatabaseKey = keyof typeof DATABASE_MAP;
