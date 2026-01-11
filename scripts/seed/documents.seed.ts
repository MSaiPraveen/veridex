import { log } from '../utils/logger';
import { connect } from '../utils/mongo';
import { DB_URIS } from '../config/env';
import { getDocumentModel, getProductModel, getOrganizationModel } from './schemas';
import { DOCUMENTS, generateExtractedData, generateFilePath } from './data';

/**
 * Documents Seed
 * 
 * Creates compliance documents for products.
 * This is the most important seed for testing compliance logic.
 * 
 * Responsibilities:
 * - Create lab reports (valid + invalid)
 * - Create licenses (valid + expired)
 * - Create insurance proofs (valid + invalid)
 * - Link documents to products
 * - Create edge cases for compliance engine
 * 
 * Dependencies: products.seed.ts (documents need products)
 */

export async function seedDocuments(): Promise<void> {
  log.step('Connecting to databases...');
  
  const documentsDb = await connect('documents', DB_URIS.documents);
  const productsDb = await connect('products', DB_URIS.products);
  const userOrgDb = await connect('userOrg', DB_URIS.userOrg);

  const Document = getDocumentModel(documentsDb);
  const Product = getProductModel(productsDb);
  const Organization = getOrganizationModel(userOrgDb);

  log.step('Fetching products and organizations...');
  
  // Build lookup maps
  const products = await Product.find({}).lean();
  const productMap = new Map<string, { id: string; merchantId: string; name: string }>();
  
  for (const product of products) {
    productMap.set(product.name as string, {
      id: String(product._id),
      merchantId: product.merchantId as string,
      name: product.name as string,
    });
  }

  const organizations = await Organization.find({}).lean();
  const orgIdToName = new Map<string, string>();
  
  for (const org of organizations) {
    orgIdToName.set(String(org._id), org.name as string);
  }

  log.info(`Found ${products.length} products`);
  log.info(`Found ${organizations.length} organizations`);

  log.step('Clearing existing documents...');
  await Document.deleteMany({});

  log.step(`Creating ${DOCUMENTS.length} documents...`);

  let created = 0;
  const typeCounts = { LAB_REPORT: 0, BUSINESS_LICENSE: 0, INSURANCE: 0 };
  const statusCounts = { PENDING: 0, SUCCESS: 0, FAILED: 0 };
  let invalidCount = 0;

  for (const docData of DOCUMENTS) {
    const productInfo = productMap.get(docData.productName);
    
    if (!productInfo) {
      log.warn(`Product not found: ${docData.productName}, skipping document`);
      continue;
    }

    const orgName = orgIdToName.get(productInfo.merchantId) || 'Unknown Org';

    // Generate extracted data based on validity
    const extracted = docData.extractionStatus === 'SUCCESS' || docData.extractionStatus === 'PENDING'
      ? generateExtractedData(docData.type, docData.isValid, orgName)
      : undefined;

    const document = await Document.create({
      ownerId: productInfo.merchantId,
      productId: productInfo.id,
      type: docData.type,
      filePath: generateFilePath(docData.type, productInfo.id),
      extractionStatus: docData.extractionStatus,
      extracted: docData.extractionStatus === 'SUCCESS' ? extracted : undefined,
      failureReason: docData.failureReason,
    });

    typeCounts[docData.type]++;
    statusCounts[docData.extractionStatus]++;
    if (!docData.isValid) invalidCount++;
    created++;

    const validityLabel = docData.isValid ? '✓ valid' : '✗ invalid';
    log.info(`Created ${docData.type} for ${docData.productName} (${docData.extractionStatus}, ${validityLabel})`);
  }

  log.blank();
  log.section('Document Summary');
  log.count('Total documents', created);
  log.blank();
  log.info('By Type:');
  log.count('  LAB_REPORT', typeCounts.LAB_REPORT);
  log.count('  BUSINESS_LICENSE', typeCounts.BUSINESS_LICENSE);
  log.count('  INSURANCE', typeCounts.INSURANCE);
  log.blank();
  log.info('By Extraction Status:');
  log.count('  PENDING', statusCounts.PENDING);
  log.count('  SUCCESS', statusCounts.SUCCESS);
  log.count('  FAILED', statusCounts.FAILED);
  log.blank();
  log.info('Compliance Testing:');
  log.count('  Valid documents', created - invalidCount);
  log.count('  Invalid documents', invalidCount);
}
