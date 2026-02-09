import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler, RouteShorthandOptions } from 'fastify';
import { z } from 'zod';
import { 
  UserService, 
  OrganizationService, 
  MembershipService 
} from '../services/user-org.service';
import { InvitationService } from '../services/invitation.service';
import { IOrganization } from '../domain/organization.entity';
import {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
  createOrganizationSchema,
  updateOrganizationSchema,
  orgQuerySchema,
  addMemberSchema,
  updateMemberSchema,
  createInvitationSchema,
  invitationQuerySchema,
  invitationTokenSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserQueryInput,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type OrgQueryInput,
  type AddMemberInput,
  type UpdateMemberInput,
  type CreateInvitationInput,
  type InvitationQueryInput,
} from '../schemas/user-org.schemas';
import { ValidationError } from '../errors/service.errors';
import { requireAuth, requireRole, getUserContext, requireOwnerOrAdmin, requireSameOrg } from '@veridex/shared';

// Helper for Zod validation with proper type inference
function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ValidationError(message);
  }
  return result.data;
}

// Route options with preHandler hooks
const authRequiredOpts: RouteShorthandOptions = { preHandler: requireAuth() as preHandlerHookHandler };
const adminOnlyOpts: RouteShorthandOptions = { preHandler: requireRole(['ADMIN']) as preHandlerHookHandler };
const merchantOrAdminOpts: RouteShorthandOptions = { preHandler: requireRole(['MERCHANT', 'ADMIN']) as preHandlerHookHandler };

export async function userOrgRoutes(app: FastifyInstance) {
  
  // ================== USER ROUTES ==================

  /**
   * POST /users - Create a new user profile
   * Note: This is called internally by auth-service, not directly by users
   * Protected: Only admin or internal system calls
   */
  app.post('/users', adminOnlyOpts, async (request: FastifyRequest, reply: FastifyReply) => {
    const input = validate(createUserSchema, request.body);
    const user = await UserService.create(input);
    return reply.status(201).send({ success: true, data: user });
  });

  /**
   * GET /users - List all users with pagination
   * Protected: Admin only
   */
  app.get('/users', adminOnlyOpts, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = validate(userQuerySchema, request.query);
    const result = await UserService.getAll(query);
    return reply.send({ success: true, ...result });
  });

  /**
   * GET /users/:id - Get a specific user
   * Protected: Admin or the user themselves
   */
  app.get('/users/:id', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Non-admin users can only view their own profile
    if (context?.role !== 'ADMIN' && context?.userId !== id) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const user = await UserService.getById(id);
    return reply.send({ success: true, data: user });
  });

  /**
   * GET /users/auth/:authUserId - Get user by auth user ID
   * Protected: Admin or internal service calls
   */
  app.get('/users/auth/:authUserId', authRequiredOpts, async (request, reply) => {
    const { authUserId } = request.params as { authUserId: string };
    const context = getUserContext(request);
    
    // Non-admin users can only view their own profile
    if (context?.role !== 'ADMIN' && context?.userId !== authUserId) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const user = await UserService.getByAuthUserId(authUserId);
    return reply.send({ success: true, data: user });
  });

  /**
   * PATCH /users/:id - Update a user
   * Protected: Admin or the user themselves
   */
  app.patch('/users/:id', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Non-admin users can only update their own profile
    if (context?.role !== 'ADMIN' && context?.userId !== id) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const input = validate(updateUserSchema, request.body);
    const user = await UserService.update(id, input as any);
    return reply.send({ success: true, data: user });
  });

  /**
   * PATCH /users/:id/status - Update user status (activate/deactivate)
   * Protected: Admin only
   */
  app.patch('/users/:id/status', adminOnlyOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isActive, reason } = request.body as { isActive: boolean; reason?: string };
    const context = getUserContext(request);
    
    const user = await UserService.update(id, { 
      isActive,
      metadata: reason ? { 
        statusChangeReason: reason, 
        statusChangedAt: new Date().toISOString(),
        statusChangedBy: context?.userId || 'system',
      } : undefined,
    });
    return reply.send({ success: true, data: user });
  });

  /**
   * DELETE /users/:id - Deactivate a user
   * Protected: Admin only
   */
  app.delete('/users/:id', adminOnlyOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    await UserService.deactivate(id);
    return reply.send({ success: true, message: 'User deactivated' });
  });

  /**
   * GET /users/:id/organizations - Get user's organizations
   * Protected: Admin or the user themselves
   */
  app.get('/users/:id/organizations', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Non-admin users can only view their own organizations
    if (context?.role !== 'ADMIN' && context?.userId !== id) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const orgs = await UserService.getUserOrganizations(id);
    return reply.send({ success: true, data: orgs });
  });

  /**
   * GET /users/:id/memberships - Get user's memberships
   * Protected: Admin or the user themselves
   */
  app.get('/users/:id/memberships', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Non-admin users can only view their own memberships
    if (context?.role !== 'ADMIN' && context?.userId !== id) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const memberships = await MembershipService.getUserMemberships(id);
    return reply.send({ success: true, data: memberships });
  });

  /**
   * GET /users/:id/invitations - Get pending invitations for user
   * Protected: Admin or the user themselves
   */
  app.get('/users/:id/invitations', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Non-admin users can only view their own invitations
    if (context?.role !== 'ADMIN' && context?.userId !== id) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const invitations = await MembershipService.getPendingInvitations(id);
    return reply.send({ success: true, data: invitations });
  });

  // ================== ORGANIZATION ROUTES ==================

  /**
   * POST /organizations - Create a new organization
   * Protected: Merchants or Admin can create organizations
   */
  app.post('/organizations', merchantOrAdminOpts, async (request: FastifyRequest, reply: FastifyReply) => {
    const input = validate(createOrganizationSchema, request.body);
    const context = getUserContext(request);
    
    // Automatically set owner to the creating user if not specified
    const orgData = {
      ...input,
      ownerUserId: input.ownerUserId || context?.userId,
    };
    
    const org = await OrganizationService.create(orgData);
    return reply.status(201).send({ success: true, data: org });
  });

  /**
   * GET /organizations - List all organizations with pagination
   * Protected: Admin can see all, others see only their organizations
   */
  app.get('/organizations', authRequiredOpts, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = validate(orgQuerySchema, request.query) as OrgQueryInput & { organizationId?: string };
    const context = getUserContext(request);
    
    // Non-admin users can only see their organization
    if (context?.role !== 'ADMIN' && context?.organizationId) {
      (query as any).organizationId = context.organizationId;
    }
    
    const result = await OrganizationService.getAllWithStats(query);
    return reply.send({ success: true, ...result });
  });

  /**
   * GET /organizations/:id - Get a specific organization
   * Protected: Admin or members of the organization
   */
  app.get('/organizations/:id', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Non-admin users can only view their own organization
    if (context?.role !== 'ADMIN' && context?.organizationId !== id) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const org = await OrganizationService.getById(id);
    return reply.send({ success: true, data: org });
  });

  /**
   * PATCH /organizations/:id - Update an organization
   * Protected: Admin or organization owner/admin
   */
  app.patch('/organizations/:id', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Non-admin users can only update their own organization
    if (context?.role !== 'ADMIN' && context?.organizationId !== id) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const input = validate(updateOrganizationSchema, request.body);
    const org = await OrganizationService.update(id, input as unknown as Partial<IOrganization>);
    return reply.send({ success: true, data: org });
  });

  /**
   * POST /organizations/:id/verify - Verify an organization
   * Protected: Admin only
   */
  app.post('/organizations/:id/verify', adminOnlyOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    const verifiedBy = context?.userId || 'system';
    const org = await OrganizationService.verify(id, verifiedBy);
    return reply.send({ success: true, data: org });
  });

  /**
   * DELETE /organizations/:id - Deactivate an organization
   * Protected: Admin only
   */
  app.delete('/organizations/:id', adminOnlyOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    await OrganizationService.deactivate(id);
    return reply.send({ success: true, message: 'Organization deactivated' });
  });

  /**
   * POST /organizations/batch - Get multiple organizations by IDs
   * Used for enriching document data with organization names
   * Protected: Admin only (internal service use)
   */
  app.post('/organizations/batch', adminOnlyOpts, async (request, reply) => {
    const schema = z.object({
      ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(100),
    });
    
    const { ids } = validate(schema, request.body);
    
    // Fetch organizations by IDs
    const organizations = await OrganizationService.getByIds(ids);
    
    // Return a map of id -> name for easy lookup
    const orgMap: Record<string, { name: string; type: string }> = {};
    for (const org of organizations) {
      orgMap[org._id.toString()] = { 
        name: org.name, 
        type: org.type 
      };
    }
    
    return reply.send({ success: true, data: orgMap });
  });

  // ================== MEMBERSHIP ROUTES ==================

  /**
   * GET /organizations/:id/members - Get organization members
   * Protected: Admin or members of the organization
   */
  app.get('/organizations/:id/members', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Non-admin users can only view members of their own organization
    if (context?.role !== 'ADMIN' && context?.organizationId !== id) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const result = await OrganizationService.getMembers(id);
    return reply.send({ success: true, ...result });
  });

  /**
   * POST /organizations/:id/members - Add a member to organization
   * Protected: Admin or organization owner/admin
   */
  app.post('/organizations/:id/members', authRequiredOpts, async (request, reply) => {
    const { id: organizationId } = request.params as { id: string };
    const { userId, role, permissions } = validate(addMemberSchema, request.body);
    const context = getUserContext(request);
    
    // Non-admin users can only add members to their own organization
    if (context?.role !== 'ADMIN' && context?.organizationId !== organizationId) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const invitedBy = context?.userId || 'system';
    
    const membership = await MembershipService.addMember({
      userId,
      organizationId,
      role: role as any,
      invitedBy,
      permissions,
    });
    
    return reply.status(201).send({ success: true, data: membership });
  });

  /**
   * PATCH /memberships/:id - Update a membership
   * Protected: Admin or organization owner/admin
   */
  app.patch('/memberships/:id', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = validate(updateMemberSchema, request.body);
    const context = getUserContext(request);
    
    // Get the membership to check organization
    const membership = await MembershipService.getMembershipById(id);
    if (!membership) {
      return reply.status(404).send({ success: false, error: 'Membership not found' });
    }
    
    // Non-admin users can only update memberships in their own organization
    if (context?.role !== 'ADMIN' && context?.organizationId !== membership.organizationId.toString()) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const updatedBy = context?.userId || 'system';
    const updated = await MembershipService.updateMember(id, input as any, updatedBy);
    return reply.send({ success: true, data: updated });
  });

  /**
   * POST /memberships/:id/accept - Accept an invitation
   * Protected: The invited user only
   */
  app.post('/memberships/:id/accept', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Get the membership to verify the user is the invitee
    const membership = await MembershipService.getMembershipById(id);
    if (!membership) {
      return reply.status(404).send({ success: false, error: 'Invitation not found' });
    }
    
    // Only the invited user can accept their invitation
    if (membership.userId.toString() !== context?.userId) {
      return reply.status(403).send({ success: false, error: 'You can only accept your own invitations' });
    }
    
    const accepted = await MembershipService.acceptInvitation(id, context.userId);
    return reply.send({ success: true, data: accepted });
  });

  /**
   * DELETE /memberships/:id - Remove a member
   * Protected: Admin or organization owner/admin
   */
  app.delete('/memberships/:id', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Get the membership to check organization
    const membership = await MembershipService.getMembershipById(id);
    if (!membership) {
      return reply.status(404).send({ success: false, error: 'Membership not found' });
    }
    
    // Non-admin users can only remove members from their own organization
    if (context?.role !== 'ADMIN' && context?.organizationId !== membership.organizationId.toString()) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const removedBy = context?.userId || 'system';
    await MembershipService.removeMember(id, removedBy);
    return reply.send({ success: true, message: 'Member removed' });
  });

  // ================== INVITATION ROUTES ==================

  /**
   * POST /organizations/:id/invitations - Create an invitation
   * Protected: Organization owner/admin/manager
   */
  app.post('/organizations/:id/invitations', authRequiredOpts, async (request, reply) => {
    const { id: organizationId } = request.params as { id: string };
    const context = getUserContext(request);
    
    // Non-admin users can only invite to their own organization
    if (context?.role !== 'ADMIN' && context?.organizationId !== organizationId) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const input = validate(createInvitationSchema, request.body);
    
    const invitation = await InvitationService.createInvitation({
      organizationId,
      email: input.email,
      role: input.role,
      invitedBy: context?.userId || 'system',
      message: input.message,
    });
    
    return reply.status(201).send({ 
      success: true, 
      data: invitation,
      message: `Invitation sent to ${input.email}`,
    });
  });

  /**
   * GET /organizations/:id/invitations - Get organization invitations
   * Protected: Organization owner/admin/manager
   */
  app.get('/organizations/:id/invitations', authRequiredOpts, async (request, reply) => {
    const { id: organizationId } = request.params as { id: string };
    const query = validate(invitationQuerySchema, request.query) as InvitationQueryInput;
    const context = getUserContext(request);
    
    // Non-admin users can only view invitations for their own organization
    if (context?.role !== 'ADMIN' && context?.organizationId !== organizationId) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }
    
    const invitations = await InvitationService.getOrganizationInvitations(
      organizationId, 
      query.status as any
    );
    
    return reply.send({ success: true, data: invitations });
  });

  /**
   * GET /invitations/:token - Get invitation details by token (public)
   * Allows prospective members to view invitation before accepting
   */
  app.get('/invitations/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    
    const invitation = await InvitationService.getByToken(token);
    
    if (!invitation) {
      return reply.status(404).send({ success: false, error: 'Invitation not found' });
    }
    
    if (invitation.status !== 'PENDING') {
      return reply.status(400).send({ 
        success: false, 
        error: `Invitation has been ${invitation.status.toLowerCase()}` 
      });
    }
    
    if (invitation.expiresAt < new Date()) {
      return reply.status(400).send({ success: false, error: 'Invitation has expired' });
    }
    
    // Return limited info for security
    return reply.send({ 
      success: true, 
      data: {
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        inviter: invitation.inviter ? {
          firstName: invitation.inviter.firstName,
          lastName: invitation.inviter.lastName,
        } : undefined,
        message: invitation.message,
        expiresAt: invitation.expiresAt,
      }
    });
  });

  /**
   * POST /invitations/:token/accept - Accept an invitation
   * Protected: Must be logged in
   */
  app.post('/invitations/:token/accept', authRequiredOpts, async (request, reply) => {
    const { token } = request.params as { token: string };
    const context = getUserContext(request);
    
    if (!context?.userId) {
      return reply.status(401).send({ success: false, error: 'Authentication required' });
    }
    
    const invitation = await InvitationService.acceptInvitation(token, context.userId);
    
    return reply.send({ 
      success: true, 
      data: invitation,
      message: 'You have joined the organization' 
    });
  });

  /**
   * POST /invitations/:token/decline - Decline an invitation
   * Protected: Must be logged in
   */
  app.post('/invitations/:token/decline', authRequiredOpts, async (request, reply) => {
    const { token } = request.params as { token: string };
    const context = getUserContext(request);
    
    if (!context?.userId) {
      return reply.status(401).send({ success: false, error: 'Authentication required' });
    }
    
    const invitation = await InvitationService.declineInvitation(token, context.userId);
    
    return reply.send({ 
      success: true, 
      data: invitation,
      message: 'Invitation declined' 
    });
  });

  /**
   * DELETE /invitations/:id - Cancel an invitation
   * Protected: Organization owner/admin/manager
   */
  app.delete('/invitations/:id', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    if (!context?.userId) {
      return reply.status(401).send({ success: false, error: 'Authentication required' });
    }
    
    const invitation = await InvitationService.cancelInvitation(id, context.userId);
    
    return reply.send({ 
      success: true, 
      data: invitation,
      message: 'Invitation cancelled' 
    });
  });

  /**
   * POST /invitations/:id/resend - Resend an invitation
   * Protected: Organization owner/admin/manager
   */
  app.post('/invitations/:id/resend', authRequiredOpts, async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = getUserContext(request);
    
    if (!context?.userId) {
      return reply.status(401).send({ success: false, error: 'Authentication required' });
    }
    
    const invitation = await InvitationService.resendInvitation(id, context.userId);
    
    return reply.send({ 
      success: true, 
      data: invitation,
      message: 'Invitation resent' 
    });
  });

  /**
   * GET /my-invitations - Get pending invitations for the current user
   * Protected: Must be logged in
   */
  app.get('/my-invitations', authRequiredOpts, async (request, reply) => {
    const context = getUserContext(request);
    
    if (!context?.userId) {
      return reply.status(401).send({ success: false, error: 'Authentication required' });
    }
    
    // Get user email from user service
    const user = await UserService.getById(context.userId);
    if (!user) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }
    
    const invitations = await InvitationService.getUserInvitations(user.email);
    
    return reply.send({ success: true, data: invitations });
  });
}
