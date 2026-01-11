import { ProductRepo, ProductQueryOptions } from '../repositories/product.repo';
import { IProduct, LeanProduct, IProductBase, ComplianceStatus, ProductStatus } from '../domain/product.entity';
import { 
  emitProductCreated, 
  emitProductUpdated,
  emitProductDeleted,
  emitComplianceStatusChanged,
  emitInventoryChanged,
} from '../events/product.producer';
import { 
  NotFoundError, 
  ConflictError, 
  ValidationError,
  ComplianceError,
} from '../errors/service.errors';

// Type alias for returned products
type ProductResult = IProduct | LeanProduct;

export const ProductService = {
  /**
   * Create a new product
   * For ORGANIZATION scope: organizationId is required
   * For GLOBAL scope: organizationId should be undefined
   */
  async create(input: {
    scope?: 'GLOBAL' | 'ORGANIZATION';
    merchantId?: string;
    organizationId?: string;
    name: string;
    sku: string;
    description?: string;
    category: string;
    subcategory?: string;
    brand?: string;
    thcContent?: number;
    cbdContent?: number;
    strain?: string;
    strainType?: 'INDICA' | 'SATIVA' | 'HYBRID';
    price?: number;
    costPrice?: number;
    currency?: string;
    quantity?: number;
    unit?: string;
    weight?: number;
    weightUnit?: string;
    batchNumber?: string;
    lotNumber?: string;
    expirationDate?: Date;
    harvestDate?: Date;
    labTested?: boolean;
    labTestUrl?: string;
    labTestDate?: Date;
    images?: string[];
    thumbnailUrl?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    createdBy?: string;
  }): Promise<ProductResult> {
    const scope = input.scope || 'ORGANIZATION';
    
    // For ORGANIZATION scope, use merchantId as fallback organizationId
    // This allows new merchants without an organization to still create products
    let organizationId = input.organizationId;
    if (scope === 'ORGANIZATION' && !organizationId) {
      if (input.merchantId) {
        // Use merchantId as the organization identifier for merchants without a formal org
        organizationId = input.merchantId;
      } else {
        throw new ValidationError('organizationId or merchantId is required for organization products');
      }
    }
    
    // Check for duplicate SKU within organization (or globally for GLOBAL products)
    if (input.merchantId) {
      const existingSku = await ProductRepo.findBySku(input.merchantId, input.sku);
      if (existingSku) {
        throw new ConflictError(`Product with SKU ${input.sku} already exists`);
      }
    }

    const product = await ProductRepo.create({
      ...input,
      scope,
      organizationId, // Use the resolved organizationId
      price: input.price || 0,
      complianceStatus: scope === 'GLOBAL' ? 'COMPLIANT' : 'PENDING',
      status: 'DRAFT',
      isActive: true,
    } as unknown as Partial<IProduct>);

    await emitProductCreated(product);
    return product;
  },

  /**
   * Get a product by ID
   */
  async getById(id: string): Promise<ProductResult> {
    const product = await ProductRepo.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  },

  /**
   * Get all products with pagination
   */
  async getAll(options: ProductQueryOptions = {}) {
    return ProductRepo.findAll(options);
  },

  /**
   * Get products by merchant
   */
  async getByMerchant(merchantId: string) {
    return ProductRepo.findByMerchant(merchantId);
  },

  /**
   * Get products by organization
   */
  async getByOrganization(organizationId: string) {
    return ProductRepo.findByOrganization(organizationId);
  },

  /**
   * Update a product
   */
  async update(id: string, data: Partial<IProduct>, updatedBy?: string): Promise<ProductResult> {
    const product = await ProductRepo.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const updated = await ProductRepo.update(id, { ...data, updatedBy });
    if (!updated) {
      throw new NotFoundError('Product not found');
    }

    await emitProductUpdated(updated);
    return updated;
  },

  /**
   * Update product status
   */
  async updateStatus(id: string, status: ProductStatus): Promise<ProductResult> {
    const product = await ProductRepo.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Validate status transition
    if (status === 'ACTIVE' && product.complianceStatus !== 'COMPLIANT') {
      throw new ComplianceError('Cannot activate non-compliant product');
    }

    const updated = await ProductRepo.updateStatus(id, status);
    if (!updated) {
      throw new NotFoundError('Product not found');
    }

    await emitProductUpdated(updated);
    return updated;
  },

  /**
   * Update compliance status
   */
  async updateComplianceStatus(
    id: string,
    status: ComplianceStatus,
    notes?: string
  ): Promise<ProductResult> {
    const product = await ProductRepo.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const previousStatus = product.complianceStatus;
    const updated = await ProductRepo.updateComplianceStatus(id, status, notes);
    if (!updated) {
      throw new NotFoundError('Product not found');
    }

    // If compliance failed, deactivate the product
    if (status === 'NON_COMPLIANT' && product.status === 'ACTIVE') {
      await ProductRepo.updateStatus(id, 'INACTIVE');
    }

    await emitComplianceStatusChanged(updated, previousStatus);
    return updated;
  },

  /**
   * Update inventory quantity
   */
  async updateInventory(
    id: string,
    quantity: number,
    reason?: string
  ): Promise<ProductResult> {
    const product = await ProductRepo.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (quantity < 0) {
      throw new ValidationError('Quantity cannot be negative');
    }

    const previousQuantity = product.quantity;
    const updated = await ProductRepo.updateQuantity(id, quantity);
    if (!updated) {
      throw new NotFoundError('Product not found');
    }

    await emitInventoryChanged(updated, previousQuantity, quantity, reason);
    return updated;
  },

  /**
   * Adjust inventory (increment/decrement)
   */
  async adjustInventory(
    id: string,
    adjustment: number,
    reason?: string
  ): Promise<ProductResult> {
    const product = await ProductRepo.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const newQuantity = product.quantity + adjustment;
    if (newQuantity < 0) {
      throw new ValidationError('Insufficient inventory');
    }

    const updated = await ProductRepo.adjustQuantity(id, adjustment);
    if (!updated) {
      throw new NotFoundError('Product not found');
    }

    await emitInventoryChanged(updated, product.quantity, newQuantity, reason);
    return updated;
  },

  /**
   * Deactivate a product
   */
  async deactivate(id: string): Promise<ProductResult> {
    const product = await ProductRepo.softDelete(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    await emitProductUpdated(product);
    return product;
  },

  /**
   * Archive a product
   */
  async archive(id: string): Promise<ProductResult> {
    const product = await ProductRepo.archive(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    await emitProductUpdated(product);
    return product;
  },

  /**
   * Delete a product (hard delete)
   */
  async delete(id: string): Promise<void> {
    const product = await ProductRepo.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const deleted = await ProductRepo.hardDelete(id);
    if (!deleted) {
      throw new NotFoundError('Product not found');
    }

    await emitProductDeleted(product);
  },

  /**
   * Get products with pending compliance
   */
  async getPendingCompliance(organizationId?: string) {
    return ProductRepo.findPendingCompliance(organizationId);
  },

  /**
   * Get non-compliant products
   */
  async getNonCompliant(organizationId?: string) {
    return ProductRepo.findNonCompliant(organizationId);
  },

  /**
   * Get low stock products
   */
  async getLowStock(threshold: number = 10, organizationId?: string) {
    return ProductRepo.findLowStock(threshold, organizationId);
  },

  /**
   * Bulk update compliance status
   */
  async bulkUpdateCompliance(ids: string[], status: ComplianceStatus): Promise<number> {
    return ProductRepo.bulkUpdateCompliance(ids, status);
  },
};

// Legacy exports for backwards compatibility
export async function createProduct(input: {
  merchantId: string;
  name: string;
  category: string;
  metadata?: object;
}) {
  return ProductService.create({
    ...input,
    organizationId: input.merchantId,
    sku: `SKU-${Date.now()}`,
    price: 0,
  });
}

export function listMerchantProducts(merchantId: string) {
  return ProductRepo.findByMerchant(merchantId);
}
