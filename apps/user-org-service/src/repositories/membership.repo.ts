import mongoose from 'mongoose';
import { MembershipModel, IMembership, MemberRole, MemberStatus } from '../domain/membership.entity';

// Simple filter type compatible with Mongoose 9
type FilterQuery = Record<string, unknown>;
type SortOrder = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';

export interface MembershipQueryOptions {
  organizationId?: string;
  userId?: string;
  role?: MemberRole;
  status?: MemberStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const MembershipRepo = {
  /**
   * Create a new membership
   */
  async create(data: Partial<IMembership>): Promise<IMembership> {
    const membership = new MembershipModel(data);
    return membership.save();
  },

  /**
   * Find membership by ID
   */
  async findById(id: string): Promise<IMembership | null> {
    return MembershipModel.findById(id).lean();
  },

  /**
   * Find all memberships for a user
   */
  async findByUser(userId: string): Promise<IMembership[]> {
    return MembershipModel.find({ userId, status: { $ne: 'REMOVED' } }).lean();
  },

  /**
   * Find all memberships for an organization
   */
  async findByOrganization(organizationId: string): Promise<IMembership[]> {
    return MembershipModel.find({ 
      organizationId, 
      status: { $ne: 'REMOVED' } 
    }).lean();
  },

  /**
   * Find a specific membership by user and organization
   */
  async findByUserAndOrg(userId: string, organizationId: string): Promise<IMembership | null> {
    return MembershipModel.findOne({ userId, organizationId }).lean();
  },

  /**
   * Find all memberships with pagination and filtering
   */
  async findAll(options: MembershipQueryOptions = {}): Promise<PaginatedResult<IMembership>> {
    const {
      organizationId,
      userId,
      role,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const filter: FilterQuery = {};

    if (organizationId) {
      filter.organizationId = organizationId;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (role) {
      filter.role = role;
    }

    if (status) {
      filter.status = status;
    } else {
      // By default, don't include removed memberships
      filter.status = { $ne: 'REMOVED' };
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      MembershipModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      MembershipModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  },

  /**
   * Update a membership
   */
  async update(id: string, data: Partial<IMembership>): Promise<IMembership | null> {
    return MembershipModel.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
  },

  /**
   * Accept an invitation (change status from PENDING to ACTIVE)
   */
  async acceptInvitation(id: string): Promise<IMembership | null> {
    return MembershipModel.findByIdAndUpdate(
      id,
      { 
        status: 'ACTIVE', 
        acceptedAt: new Date(),
        updatedAt: new Date() 
      },
      { new: true }
    ).lean();
  },

  /**
   * Suspend a member
   */
  async suspend(id: string): Promise<IMembership | null> {
    return MembershipModel.findByIdAndUpdate(
      id,
      { status: 'SUSPENDED', updatedAt: new Date() },
      { new: true }
    ).lean();
  },

  /**
   * Remove a member (soft delete)
   */
  async remove(id: string): Promise<IMembership | null> {
    return MembershipModel.findByIdAndUpdate(
      id,
      { status: 'REMOVED', updatedAt: new Date() },
      { new: true }
    ).lean();
  },

  /**
   * Hard delete a membership (use with caution)
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await MembershipModel.findByIdAndDelete(id);
    return result !== null;
  },

  /**
   * Check if user is a member of organization
   */
  async isMember(userId: string, organizationId: string): Promise<boolean> {
    const count = await MembershipModel.countDocuments({ 
      userId, 
      organizationId, 
      status: 'ACTIVE' 
    });
    return count > 0;
  },

  /**
   * Check if user has specific role in organization
   */
  async hasRole(userId: string, organizationId: string, roles: MemberRole[]): Promise<boolean> {
    const count = await MembershipModel.countDocuments({ 
      userId, 
      organizationId, 
      role: { $in: roles },
      status: 'ACTIVE',
    });
    return count > 0;
  },

  /**
   * Get user's role in an organization
   */
  async getUserRole(userId: string, organizationId: string): Promise<MemberRole | null> {
    const membership = await MembershipModel.findOne({ 
      userId, 
      organizationId, 
      status: 'ACTIVE' 
    }).lean();
    return membership?.role || null;
  },

  /**
   * Count active members in an organization
   */
  async countActiveMembers(organizationId: string): Promise<number> {
    return MembershipModel.countDocuments({ 
      organizationId, 
      status: 'ACTIVE' 
    });
  },

  /**
   * Find organization owners
   */
  async findOwners(organizationId: string): Promise<IMembership[]> {
    return MembershipModel.find({ 
      organizationId, 
      role: 'OWNER', 
      status: 'ACTIVE' 
    }).lean();
  },

  /**
   * Find pending invitations for a user
   */
  async findPendingInvitations(userId: string): Promise<IMembership[]> {
    return MembershipModel.find({ 
      userId, 
      status: 'PENDING' 
    }).lean();
  },

  /**
   * Remove all memberships for a user
   */
  async removeAllForUser(userId: string): Promise<number> {
    const result = await MembershipModel.updateMany(
      { userId },
      { status: 'REMOVED', updatedAt: new Date() }
    );
    return result.modifiedCount;
  },

  /**
   * Remove all memberships for an organization
   */
  async removeAllForOrg(organizationId: string): Promise<number> {
    const result = await MembershipModel.updateMany(
      { organizationId },
      { status: 'REMOVED', updatedAt: new Date() }
    );
    return result.modifiedCount;
  },
};
