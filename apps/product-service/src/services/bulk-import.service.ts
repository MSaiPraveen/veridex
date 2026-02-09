import { z } from 'zod';
import { createProductSchema } from '../schemas/product.schemas';
import { ProductService } from './product.service';
import { ValidationError } from '../errors/service.errors';

// Schema for a single row in bulk import
const bulkProductRowSchema = createProductSchema.extend({
  // Additional fields for bulk import
  rowNumber: z.number().optional(),
});

type BulkProductRow = z.infer<typeof bulkProductRowSchema>;

export interface BulkImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors: Array<{
    rowNumber: number;
    sku?: string;
    error: string;
    field?: string;
  }>;
  imported: Array<{
    rowNumber: number;
    productId: string;
    sku: string;
    name: string;
  }>;
  skipped: Array<{
    rowNumber: number;
    sku: string;
    reason: string;
  }>;
  processingTimeMs: number;
}

export interface BulkImportOptions {
  organizationId: string;
  merchantId: string;
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  validateOnly?: boolean;
  batchSize?: number;
}

/**
 * Bulk Product Import Service
 * 
 * Handles bulk import of products from CSV/JSON data.
 * Provides validation, duplicate detection, and batch processing.
 */
export const BulkImportService = {
  /**
   * Parse CSV data into product rows
   */
  parseCSV(csvData: string): Record<string, string>[] {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      throw new ValidationError('CSV must have at least a header row and one data row');
    }
    
    // Parse header
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    
    // Map headers to schema fields
    const fieldMap: Record<string, string> = {
      'name': 'name',
      'product_name': 'name',
      'sku': 'sku',
      'product_sku': 'sku',
      'description': 'description',
      'category': 'category',
      'subcategory': 'subcategory',
      'brand': 'brand',
      'price': 'price',
      'cost_price': 'costPrice',
      'cost': 'costPrice',
      'quantity': 'quantity',
      'stock': 'quantity',
      'unit': 'unit',
      'weight': 'weight',
      'weight_unit': 'weightUnit',
      'thc_content': 'thcContent',
      'thc': 'thcContent',
      'cbd_content': 'cbdContent',
      'cbd': 'cbdContent',
      'strain': 'strain',
      'strain_type': 'strainType',
      'batch_number': 'batchNumber',
      'lot_number': 'lotNumber',
      'expiration_date': 'expirationDate',
      'harvest_date': 'harvestDate',
      'lab_tested': 'labTested',
      'lab_test_url': 'labTestUrl',
      'lab_test_date': 'labTestDate',
      'tags': 'tags',
    };
    
    const normalizedHeaders = headers.map((h) => {
      const normalized = h.toLowerCase().replace(/\s+/g, '_');
      return fieldMap[normalized] || normalized;
    });
    
    // Parse data rows
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
      
      const row: Record<string, string> = {};
      normalizedHeaders.forEach((header, idx) => {
        if (values[idx] !== undefined && values[idx] !== '') {
          row[header] = values[idx];
        }
      });
      rows.push(row);
    }
    
    return rows;
  },
  
  /**
   * Parse a single CSV line handling quoted values
   */
  parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    return values;
  },
  
  /**
   * Transform raw row data to product schema format
   */
  transformRow(row: Record<string, string>, rowNumber: number): Record<string, unknown> {
    const transformed: Record<string, unknown> = { rowNumber };
    
    // String fields
    const stringFields = ['name', 'sku', 'description', 'category', 'subcategory', 'brand', 
                          'strain', 'strainType', 'unit', 'weightUnit', 'batchNumber', 
                          'lotNumber', 'labTestUrl'];
    stringFields.forEach((field) => {
      if (row[field]) {
        transformed[field] = row[field];
      }
    });
    
    // Number fields
    const numberFields = ['price', 'costPrice', 'quantity', 'weight', 'thcContent', 'cbdContent'];
    numberFields.forEach((field) => {
      if (row[field]) {
        const num = parseFloat(row[field]);
        if (!isNaN(num)) {
          transformed[field] = num;
        }
      }
    });
    
    // Boolean fields
    if (row.labTested) {
      transformed.labTested = ['true', '1', 'yes', 'y'].includes(row.labTested.toLowerCase());
    }
    
    // Date fields
    const dateFields = ['expirationDate', 'harvestDate', 'labTestDate'];
    dateFields.forEach((field) => {
      if (row[field]) {
        const date = new Date(row[field]);
        if (!isNaN(date.getTime())) {
          transformed[field] = date;
        }
      }
    });
    
    // Array fields (comma-separated in CSV)
    if (row.tags) {
      transformed.tags = row.tags.split(';').map((t) => t.trim()).filter(Boolean);
    }
    
    if (row.images) {
      transformed.images = row.images.split(';').map((t) => t.trim()).filter(Boolean);
    }
    
    return transformed;
  },
  
  /**
   * Validate a batch of products
   */
  validateProducts(
    products: Record<string, unknown>[]
  ): { valid: BulkProductRow[]; errors: Array<{ rowNumber: number; error: string; field?: string }> } {
    const valid: BulkProductRow[] = [];
    const errors: Array<{ rowNumber: number; error: string; field?: string }> = [];
    
    for (const product of products) {
      const rowNumber = (product.rowNumber as number) || 0;
      const result = bulkProductRowSchema.safeParse(product);
      
      if (result.success) {
        valid.push(result.data);
      } else {
        for (const issue of result.error.issues) {
          errors.push({
            rowNumber,
            error: issue.message,
            field: issue.path.join('.'),
          });
        }
      }
    }
    
    return { valid, errors };
  },
  
  /**
   * Import products from parsed data
   */
  async importProducts(
    data: Record<string, unknown>[],
    options: BulkImportOptions
  ): Promise<BulkImportResult> {
    const startTime = Date.now();
    const result: BulkImportResult = {
      success: true,
      totalRows: data.length,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      errors: [],
      imported: [],
      skipped: [],
      processingTimeMs: 0,
    };
    
    // Add organization and merchant IDs
    const products = data.map((row, idx) => ({
      ...this.transformRow(row as Record<string, string>, idx + 1),
      organizationId: options.organizationId,
      merchantId: options.merchantId,
    }));
    
    // Validate all products
    const { valid, errors } = this.validateProducts(products);
    result.errors.push(...errors);
    result.errorCount += errors.length;
    
    // If validate only, return early
    if (options.validateOnly) {
      result.processingTimeMs = Date.now() - startTime;
      result.success = errors.length === 0;
      return result;
    }
    
    // Process valid products in batches
    const batchSize = options.batchSize || 50;
    for (let i = 0; i < valid.length; i += batchSize) {
      const batch = valid.slice(i, i + batchSize);
      
      for (const product of batch) {
        try {
          // Check for existing product by SKU
          const existing = await ProductService.findBySku(
            product.sku, 
            options.organizationId
          );
          
          if (existing) {
            if (options.updateExisting) {
              // Update existing product
              const updated = await ProductService.update(
                String(existing._id),
                { ...product, updatedBy: options.merchantId } as any
              );
              result.imported.push({
                rowNumber: product.rowNumber || 0,
                productId: String(updated._id),
                sku: updated.sku,
                name: updated.name,
              });
              result.successCount++;
            } else if (options.skipDuplicates) {
              // Skip duplicate
              result.skipped.push({
                rowNumber: product.rowNumber || 0,
                sku: product.sku,
                reason: 'Duplicate SKU - skipped',
              });
              result.skippedCount++;
            } else {
              // Error on duplicate
              result.errors.push({
                rowNumber: product.rowNumber || 0,
                sku: product.sku,
                error: `Product with SKU ${product.sku} already exists`,
              });
              result.errorCount++;
            }
          } else {
            // Create new product
            const createInput = {
              ...product,
              scope: 'ORGANIZATION' as const,
              createdBy: options.merchantId,
            };
            const created = await ProductService.create(createInput as any);
            
            result.imported.push({
              rowNumber: product.rowNumber || 0,
              productId: String(created._id),
              sku: created.sku,
              name: created.name,
            });
            result.successCount++;
          }
        } catch (error) {
          result.errors.push({
            rowNumber: product.rowNumber || 0,
            sku: product.sku,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.errorCount++;
        }
      }
    }
    
    result.processingTimeMs = Date.now() - startTime;
    result.success = result.errorCount === 0;
    
    return result;
  },
  
  /**
   * Import from CSV string
   */
  async importFromCSV(csvData: string, options: BulkImportOptions): Promise<BulkImportResult> {
    const rows = this.parseCSV(csvData);
    return this.importProducts(rows, options);
  },
  
  /**
   * Import from JSON array
   */
  async importFromJSON(jsonData: Record<string, unknown>[], options: BulkImportOptions): Promise<BulkImportResult> {
    return this.importProducts(jsonData, options);
  },
  
  /**
   * Generate CSV template
   */
  generateCSVTemplate(): string {
    const headers = [
      'name', 'sku', 'description', 'category', 'subcategory', 'brand',
      'price', 'cost_price', 'quantity', 'unit', 'weight', 'weight_unit',
      'thc_content', 'cbd_content', 'strain', 'strain_type',
      'batch_number', 'lot_number', 'expiration_date', 'harvest_date',
      'lab_tested', 'lab_test_url', 'lab_test_date', 'tags'
    ];
    
    const exampleRow = [
      'Sample Product', 'SKU-001', 'Product description', 'FLOWER', 'Indoor',
      'Brand Name', '29.99', '15.00', '100', 'unit', '3.5', 'g',
      '22.5', '0.5', 'Blue Dream', 'HYBRID',
      'BATCH-001', 'LOT-001', '2025-12-31', '2024-06-15',
      'true', 'https://lab.example.com/results/123', '2024-06-20', 'premium;organic'
    ];
    
    return `${headers.join(',')}\n${exampleRow.join(',')}`;
  },
};

export default BulkImportService;
