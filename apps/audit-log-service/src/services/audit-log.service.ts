import { Types } from 'mongoose';
import { AuditLogRepo, AuditQueryOptions, PaginatedAuditLogs, AuditStats } from '../repositories/audit-log.repo';
import { IAuditLogBase, LeanAuditLog, AuditAction, ResourceType, AuditSeverity } from '../domain/audit-log.entity';
import { NotFoundError, ValidationError } from '../errors/service.errors';
import { CreateAuditLogInput, AuditQueryInput } from '../schemas/audit.schemas';

export interface RecordAuditInput {
  actorId: string;
  actorEmail?: string;
  actorRole: string;
  organizationId?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  description?: string;
  severity?: AuditSeverity;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  success?: boolean;
  errorMessage?: string;
  duration?: number;
}

export const AuditLogService = {
  async recordAudit(input: RecordAuditInput): Promise<LeanAuditLog> {
    const entry: Partial<IAuditLogBase> = {
      actorId: new Types.ObjectId(input.actorId),
      actorEmail: input.actorEmail,
      actorRole: input.actorRole,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceName: input.resourceName,
      description: input.description || `${input.action} on ${input.resourceType}`,
      severity: input.severity || 'LOW',
      metadata: input.metadata || {},
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      sessionId: input.sessionId,
      success: input.success ?? true,
      errorMessage: input.errorMessage,
      duration: input.duration,
      createdAt: new Date(),
    };

    if (input.organizationId && Types.ObjectId.isValid(input.organizationId)) {
      entry.organizationId = new Types.ObjectId(input.organizationId);
    }

    if (input.changes) {
      entry.changes = input.changes;
    }

    const result = await AuditLogRepo.append(entry);
    return result.toObject() as LeanAuditLog;
  },

  async getById(id: string): Promise<LeanAuditLog> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid audit log ID format');
    }

    const auditLog = await AuditLogRepo.findById(id);
    if (!auditLog) {
      throw new NotFoundError('AuditLog', id);
    }

    return auditLog;
  },

  async findAll(query: AuditQueryInput): Promise<PaginatedAuditLogs> {
    const options: AuditQueryOptions = {
      actorId: query.actorId,
      organizationId: query.organizationId,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      severity: query.severity,
      success: query.success as boolean | undefined,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    if (query.fromDate) options.fromDate = new Date(query.fromDate);
    if (query.toDate) options.toDate = new Date(query.toDate);

    return AuditLogRepo.findAll(options);
  },

  async getByResource(resourceType: string, resourceId: string): Promise<LeanAuditLog[]> {
    return AuditLogRepo.findByResource(resourceType, resourceId);
  },

  async getByActor(actorId: string): Promise<LeanAuditLog[]> {
    if (!Types.ObjectId.isValid(actorId)) {
      throw new ValidationError('Invalid actor ID format');
    }
    return AuditLogRepo.findByActor(actorId);
  },

  async getStats(organizationId?: string, days = 30): Promise<AuditStats> {
    return AuditLogRepo.getStats(organizationId, days);
  },

  async getResourceTimeline(resourceType: string, resourceId: string): Promise<LeanAuditLog[]> {
    return AuditLogRepo.getTimeline(resourceType, resourceId);
  },

  async getActivityTrend(organizationId?: string, days = 30) {
    return AuditLogRepo.getActivityTrend(organizationId, days);
  },

  // Helper to create audit entries from external events
  async createFromEvent(event: CreateAuditLogInput): Promise<LeanAuditLog> {
    return this.recordAudit({
      actorId: event.actorId,
      actorEmail: event.actorEmail,
      actorRole: event.actorRole,
      organizationId: event.organizationId,
      action: event.action as AuditAction,
      resourceType: event.resourceType as ResourceType,
      resourceId: event.resourceId,
      resourceName: event.resourceName,
      description: event.description,
      severity: event.severity as AuditSeverity,
      changes: event.changes,
      metadata: event.metadata,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      requestId: event.requestId,
      sessionId: event.sessionId,
      success: event.success,
      errorMessage: event.errorMessage,
      duration: event.duration,
    });
  },

  // Utility for building descriptions
  buildDescription(action: string, resourceType: string, resourceName?: string): string {
    const name = resourceName ? ` "${resourceName}"` : '';
    return `${action.toLowerCase().replace('_', ' ')}${name} (${resourceType.toLowerCase()})`;
  },
};
