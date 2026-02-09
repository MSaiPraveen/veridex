/**
 * Admin Portal Hooks
 * 
 * Centralized exports for all custom hooks.
 */

// Auth
export {
  useAdminAuth,
  useSessionActivity,
  AdminAuthProvider,
  type AdminUser,
  type AuthState,
  type AuthContextType,
} from './use-admin-auth';

// Workflows
export {
  useWorkflows,
  useWorkflow,
  useReviewQueue,
  useQueueStats,
  useReasonCodes,
  useWorkflowActions,
  useWorkflowHistory,
  type WorkflowState,
  type WorkflowPriority,
  type SLAStatus,
  type EntityType,
  type WorkflowItem,
  type QueueStats,
  type ReviewerWorkload,
  type DecisionReasonCodes,
  type WorkflowFilters,
  type DecisionInput,
} from './use-workflows';

// Audit Logs
export {
  useAuditLogs,
  useAuditLogEntry,
  useEntityTimeline,
  useAuditStats,
  useSecurityAlerts,
  useFailedActions,
  useAuditExport,
  type AdminAuditAction,
  type AdminAuditSeverity,
  type AdminAuditEntityType,
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditStats,
} from './use-audit-logs';

// Organizations
export {
  useOrganizations,
  useOrganization,
  useOrganizationActions,
  usePendingOrganizationsCount,
  type OrgStatus,
  type OrgType,
  type Organization,
  type OrgFilters,
  type OrgDecision,
} from './use-organizations';

// Users
export {
  useUsers,
  useUser,
  useUserActions,
  type UserStatus,
  type UserRole,
  type User,
  type UserFilters,
  type CreateUserInput,
  type UpdateUserInput,
} from './use-users';

// Products
export {
  useProducts,
  useProduct,
  useProductActions,
  useOrganizationProducts,
  useComplianceQueue,
  type ProductStatus,
  type ComplianceStatus,
  type ProductCategory,
  type Product,
  type ProductFilters,
  type UpdateProductInput,
} from './use-products';
