import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { z } from 'zod';
import { ProductService } from '../services/product.service';
import { BulkImportService } from '../services/bulk-import.service';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  updateComplianceSchema,
  inventoryUpdateSchema,
} from '../schemas/product.schemas';
import { ValidationError } from '../errors/service.errors';
import { requireAuth, requireRole, getUserContext } from '@veridex/shared';

// Helper for Zod validation with proper type inference
function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ValidationError(message);
  }
  return result.data;
}

// Cast preHandler to fix Fastify type inference issues
const authRequired = requireAuth() as preHandlerHookHandler;
const merchantOrAdmin = requireRole(['MERCHANT', 'ADMIN']) as preHandlerHookHandler;
const adminOnly = requireRole(['ADMIN']) as preHandlerHookHandler;

export async function productRoutes(app: FastifyInstance) {

  // ================== PUBLIC CATALOG (FOR CONSUMERS) ==================

  /**
   * GET /public/products - Public product catalog for consumers
   * Returns ALL products from ALL merchants with sanitized data
   * NO authentication required
   * Fields returned: productId, name, brand, category, complianceScore, complianceStatus
   * NEVER returns: documents, internal flags, audit notes
   */
  app.get('/public/products', async (request, reply) => {
    const query = validate(productQuerySchema, request.query);

    // For public catalog, don't filter by scope - show all active products
    const { scope, ...restQuery } = query as any;

    const options = {
      ...restQuery,
      scope: 'all', // Explicitly include all scopes (Global + Organization)
      // Get all products that are active and visible
      isActive: true,
      tags: query.tags ? query.tags.split(',').map((t: string) => t.trim()) : undefined,
    };

    const result = await ProductService.getAll(options);

    // Sanitize response for consumers - only compliance-related fields
    const sanitizedProducts = result.data.map((product: any) => ({
      _id: product._id, // Required for frontend navigation
      id: product._id,  // Alias for consistency
      name: product.name,
      sku: product.sku,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      description: product.description,
      images: product.images,
      price: product.price,
      merchantName: product.merchantName || 'Verified Merchant',
      organizationName: product.organizationName,
      complianceStatus: product.complianceStatus,
      labTested: product.labTested,
      labTestDate: product.labTestDate,
      thcContent: product.thcContent,
      cbdContent: product.cbdContent,
      strain: product.strain,
      strainType: product.strainType,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      // NEVER expose: documents, internalNotes, auditHistory, merchantId, organizationId
    }));

    return reply.send({
      success: true,
      data: sanitizedProducts,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  });

  /**
   * GET /public/products/:id - Get single product for consumers
   * Returns sanitized product data
   */
  app.get('/public/products/:id', async (request, reply) => {
    const { id } = (request.params as { id: string });
    const product = await ProductService.getById(id);

    if (!product) {
      return reply.status(404).send({ success: false, error: 'Product not found' });
    }

    // Sanitize for consumers
    const sanitized = {
      _id: (product as any)._id, // Required for frontend navigation
      id: (product as any)._id,  // Alias for consistency
      name: product.name,
      sku: product.sku,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      description: product.description,
      images: product.images,
      price: product.price,
      merchantName: (product as any).merchantName || 'Verified Merchant',
      complianceStatus: product.complianceStatus,
      labTested: product.labTested,
      labTestDate: product.labTestDate,
      thcContent: product.thcContent,
      cbdContent: product.cbdContent,
      strain: product.strain,
      strainType: product.strainType,
      createdAt: (product as any).createdAt,
      updatedAt: (product as any).updatedAt,
    };

    return reply.send({ success: true, data: sanitized });
  });

  // ================== PRODUCT CRUD ==================

  /**
   * POST /products - Create a new product (Merchants and Admins only)
   * Always creates ORGANIZATION-scoped products for merchants
   */
  app.post('/products', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const input = validate(createProductSchema, request.body);
    const userContext = getUserContext(request);

    // Merchants can only create ORGANIZATION-scoped products
    // Only SUPER_ADMIN can create GLOBAL products
    const isGlobal = (input as any).scope === 'GLOBAL' && userContext?.role === 'SUPER_ADMIN';

    const productData = {
      ...input,
      scope: (isGlobal ? 'GLOBAL' : 'ORGANIZATION') as 'GLOBAL' | 'ORGANIZATION',
      organizationId: isGlobal ? undefined : (input.organizationId || userContext?.organizationId || ''),
      merchantId: input.merchantId || userContext?.userId || '',
    };

    const product = await ProductService.create(productData);
    return reply.status(201).send({ success: true, data: product });
  });

  // ================== STRICT ISOLATION ENDPOINTS ==================

  /**
   * GET /my-products - STRICT Endpoint for Merchant's own products
   * Enforced validation: Token MUST have organizationId.
   * Query: Only standard filters (pagination, sort). NO ownership overrides.
   */
  app.get('/my-products', { preHandler: authRequired }, async (request, reply) => {
    const userContext = getUserContext(request);
    if (!userContext?.organizationId) {
      return reply.status(403).send({ success: false, error: 'No Organization Context' });
    }
    const query = validate(productQuerySchema, request.query);
    // Force filters - remove any user-provided scope or orgId
    const { scope, organizationId, ...safeQuery } = query as any;

    const options = {
      ...safeQuery,
      organizationId: userContext.organizationId,
      scope: 'ORGANIZATION', // Explicitly force scope
      tags: query.tags ? query.tags.split(',').map((t: string) => t.trim()) : undefined,
    };
    const result = await ProductService.getAll(options);
    return reply.send({ success: true, ...result });
  });

  /**
   * GET /global - STRICT Endpoint for Global products
   * Enforced validation: None (read-only), but content is strictly Global.
   */
  app.get('/global', { preHandler: authRequired }, async (request, reply) => {
    const query = validate(productQuerySchema, request.query);
    // Force filters
    const { scope, organizationId, ...safeQuery } = query as any;

    const options = {
      ...safeQuery,
      scope: 'GLOBAL',
      organizationId: undefined, // Explicitly ignore org filters
      tags: query.tags ? query.tags.split(',').map((t: string) => t.trim()) : undefined,
    };
    const result = await ProductService.getAll(options);
    return reply.send({ success: true, ...result });
  });

  /**
   * GET /products - List products with scope-based filtering
   * 
   * Query params:
   * - scope: 'global' | 'organization' | 'all' (required for proper isolation)
   * - organizationId: auto-injected for merchants
   */
  app.get('/products', { preHandler: authRequired }, async (request, reply) => {
    const query = validate(productQuerySchema, request.query);
    const userContext = getUserContext(request);

    // Determine scope and organization filtering
    let scope = (query as any).scope || undefined;
    let organizationId: string | undefined;

    // CRITICAL: Enforce organization isolation
    if (userContext?.role === 'SUPER_ADMIN' || userContext?.role === 'ADMIN') {
      // Admins can query any scope and organization
      organizationId = query.organizationId;
      if (scope === 'all') scope = 'all';
    } else if (userContext?.role === 'MERCHANT') {
      // Merchants: 
      // - Can view global products (read-only)
      // - Can only view their own organization's products
      if (scope === 'organization' || scope === 'ORGANIZATION') {
        // If merchant has no organization, return empty result for org-scoped queries
        if (!userContext.organizationId) {
          return reply.send({
            success: true,
            data: [],
            total: 0,
            page: query.page || 1,
            limit: query.limit || 20,
            totalPages: 0,
          });
        }
        organizationId = userContext.organizationId;
        scope = 'ORGANIZATION';
      } else if (scope === 'global' || scope === 'GLOBAL') {
        scope = 'GLOBAL';
        organizationId = undefined;
      } else {
        // Default: show their org products + global
        // If no org, only show global products
        organizationId = userContext.organizationId;
        if (!organizationId) {
          scope = 'GLOBAL';
        }
      }
    } else {
      // Consumers: Only global products
      scope = 'GLOBAL';
      organizationId = undefined;
    }

    // Extract scope from query to avoid type mismatch (query.scope could be lowercase)
    const { scope: _queryScope, ...restQuery } = query as any;

    const options = {
      ...restQuery,
      scope: scope as 'GLOBAL' | 'ORGANIZATION' | 'all' | undefined,
      organizationId,
      tags: query.tags ? query.tags.split(',').map((t: string) => t.trim()) : undefined,
    };

    const result = await ProductService.getAll(options);
    return reply.send({ success: true, ...result });
  });

  /**
   * GET /products/:id - Get a specific product
   */
  app.get('/products/:id', { preHandler: authRequired }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    const product = await ProductService.getById(id);
    return reply.send({ success: true, data: product });
  });

  /**
   * POST /products/:id/import - Import a global product to organization
   * Creates a copy of the global product owned by the merchant's organization
   */
  app.post('/products/:id/import', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    const userContext = getUserContext(request);
    const overrides = request.body as { sku?: string; price?: number; quantity?: number };

    if (!userContext?.organizationId) {
      return reply.status(403).send({
        success: false,
        error: 'Organization required to import products'
      });
    }

    // Get the source global product
    const sourceProduct = await ProductService.getById(id);
    if (!sourceProduct || (sourceProduct as any).scope !== 'GLOBAL') {
      return reply.status(400).send({
        success: false,
        error: 'Can only import global products'
      });
    }

    // Create organization-owned copy
    const importedProduct = await ProductService.create({
      name: sourceProduct.name,
      sku: overrides.sku || `${sourceProduct.sku}-${userContext.organizationId.slice(-6)}`,
      description: sourceProduct.description,
      category: sourceProduct.category,
      subcategory: sourceProduct.subcategory,
      brand: sourceProduct.brand,
      thcContent: sourceProduct.thcContent,
      cbdContent: sourceProduct.cbdContent,
      strain: sourceProduct.strain,
      strainType: sourceProduct.strainType,
      price: overrides.price || sourceProduct.price || 0,
      quantity: overrides.quantity || 0,
      images: sourceProduct.images,
      thumbnailUrl: sourceProduct.thumbnailUrl,
      tags: sourceProduct.tags,
      organizationId: userContext.organizationId,
      merchantId: userContext.userId,
      createdBy: userContext.userId,
      // Track the source
      metadata: {
        ...sourceProduct.metadata,
        sourceProductId: String(sourceProduct._id),
        importedAt: new Date().toISOString(),
      },
    });

    return reply.status(201).send({ success: true, data: importedProduct });
  });

  /**
   * PATCH /products/:id - Update a product
   * Ownership verification: Merchants can only update their organization's products
   */
  app.patch('/products/:id', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    const input = validate(updateProductSchema, request.body);
    const userContext = getUserContext(request);
    
    // Get existing product to verify ownership
    const existingProduct = await ProductService.getById(id);
    if (!existingProduct) {
      return reply.status(404).send({ success: false, error: 'Product not found' });
    }
    
    // Ownership verification for non-admins
    if (userContext?.role !== 'ADMIN' && userContext?.role !== 'SUPER_ADMIN') {
      const productOrgId = (existingProduct as any).organizationId?.toString();
      if (productOrgId && productOrgId !== userContext?.organizationId) {
        return reply.status(403).send({ 
          success: false, 
          error: 'Access denied: You can only update products belonging to your organization' 
        });
      }
    }
    
    const product = await ProductService.update(id, input as any);
    return reply.send({ success: true, data: product });
  });

  /**
   * DELETE /products/:id - Deactivate a product
   * Ownership verification: Merchants can only delete their organization's products
   */
  app.delete('/products/:id', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    const userContext = getUserContext(request);
    
    // Get existing product to verify ownership
    const existingProduct = await ProductService.getById(id);
    if (!existingProduct) {
      return reply.status(404).send({ success: false, error: 'Product not found' });
    }
    
    // Ownership verification for non-admins
    if (userContext?.role !== 'ADMIN' && userContext?.role !== 'SUPER_ADMIN') {
      const productOrgId = (existingProduct as any).organizationId?.toString();
      if (productOrgId && productOrgId !== userContext?.organizationId) {
        return reply.status(403).send({ 
          success: false, 
          error: 'Access denied: You can only delete products belonging to your organization' 
        });
      }
    }
    
    await ProductService.deactivate(id);
    return reply.send({ success: true, message: 'Product deactivated' });
  });

  /**
   * POST /products/batch - Get multiple products by IDs
   * Used for enriching document data with product names
   * Protected: Admin only (internal service use)
   */
  app.post('/products/batch', { preHandler: adminOnly }, async (request, reply) => {
    const schema = z.object({
      ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(100),
    });
    
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ 
        success: false, 
        error: result.error.issues.map(i => i.message).join(', ') 
      });
    }
    
    const { ids } = result.data;
    
    // Fetch products by IDs
    const products = await ProductService.getByIds(ids);
    
    // Return a map of id -> product info for easy lookup
    const productMap: Record<string, { name: string; sku: string; category: string }> = {};
    for (const product of products) {
      const id = (product as any)._id?.toString();
      if (id) {
        productMap[id] = { 
          name: product.name, 
          sku: product.sku,
          category: product.category
        };
      }
    }
    
    return reply.send({ success: true, data: productMap });
  });

  /**
   * POST /products/:id/archive - Archive a product
   * Ownership verification: Merchants can only archive their organization's products
   */
  app.post('/products/:id/archive', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    const userContext = getUserContext(request);
    
    // Get existing product to verify ownership
    const existingProduct = await ProductService.getById(id);
    if (!existingProduct) {
      return reply.status(404).send({ success: false, error: 'Product not found' });
    }
    
    // Ownership verification for non-admins
    if (userContext?.role !== 'ADMIN' && userContext?.role !== 'SUPER_ADMIN') {
      const productOrgId = (existingProduct as any).organizationId?.toString();
      if (productOrgId && productOrgId !== userContext?.organizationId) {
        return reply.status(403).send({ 
          success: false, 
          error: 'Access denied: You can only archive products belonging to your organization' 
        });
      }
    }
    
    const product = await ProductService.archive(id);
    return reply.send({ success: true, data: product });
  });

  // ================== STATUS MANAGEMENT ==================

  /**
   * PATCH /products/:id/status - Update product status
   * Ownership verification: Merchants can only update their organization's products
   */
  app.patch('/products/:id/status', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    const { status } = request.body as { status: string };
    const userContext = getUserContext(request);
    
    // Get existing product to verify ownership
    const existingProduct = await ProductService.getById(id);
    if (!existingProduct) {
      return reply.status(404).send({ success: false, error: 'Product not found' });
    }
    
    // Ownership verification for non-admins
    if (userContext?.role !== 'ADMIN' && userContext?.role !== 'SUPER_ADMIN') {
      const productOrgId = (existingProduct as any).organizationId?.toString();
      if (productOrgId && productOrgId !== userContext?.organizationId) {
        return reply.status(403).send({ 
          success: false, 
          error: 'Access denied: You can only update products belonging to your organization' 
        });
      }
    }
    
    const product = await ProductService.updateStatus(id, status as any);
    return reply.send({ success: true, data: product });
  });

  // ================== COMPLIANCE ==================

  /**
   * PATCH /products/:id/compliance - Update compliance status (Admin only)
   */
  app.patch('/products/:id/compliance', { preHandler: adminOnly }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    const input = validate(updateComplianceSchema, request.body);
    const product = await ProductService.updateComplianceStatus(
      id,
      input.complianceStatus as any,
      input.complianceNotes
    );
    return reply.send({ success: true, data: product });
  });

  /**
   * GET /products/compliance/pending - Get products with pending compliance
   */
  app.get('/products/compliance/pending', { preHandler: adminOnly }, async (request, reply) => {
    const { organizationId } = request.query as { organizationId?: string };
    const products = await ProductService.getPendingCompliance(organizationId);
    return reply.send({ success: true, data: products });
  });

  /**
   * GET /products/pending-compliance - Alias for compliance/pending (admin gateway)
   */
  app.get('/products/pending-compliance', { preHandler: adminOnly }, async (request, reply) => {
    const { organizationId } = request.query as { organizationId?: string };
    const products = await ProductService.getPendingCompliance(organizationId);
    return reply.send({ success: true, data: products });
  });

  /**
   * GET /products/compliance/non-compliant - Get non-compliant products
   */
  app.get('/products/compliance/non-compliant', { preHandler: adminOnly }, async (request, reply) => {
    const { organizationId } = request.query as { organizationId?: string };
    const products = await ProductService.getNonCompliant(organizationId);
    return reply.send({ success: true, data: products });
  });

  /**
   * GET /products/non-compliant - Alias for compliance/non-compliant (admin gateway)
   */
  app.get('/products/non-compliant', { preHandler: adminOnly }, async (request, reply) => {
    const { organizationId } = request.query as { organizationId?: string };
    const products = await ProductService.getNonCompliant(organizationId);
    return reply.send({ success: true, data: products });
  });

  // ================== INVENTORY ==================

  /**
   * PATCH /products/:id/inventory - Update inventory
   * Ownership verification: Merchants can only update their organization's products
   */
  app.patch('/products/:id/inventory', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    const input = validate(inventoryUpdateSchema, request.body);
    const userContext = getUserContext(request);
    
    // Get existing product to verify ownership
    const existingProduct = await ProductService.getById(id);
    if (!existingProduct) {
      return reply.status(404).send({ success: false, error: 'Product not found' });
    }
    
    // Ownership verification for non-admins
    if (userContext?.role !== 'ADMIN' && userContext?.role !== 'SUPER_ADMIN') {
      const productOrgId = (existingProduct as any).organizationId?.toString();
      if (productOrgId && productOrgId !== userContext?.organizationId) {
        return reply.status(403).send({ 
          success: false, 
          error: 'Access denied: You can only update inventory for products belonging to your organization' 
        });
      }
    }
    
    const product = await ProductService.updateInventory(id, input.quantity, input.reason);
    return reply.send({ success: true, data: product });
  });

  /**
   * POST /products/:id/inventory/adjust - Adjust inventory (increment/decrement)
   * Ownership verification: Merchants can only adjust their organization's products
   */
  app.post('/products/:id/inventory/adjust', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const { id } = (request.params as { id: string });
    const { adjustment, reason } = request.body as { adjustment: number; reason?: string };
    const userContext = getUserContext(request);
    
    // Get existing product to verify ownership
    const existingProduct = await ProductService.getById(id);
    if (!existingProduct) {
      return reply.status(404).send({ success: false, error: 'Product not found' });
    }
    
    // Ownership verification for non-admins
    if (userContext?.role !== 'ADMIN' && userContext?.role !== 'SUPER_ADMIN') {
      const productOrgId = (existingProduct as any).organizationId?.toString();
      if (productOrgId && productOrgId !== userContext?.organizationId) {
        return reply.status(403).send({ 
          success: false, 
          error: 'Access denied: You can only adjust inventory for products belonging to your organization' 
        });
      }
    }
    
    const product = await ProductService.adjustInventory(id, adjustment, reason);
    return reply.send({ success: true, data: product });
  });

  /**
   * GET /products/inventory/low-stock - Get low stock products
   */
  app.get('/products/inventory/low-stock', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const { threshold, organizationId } = request.query as { threshold?: number; organizationId?: string };
    const userContext = getUserContext(request);

    // Non-admins can only see their organization's products
    const orgId = userContext?.role === 'ADMIN'
      ? organizationId
      : (userContext?.organizationId || organizationId);

    const products = await ProductService.getLowStock(threshold, orgId);
    return reply.send({ success: true, data: products });
  });

  // ================== MERCHANT/ORG QUERIES ==================

  /**
   * GET /merchants/:merchantId/products - Get products by merchant
   */
  app.get('/merchants/:merchantId/products', { preHandler: authRequired }, async (request, reply) => {
    const { merchantId } = (request.params as { merchantId: string });
    const products = await ProductService.getByMerchant(merchantId);
    return reply.send({ success: true, data: products });
  });

  /**
   * GET /organizations/:organizationId/products - Get products by organization
   */
  app.get('/organizations/:organizationId/products', { preHandler: authRequired }, async (request, reply) => {
    const { organizationId } = (request.params as { organizationId: string });
    const products = await ProductService.getByOrganization(organizationId);
    return reply.send({ success: true, data: products });
  });

  /**
   * GET /products/organization/:organizationId - Alias for admin gateway
   */
  app.get('/products/organization/:organizationId', { preHandler: authRequired }, async (request, reply) => {
    const { organizationId } = (request.params as { organizationId: string });
    const products = await ProductService.getByOrganization(organizationId);
    return reply.send({ success: true, data: products });
  });

  // ================== BULK IMPORT ==================

  /**
   * POST /products/bulk-import/csv - Bulk import products from CSV
   * Protected: Merchants and Admins only
   */
  app.post('/products/bulk-import/csv', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const userContext = getUserContext(request);
    
    if (!userContext?.organizationId && !userContext?.userId) {
      return reply.status(400).send({ 
        success: false, 
        error: 'Organization context is required for bulk import' 
      });
    }
    
    const body = request.body as { 
      csvData: string; 
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      validateOnly?: boolean;
    };
    
    if (!body.csvData || typeof body.csvData !== 'string') {
      return reply.status(400).send({ 
        success: false, 
        error: 'csvData is required' 
      });
    }
    
    const result = await BulkImportService.importFromCSV(body.csvData, {
      organizationId: userContext.organizationId || userContext.userId || '',
      merchantId: userContext.userId || '',
      skipDuplicates: body.skipDuplicates,
      updateExisting: body.updateExisting,
      validateOnly: body.validateOnly,
    });
    
    return reply.send({ success: true, data: result });
  });

  /**
   * POST /products/bulk-import/json - Bulk import products from JSON
   * Protected: Merchants and Admins only
   */
  app.post('/products/bulk-import/json', { preHandler: merchantOrAdmin }, async (request, reply) => {
    const userContext = getUserContext(request);
    
    if (!userContext?.organizationId && !userContext?.userId) {
      return reply.status(400).send({ 
        success: false, 
        error: 'Organization context is required for bulk import' 
      });
    }
    
    const body = request.body as { 
      products: Record<string, unknown>[]; 
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      validateOnly?: boolean;
    };
    
    if (!body.products || !Array.isArray(body.products)) {
      return reply.status(400).send({ 
        success: false, 
        error: 'products array is required' 
      });
    }
    
    const result = await BulkImportService.importFromJSON(body.products, {
      organizationId: userContext.organizationId || userContext.userId || '',
      merchantId: userContext.userId || '',
      skipDuplicates: body.skipDuplicates,
      updateExisting: body.updateExisting,
      validateOnly: body.validateOnly,
    });
    
    return reply.send({ success: true, data: result });
  });

  /**
   * GET /products/bulk-import/template - Get CSV template for bulk import
   * Public endpoint
   */
  app.get('/products/bulk-import/template', async (_request, reply) => {
    const template = BulkImportService.generateCSVTemplate();
    
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="product-import-template.csv"');
    
    return reply.send(template);
  });
}
