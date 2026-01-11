import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { 
  UserService, 
  OrganizationService, 
  MembershipService 
} from '../services/user-org.service';
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
  type CreateUserInput,
  type UpdateUserInput,
  type UserQueryInput,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type OrgQueryInput,
  type AddMemberInput,
  type UpdateMemberInput,
} from '../schemas/user-org.schemas';
import { ValidationError } from '../errors/service.errors';

// Helper for Zod validation with proper type inference
function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ValidationError(message);
  }
  return result.data;
}

export async function userOrgRoutes(app: FastifyInstance) {
  
  // ================== USER ROUTES ==================

  /**
   * POST /users - Create a new user profile
   */
  app.post('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = validate(createUserSchema, request.body);
    const user = await UserService.create(input);
    return reply.status(201).send({ success: true, data: user });
  });

  /**
   * GET /users - List all users with pagination
   */
  app.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = validate(userQuerySchema, request.query);
    const result = await UserService.getAll(query);
    return reply.send({ success: true, ...result });
  });

  /**
   * GET /users/:id - Get a specific user
   */
  app.get('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const user = await UserService.getById(id);
    return reply.send({ success: true, data: user });
  });

  /**
   * GET /users/auth/:authUserId - Get user by auth user ID
   */
  app.get('/users/auth/:authUserId', async (request: FastifyRequest<{ Params: { authUserId: string } }>, reply: FastifyReply) => {
    const { authUserId } = request.params;
    const user = await UserService.getByAuthUserId(authUserId);
    return reply.send({ success: true, data: user });
  });

  /**
   * PATCH /users/:id - Update a user
   */
  app.patch('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const input = validate(updateUserSchema, request.body);
    const user = await UserService.update(id, input as any);
    return reply.send({ success: true, data: user });
  });

  /**
   * DELETE /users/:id - Deactivate a user
   */
  app.delete('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    await UserService.deactivate(id);
    return reply.send({ success: true, message: 'User deactivated' });
  });

  /**
   * GET /users/:id/organizations - Get user's organizations
   */
  app.get('/users/:id/organizations', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const orgs = await UserService.getUserOrganizations(id);
    return reply.send({ success: true, data: orgs });
  });

  /**
   * GET /users/:id/memberships - Get user's memberships
   */
  app.get('/users/:id/memberships', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const memberships = await MembershipService.getUserMemberships(id);
    return reply.send({ success: true, data: memberships });
  });

  /**
   * GET /users/:id/invitations - Get pending invitations for user
   */
  app.get('/users/:id/invitations', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const invitations = await MembershipService.getPendingInvitations(id);
    return reply.send({ success: true, data: invitations });
  });

  // ================== ORGANIZATION ROUTES ==================

  /**
   * POST /organizations - Create a new organization
   */
  app.post('/organizations', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = validate(createOrganizationSchema, request.body);
    const org = await OrganizationService.create(input);
    return reply.status(201).send({ success: true, data: org });
  });

  /**
   * GET /organizations - List all organizations with pagination
   */
  app.get('/organizations', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = validate(orgQuerySchema, request.query);
    const result = await OrganizationService.getAllWithStats(query);
    return reply.send({ success: true, ...result });
  });

  /**
   * GET /organizations/:id - Get a specific organization
   */
  app.get('/organizations/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const org = await OrganizationService.getById(id);
    return reply.send({ success: true, data: org });
  });

  /**
   * PATCH /organizations/:id - Update an organization
   */
  app.patch('/organizations/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const input = validate(updateOrganizationSchema, request.body);
    const org = await OrganizationService.update(id, input as unknown as Partial<IOrganization>);
    return reply.send({ success: true, data: org });
  });

  /**
   * POST /organizations/:id/verify - Verify an organization
   */
  app.post('/organizations/:id/verify', async (request: FastifyRequest<{ Params: { id: string }; Body: { verifiedBy: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { verifiedBy } = request.body as { verifiedBy: string };
    const org = await OrganizationService.verify(id, verifiedBy);
    return reply.send({ success: true, data: org });
  });

  /**
   * DELETE /organizations/:id - Deactivate an organization
   */
  app.delete('/organizations/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    await OrganizationService.deactivate(id);
    return reply.send({ success: true, message: 'Organization deactivated' });
  });

  // ================== MEMBERSHIP ROUTES ==================

  /**
   * GET /organizations/:id/members - Get organization members
   */
  app.get('/organizations/:id/members', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const result = await OrganizationService.getMembers(id);
    return reply.send({ success: true, ...result });
  });

  /**
   * POST /organizations/:id/members - Add a member to organization
   */
  app.post('/organizations/:id/members', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: organizationId } = request.params;
    const { userId, role, permissions } = validate(addMemberSchema, request.body);
    
    // TODO: Get invitedBy from auth context
    const invitedBy = (request.body as any).invitedBy || 'system';
    
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
   */
  app.patch('/memberships/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const input = validate(updateMemberSchema, request.body);
    
    // TODO: Get updatedBy from auth context
    const updatedBy = (request.body as any).updatedBy || 'system';
    
    const membership = await MembershipService.updateMember(id, input as any, updatedBy);
    return reply.send({ success: true, data: membership });
  });

  /**
   * POST /memberships/:id/accept - Accept an invitation
   */
  app.post('/memberships/:id/accept', async (request: FastifyRequest<{ Params: { id: string }; Body: { userId: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { userId } = request.body as { userId: string };
    
    const membership = await MembershipService.acceptInvitation(id, userId);
    return reply.send({ success: true, data: membership });
  });

  /**
   * DELETE /memberships/:id - Remove a member
   */
  app.delete('/memberships/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    
    // TODO: Get removedBy from auth context
    const removedBy = (request.body as any)?.removedBy || 'system';
    
    await MembershipService.removeMember(id, removedBy);
    return reply.send({ success: true, message: 'Member removed' });
  });

  // ================== HEALTH CHECK ==================

  app.get('/health', async (_request, reply) => {
    return reply.send({ 
      status: 'ok', 
      service: 'user-org-service',
      timestamp: new Date().toISOString(),
    });
  });
}
