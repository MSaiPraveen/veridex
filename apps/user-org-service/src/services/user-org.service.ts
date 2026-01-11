import { UserRepo, UserQueryOptions } from '../repositories/user.repo';
import { OrganizationRepo, OrgQueryOptions } from '../repositories/organization.repo';
import { MembershipRepo, MembershipQueryOptions } from '../repositories/membership.repo';
import { IUser } from '../domain/user.entity';
import { IOrganization, OrgType } from '../domain/organization.entity';
import { IMembership, MemberRole } from '../domain/membership.entity';
import {
  emitUserCreated,
  emitUserUpdated,
  emitOrganizationCreated,
  emitOrganizationUpdated,
  emitMemberAdded,
  emitMemberRemoved,
} from '../events/user-org.producer';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError
} from '../errors/service.errors';

// ================== USER SERVICE ==================

export const UserService = {
  /**
   * Create a new user profile
   */
  async create(input: {
    authUserId: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<IUser> {
    // Check for existing user with same authUserId
    const existingAuth = await UserRepo.findByAuthUserId(input.authUserId);
    if (existingAuth) {
      throw new ConflictError('User profile already exists for this auth user');
    }

    // Check for existing user with same email
    const existingEmail = await UserRepo.findByEmail(input.email);
    if (existingEmail) {
      throw new ConflictError('User with this email already exists');
    }

    const user = await UserRepo.create(input as unknown as Partial<IUser>);
    await emitUserCreated(user);
    return user;
  },

  /**
   * Get a user by ID
   */
  async getById(id: string): Promise<IUser> {
    const user = await UserRepo.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  },

  /**
   * Get a user by auth user ID
   */
  async getByAuthUserId(authUserId: string): Promise<IUser> {
    const user = await UserRepo.findByAuthUserId(authUserId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  },

  /**
   * Get all users with pagination and organization data
   */
  async getAll(options: UserQueryOptions = {}) {
    const result = await UserRepo.findAll(options);

    // Enrich users with organization data
    const enrichedUsers = await Promise.all(
      result.data.map(async (user) => {
        // Find user's membership (primary organization)
        const memberships = await MembershipRepo.findByUser(user._id.toString());
        const primaryMembership = memberships.find(m => m.status === 'ACTIVE');

        if (primaryMembership) {
          const org = await OrganizationRepo.findById(
            primaryMembership.organizationId.toString()
          );
          return {
            ...user,
            organizationId: org?._id?.toString(),
            organizationName: org?.name,
            membershipRole: primaryMembership.role,
            status: user.isActive ? 'ACTIVE' : 'INACTIVE',
          };
        }

        return {
          ...user,
          status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        };
      })
    );

    return {
      ...result,
      data: enrichedUsers,
    };
  },

  /**
   * Update a user
   */
  async update(id: string, data: Partial<IUser>): Promise<IUser> {
    const user = await UserRepo.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await UserRepo.update(id, data);
    if (!updated) {
      throw new NotFoundError('User not found');
    }

    await emitUserUpdated(updated);
    return updated;
  },

  /**
   * Deactivate a user
   */
  async deactivate(id: string): Promise<IUser> {
    const user = await UserRepo.softDelete(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  },

  /**
   * Delete a user (hard delete)
   */
  async delete(id: string): Promise<void> {
    const deleted = await UserRepo.hardDelete(id);
    if (!deleted) {
      throw new NotFoundError('User not found');
    }
  },

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<IOrganization[]> {
    const memberships = await MembershipRepo.findByUser(userId);
    const orgIds = memberships.map(m => m.organizationId as unknown as string);

    const orgs = await Promise.all(
      orgIds.map(id => OrganizationRepo.findById(id))
    );

    return orgs.filter((org): org is IOrganization => org !== null);
  },
};

// ================== ORGANIZATION SERVICE ==================

export const OrganizationService = {
  /**
   * Create a new organization
   */
  async create(input: {
    name: string;
    type: OrgType;
    description?: string;
    website?: string;
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    licenseNumber?: string;
    licenseState?: string;
    ownerUserId?: string;
  }): Promise<IOrganization> {
    // Check for existing org with same name
    const existing = await OrganizationRepo.findByName(input.name);
    if (existing) {
      throw new ConflictError('Organization with this name already exists');
    }

    const { ownerUserId, ...orgData } = input;
    const org = await OrganizationRepo.create(orgData);

    // If owner provided, create ownership membership
    if (ownerUserId) {
      await MembershipRepo.create({
        userId: ownerUserId,
        organizationId: org._id as unknown as string,
        role: 'OWNER',
        status: 'ACTIVE',
        acceptedAt: new Date(),
      } as unknown as Partial<IMembership>);

      // Update auth-service user's organizationId
      try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
        await fetch(`${authServiceUrl}/auth/internal/users/${ownerUserId}/organization`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-key': process.env.INTERNAL_SERVICE_KEY || '',
          },
          body: JSON.stringify({ organizationId: String(org._id) }),
        });
      } catch (error) {
        console.error('Failed to update auth user organizationId:', error);
        // Don't fail org creation if auth update fails
      }
    }

    await emitOrganizationCreated(org);
    return org;
  },

  /**
   * Get an organization by ID
   */
  async getById(id: string): Promise<IOrganization> {
    const org = await OrganizationRepo.findById(id);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    return org;
  },

  /**
   * Get all organizations with pagination
   */
  async getAll(options: OrgQueryOptions = {}) {
    return OrganizationRepo.findAll(options);
  },

  /**
   * Get all organizations with member counts
   */
  async getAllWithStats(options: OrgQueryOptions = {}) {
    return OrganizationRepo.findAllWithStats(options);
  },

  /**
   * Update an organization
   */
  async update(id: string, data: Partial<IOrganization>): Promise<IOrganization> {
    const org = await OrganizationRepo.findById(id);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Check name uniqueness if name is being changed
    if (data.name && data.name !== org.name) {
      const existing = await OrganizationRepo.findByName(data.name);
      if (existing) {
        throw new ConflictError('Organization with this name already exists');
      }
    }

    const updated = await OrganizationRepo.update(id, data);
    if (!updated) {
      throw new NotFoundError('Organization not found');
    }

    await emitOrganizationUpdated(updated);
    return updated;
  },

  /**
   * Verify an organization
   */
  async verify(id: string, verifiedBy: string): Promise<IOrganization> {
    const org = await OrganizationRepo.verify(id, verifiedBy);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    return org;
  },

  /**
   * Deactivate an organization
   */
  async deactivate(id: string): Promise<IOrganization> {
    const org = await OrganizationRepo.softDelete(id);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    return org;
  },

  /**
   * Delete an organization (hard delete)
   */
  async delete(id: string): Promise<void> {
    // First remove all memberships
    await MembershipRepo.removeAllForOrg(id);

    const deleted = await OrganizationRepo.hardDelete(id);
    if (!deleted) {
      throw new NotFoundError('Organization not found');
    }
  },

  /**
   * Get organization members
   */
  async getMembers(orgId: string, options: MembershipQueryOptions = {}) {
    return MembershipRepo.findAll({ ...options, organizationId: orgId });
  },
};

// ================== MEMBERSHIP SERVICE ==================

export const MembershipService = {
  /**
   * Add a member to an organization
   */
  async addMember(input: {
    userId: string;
    organizationId: string;
    role: MemberRole;
    invitedBy: string;
    permissions?: string[];
  }): Promise<IMembership> {
    // Check if org exists
    const org = await OrganizationRepo.findById(input.organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Check if user exists
    const user = await UserRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if membership already exists
    const existing = await MembershipRepo.findByUserAndOrg(input.userId, input.organizationId);
    if (existing) {
      if (existing.status === 'REMOVED') {
        // Reactivate membership
        const updated = await MembershipRepo.update(existing._id as unknown as string, {
          role: input.role,
          status: 'PENDING',
          invitedBy: input.invitedBy as unknown,
          invitedAt: new Date(),
          permissions: input.permissions || [],
        } as Partial<IMembership>);
        return updated!;
      }
      throw new ConflictError('User is already a member of this organization');
    }

    const membership = await MembershipRepo.create({
      userId: input.userId,
      organizationId: input.organizationId,
      role: input.role,
      status: 'PENDING',
      invitedBy: input.invitedBy,
      invitedAt: new Date(),
      permissions: input.permissions || [],
    } as unknown as Partial<IMembership>);

    await emitMemberAdded(membership, org);
    return membership;
  },

  /**
   * Accept an invitation
   */
  async acceptInvitation(membershipId: string, userId: string): Promise<IMembership> {
    const membership = await MembershipRepo.findById(membershipId);
    if (!membership) {
      throw new NotFoundError('Membership not found');
    }

    if (membership.userId.toString() !== userId) {
      throw new ForbiddenError('Cannot accept invitation for another user');
    }

    if (membership.status !== 'PENDING') {
      throw new ValidationError('Invitation is not pending');
    }

    const updated = await MembershipRepo.acceptInvitation(membershipId);
    return updated!;
  },

  /**
   * Update member role/permissions
   */
  async updateMember(
    membershipId: string,
    data: { role?: MemberRole; permissions?: string[]; status?: 'ACTIVE' | 'SUSPENDED' },
    updatedBy: string
  ): Promise<IMembership> {
    const membership = await MembershipRepo.findById(membershipId);
    if (!membership) {
      throw new NotFoundError('Membership not found');
    }

    // Can't change owner role directly
    if (membership.role === 'OWNER' && data.role && data.role !== 'OWNER') {
      throw new ValidationError('Cannot demote organization owner');
    }

    const updated = await MembershipRepo.update(membershipId, data);
    return updated!;
  },

  /**
   * Remove a member from organization
   */
  async removeMember(membershipId: string, removedBy: string): Promise<void> {
    const membership = await MembershipRepo.findById(membershipId);
    if (!membership) {
      throw new NotFoundError('Membership not found');
    }

    // Can't remove the last owner
    if (membership.role === 'OWNER') {
      const owners = await MembershipRepo.findOwners(membership.organizationId as unknown as string);
      if (owners.length <= 1) {
        throw new ValidationError('Cannot remove the last owner of an organization');
      }
    }

    await MembershipRepo.remove(membershipId);

    const org = await OrganizationRepo.findById(membership.organizationId as unknown as string);
    if (org) {
      await emitMemberRemoved(membership, org);
    }
  },

  /**
   * Get user's memberships
   */
  async getUserMemberships(userId: string): Promise<IMembership[]> {
    return MembershipRepo.findByUser(userId);
  },

  /**
   * Get pending invitations for user
   */
  async getPendingInvitations(userId: string): Promise<IMembership[]> {
    return MembershipRepo.findPendingInvitations(userId);
  },

  /**
   * Check if user has role in organization
   */
  async checkPermission(userId: string, organizationId: string, roles: MemberRole[]): Promise<boolean> {
    return MembershipRepo.hasRole(userId, organizationId, roles);
  },
};

// Legacy exports for backwards compatibility
export const createUser = UserService.create.bind(UserService);
export const createMerchantOrg = async (input: { name: string; ownerUserId: string }) => {
  return OrganizationService.create({
    name: input.name,
    type: 'MERCHANT',
    ownerUserId: input.ownerUserId,
  });
};
