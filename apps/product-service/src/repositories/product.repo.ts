import mongoose, { Types } from 'mongoose';
import { ProductModel, IProduct, LeanProduct, ComplianceStatus, ProductStatus, ProductCategory, ProductScope } from '../domain/product.entity';

// Simple filter type compatible with Mongoose 9
type FilterQuery = Record<string, unknown>;
type SortOrder = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';

export interface ProductQueryOptions {
  // CRITICAL: Scope-based filtering
  scope?: ProductScope | 'all';
  merchantId?: string;
  organizationId?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  complianceStatus?: ComplianceStatus;
  isActive?: boolean;
  labTested?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  tags?: string[];
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

export const ProductRepo = {
  /**
   * Create a new product
   */
  async create(data: Partial<IProduct>): Promise<IProduct> {
    const product = new ProductModel(data);
    return product.save();
  },

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<LeanProduct | null> {
    return ProductModel.findById(id).lean() as Promise<LeanProduct | null>;
  },

  /**
   * Find multiple products by IDs (for batch lookup)
   */
  async findByIds(ids: string[]): Promise<LeanProduct[]> {
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    return ProductModel.find({ 
      _id: { $in: objectIds } 
    }).select('_id name sku category').lean() as Promise<LeanProduct[]>;
  },

  /**
   * Find product by SKU for a merchant
   */
  async findBySku(merchantId: string, sku: string): Promise<LeanProduct | null> {
    return ProductModel.findOne({
      merchantId,
      sku: sku.toUpperCase()
    }).lean() as Promise<LeanProduct | null>;
  },

  /**
   * Find product by SKU within an organization
   */
  async findBySkuAndOrg(sku: string, organizationId: string): Promise<LeanProduct | null> {
    return ProductModel.findOne({
      organizationId,
      sku: sku.toUpperCase()
    }).lean() as Promise<LeanProduct | null>;
  },

  /**
   * Find all products by merchant
   */
  async findByMerchant(merchantId: string): Promise<LeanProduct[]> {
    return ProductModel.find({ merchantId, isActive: true }).lean() as Promise<LeanProduct[]>;
  },

  /**
   * Find all products by organization
   */
  async findByOrganization(organizationId: string): Promise<LeanProduct[]> {
    return ProductModel.find({ organizationId, isActive: true }).lean() as Promise<LeanProduct[]>;
  },

  /**
   * Find all products with pagination and filtering
   * CRITICAL: Enforces scope-based isolation
   */
  async findAll(options: ProductQueryOptions = {}): Promise<PaginatedResult<LeanProduct>> {
    const {
      scope,
      merchantId,
      organizationId,
      category,
      status,
      complianceStatus,
      isActive,
      labTested,
      minPrice,
      maxPrice,
      search,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const filter: FilterQuery = {};

    // CRITICAL: Scope-based filtering
    if (scope === 'GLOBAL') {
      // Only global products
      filter.scope = 'GLOBAL';
    } else if (scope === 'ORGANIZATION') {
      // Only organization products - organizationId MUST be provided
      filter.scope = 'ORGANIZATION';
      if (organizationId) {
        filter.organizationId = organizationId;
      }
    } else if (scope === 'all') {
      // For super admin - no scope filter
      if (organizationId) {
        filter.organizationId = organizationId;
      }
    } else {
      // Default: show organization products if orgId provided, else global only
      if (organizationId) {
        filter.$or = [
          { scope: 'GLOBAL' },
          { scope: 'ORGANIZATION', organizationId },
        ];
      } else {
        filter.scope = 'GLOBAL';
      }
    }

    if (merchantId) filter.merchantId = merchantId;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (complianceStatus) filter.complianceStatus = complianceStatus;
    if (typeof isActive === 'boolean') filter.isActive = isActive;
    if (typeof labTested === 'boolean') filter.labTested = labTested;

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: { $gte?: number; $lte?: number } = {};
      if (minPrice !== undefined) priceFilter.$gte = minPrice;
      if (maxPrice !== undefined) priceFilter.$lte = maxPrice;
      filter.price = priceFilter;
    }

    // Tags filter
    if (tags && tags.length > 0) {
      filter.tags = { $all: tags };
    }

    // Text search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      ProductModel.find(filter).sort(sort).skip(skip).limit(limit).lean() as Promise<LeanProduct[]>,
      ProductModel.countDocuments(filter),
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
   * Update a product
   */
  async update(id: string, data: Partial<IProduct>): Promise<LeanProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean() as Promise<LeanProduct | null>;
  },

  /**
   * Update compliance status
   */
  async updateComplianceStatus(
    id: string,
    status: ComplianceStatus,
    notes?: string
  ): Promise<LeanProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      {
        complianceStatus: status,
        complianceNotes: notes,
        lastComplianceCheck: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    ).lean() as Promise<LeanProduct | null>;
  },

  /**
   * Update product status
   */
  async updateStatus(id: string, status: ProductStatus): Promise<LeanProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    ).lean() as Promise<LeanProduct | null>;
  },

  /**
   * Update inventory quantity
   */
  async updateQuantity(id: string, quantity: number): Promise<LeanProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      { quantity, updatedAt: new Date() },
      { new: true }
    ).lean() as Promise<LeanProduct | null>;
  },

  /**
   * Increment/decrement inventory
   */
  async adjustQuantity(id: string, adjustment: number): Promise<LeanProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      {
        $inc: { quantity: adjustment },
        updatedAt: new Date(),
      },
      { new: true }
    ).lean() as Promise<LeanProduct | null>;
  },

  /**
   * Soft delete (deactivate) a product
   */
  async softDelete(id: string): Promise<LeanProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      { isActive: false, status: 'INACTIVE', updatedAt: new Date() },
      { new: true }
    ).lean() as Promise<LeanProduct | null>;
  },

  /**
   * Archive a product
   */
  async archive(id: string): Promise<LeanProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      { status: 'ARCHIVED', isActive: false, updatedAt: new Date() },
      { new: true }
    ).lean() as Promise<LeanProduct | null>;
  },

  /**
   * Hard delete a product (use with caution)
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await ProductModel.findByIdAndDelete(id);
    return result !== null;
  },

  /**
   * Check if product exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await ProductModel.countDocuments({ _id: id });
    return count > 0;
  },

  /**
   * Count products by filter
   */
  async count(filter: FilterQuery = {}): Promise<number> {
    return ProductModel.countDocuments(filter);
  },

  /**
   * Find products with pending compliance
   */
  async findPendingCompliance(organizationId?: string): Promise<LeanProduct[]> {
    const filter: FilterQuery = {
      complianceStatus: 'PENDING',
      isActive: true,
    };
    if (organizationId) filter.organizationId = organizationId;
    return ProductModel.find(filter).lean() as Promise<LeanProduct[]>;
  },

  /**
   * Find non-compliant products
   */
  async findNonCompliant(organizationId?: string): Promise<LeanProduct[]> {
    const filter: FilterQuery = {
      complianceStatus: 'NON_COMPLIANT',
      isActive: true,
    };
    if (organizationId) filter.organizationId = organizationId;
    return ProductModel.find(filter).lean() as Promise<LeanProduct[]>;
  },

  /**
   * Find low stock products
   */
  async findLowStock(threshold: number = 10, organizationId?: string): Promise<LeanProduct[]> {
    const filter: FilterQuery = {
      quantity: { $lte: threshold },
      status: 'ACTIVE',
      isActive: true,
    };
    if (organizationId) filter.organizationId = organizationId;
    return ProductModel.find(filter).lean() as Promise<LeanProduct[]>;
  },

  /**
   * Bulk update compliance status
   */
  async bulkUpdateCompliance(
    ids: string[],
    status: ComplianceStatus
  ): Promise<number> {
    const result = await ProductModel.updateMany(
      { _id: { $in: ids } },
      {
        complianceStatus: status,
        lastComplianceCheck: new Date(),
        updatedAt: new Date(),
      }
    );
    return result.modifiedCount;
  },
};
