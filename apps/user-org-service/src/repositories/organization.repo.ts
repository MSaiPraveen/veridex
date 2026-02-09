import mongoose from 'mongoose';
import { OrganizationModel, IOrganization, OrgType } from '../domain/organization.entity';

// Simple filter type compatible with Mongoose 9
type FilterQuery = Record<string, unknown>;
type SortOrder = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';

export interface OrgQueryOptions {
  type?: OrgType;
  isActive?: boolean;
  isVerified?: boolean;
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

export const OrganizationRepo = {
  /**
   * Create a new organization
   */
  async create(data: Partial<IOrganization>): Promise<IOrganization> {
    const org = new OrganizationModel(data);
    return org.save();
  },

  /**
   * Find organization by ID
   */
  async findById(id: string): Promise<IOrganization | null> {
    return OrganizationModel.findById(id).lean();
  },

  /**
   * Find organization by name (case-insensitive)
   */
  async findByName(name: string): Promise<IOrganization | null> {
    return OrganizationModel.findOne({ 
      name: { $regex: `^${name}$`, $options: 'i' } 
    }).lean();
  },

  /**
   * Find organizations by type
   */
  async findByType(type: OrgType): Promise<IOrganization[]> {
    return OrganizationModel.find({ type, isActive: true }).lean();
  },

  /**
   * Find multiple organizations by IDs (for batch lookup)
   */
  async findByIds(ids: string[]): Promise<IOrganization[]> {
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    return OrganizationModel.find({ 
      _id: { $in: objectIds } 
    }).select('_id name type').lean();
  },

  /**
   * Find all organizations with pagination and filtering
   */
  async findAll(options: OrgQueryOptions = {}): Promise<PaginatedResult<IOrganization>> {
    const {
      type,
      isActive,
      isVerified,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const filter: FilterQuery = {};

    if (type) {
      filter.type = type;
    }

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }

    if (typeof isVerified === 'boolean') {
      filter.isVerified = isVerified;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { licenseNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      OrganizationModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      OrganizationModel.countDocuments(filter),
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
   * Update an organization
   */
  async update(id: string, data: Partial<IOrganization>): Promise<IOrganization | null> {
    return OrganizationModel.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
  },

  /**
   * Verify an organization
   */
  async verify(id: string, verifiedBy: string): Promise<IOrganization | null> {
    return OrganizationModel.findByIdAndUpdate(
      id,
      { 
        isVerified: true, 
        verifiedAt: new Date(),
        verifiedBy,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();
  },

  /**
   * Soft delete (deactivate) an organization
   */
  async softDelete(id: string): Promise<IOrganization | null> {
    return OrganizationModel.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).lean();
  },

  /**
   * Hard delete an organization (use with caution)
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await OrganizationModel.findByIdAndDelete(id);
    return result !== null;
  },

  /**
   * Check if organization exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await OrganizationModel.countDocuments({ _id: id });
    return count > 0;
  },

  /**
   * Count organizations by filter
   */
  async count(filter: FilterQuery = {}): Promise<number> {
    return OrganizationModel.countDocuments(filter);
  },

  /**
   * Get member count for an organization
   */
  async getMemberCount(orgId: string): Promise<number> {
    const MembershipModel = (await import('../domain/membership.entity')).MembershipModel;
    return MembershipModel.countDocuments({ 
      organizationId: orgId, 
      status: 'ACTIVE' 
    });
  },

  /**
   * Find organizations by license state
   */
  async findByLicenseState(state: string): Promise<IOrganization[]> {
    return OrganizationModel.find({ 
      licenseState: state.toUpperCase(), 
      isActive: true 
    }).lean();
  },

  /**
   * Get organizations with stats (member count)
   */
  async findAllWithStats(options: OrgQueryOptions = {}): Promise<PaginatedResult<IOrganization & { memberCount: number }>> {
    const result = await this.findAll(options);
    
    const dataWithStats = await Promise.all(
      result.data.map(async (org) => ({
        ...org,
        memberCount: await this.getMemberCount(org._id as unknown as string),
      }))
    );

    return {
      ...result,
      data: dataWithStats as unknown as (IOrganization & { memberCount: number })[],
    };
  },
};
