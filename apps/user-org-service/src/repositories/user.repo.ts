import mongoose from 'mongoose';
import { UserModel, IUser } from '../domain/user.entity';

// Simple filter type compatible with Mongoose 9
type FilterQuery = Record<string, unknown>;
type SortOrder = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';

export interface UserQueryOptions {
  role?: string;
  isActive?: boolean;
  search?: string;
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

export const UserRepo = {
  /**
   * Create a new user profile
   */
  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new UserModel(data);
    return user.save();
  },

  /**
   * Find user by internal ID
   */
  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id).lean();
  },

  /**
   * Find user by auth service user ID
   */
  async findByAuthUserId(authUserId: string): Promise<IUser | null> {
    return UserModel.findOne({ authUserId }).lean();
  },

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).lean();
  },

  /**
   * Find all users with pagination and filtering
   */
  async findAll(options: UserQueryOptions = {}): Promise<PaginatedResult<IUser>> {
    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const filter: FilterQuery = {};

    if (role) {
      filter.role = role;
    }

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      UserModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      UserModel.countDocuments(filter),
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
   * Update a user by ID
   */
  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
  },

  /**
   * Update a user by auth user ID
   */
  async updateByAuthUserId(authUserId: string, data: Partial<IUser>): Promise<IUser | null> {
    return UserModel.findOneAndUpdate(
      { authUserId },
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
  },

  /**
   * Soft delete (deactivate) a user
   */
  async softDelete(id: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).lean();
  },

  /**
   * Hard delete a user (use with caution)
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return result !== null;
  },

  /**
   * Check if user exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await UserModel.countDocuments({ _id: id });
    return count > 0;
  },

  /**
   * Count users by filter
   */
  async count(filter: FilterQuery = {}): Promise<number> {
    return UserModel.countDocuments(filter);
  },

  /**
   * Find users by organization
   */
  async findByOrganization(orgId: string): Promise<IUser[]> {
    // This requires a lookup through memberships
    const MembershipModel = (await import('../domain/membership.entity')).MembershipModel;
    const memberships = await MembershipModel.find({ 
      organizationId: orgId, 
      status: 'ACTIVE' 
    }).lean();
    
    const userIds = memberships.map(m => m.userId);
    return UserModel.find({ _id: { $in: userIds } }).lean();
  },
};
