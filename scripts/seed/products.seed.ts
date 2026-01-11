import { log } from '../utils/logger';
import { connect } from '../utils/mongo';
import { DB_URIS } from '../config/env';
import { getProductModel, getOrganizationModel } from './schemas';
import { PRODUCTS } from './data';

/**
 * Products Seed
 * 
 * Creates products owned by merchant organizations.
 * 
 * Responsibilities:
 * - Create products in products DB
 * - Link products to merchant organizations
 * - Set initial compliance states
 * - Create diverse product categories
 * 
 * Dependencies: merchants.seed.ts (products need org owners)
 */

// Track created products for downstream seeds
export const createdProducts: Map<string, string> = new Map(); // name -> id
export const productToOrg: Map<string, string> = new Map(); // productId -> orgId

export async function seedProducts(): Promise<void> {
  log.step('Connecting to databases...');
  
  const productsDb = await connect('products', DB_URIS.products);
  const userOrgDb = await connect('userOrg', DB_URIS.userOrg);

  const Product = getProductModel(productsDb);
  const Organization = getOrganizationModel(userOrgDb);

  log.step('Fetching organizations...');
  
  // Get all organizations created in merchants seed
  const organizations = await Organization.find({}).lean();
  const orgMap = new Map<string, string>(); // name -> id
  
  for (const org of organizations) {
    orgMap.set(org.name as string, String(org._id));
  }

  log.info(`Found ${organizations.length} organizations`);

  log.step('Clearing existing products...');
  await Product.deleteMany({});

  log.step(`Creating ${PRODUCTS.length} products...`);

  let created = 0;
  const statusCounts = { PENDING: 0, COMPLIANT: 0, NON_COMPLIANT: 0 };

  for (const productData of PRODUCTS) {
    const merchantId = orgMap.get(productData.organizationName);
    
    if (!merchantId) {
      log.warn(`Organization not found: ${productData.organizationName}, skipping product: ${productData.name}`);
      continue;
    }

    const product = await Product.create({
      merchantId,
      name: productData.name,
      category: productData.category,
      complianceStatus: productData.complianceStatus,
      metadata: {
        createdBy: 'seed',
        seededAt: new Date().toISOString(),
      },
    });

    const productId = String(product._id);
    createdProducts.set(productData.name, productId);
    productToOrg.set(productId, merchantId);
    
    statusCounts[productData.complianceStatus]++;
    created++;
    
    log.info(`Created product: ${productData.name} (${productData.category}) - ${productData.complianceStatus}`);
  }

  log.count('Products created', created);
  log.count('PENDING', statusCounts.PENDING);
  log.count('COMPLIANT', statusCounts.COMPLIANT);
  log.count('NON_COMPLIANT', statusCounts.NON_COMPLIANT);
}
