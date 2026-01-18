/**
 * Product Service Unit Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../helpers/mongo-memory';

// Mock Kafka
vi.mock('kafkajs', () => ({
  Kafka: vi.fn(() => ({
    producer: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue({ topicPartitions: [] }),
      on: vi.fn(),
    })),
    consumer: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      run: vi.fn().mockResolvedValue(undefined),
    })),
  })),
  logLevel: {
    NOTHING: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 4,
    DEBUG: 5,
  },
}));

// Mock environment
vi.mock('../../config/env', () => ({
  env: {
    PORT: '3003',
    MONGO_URI: 'mongodb://localhost:27017/test',
    KAFKA_BROKER: 'localhost:9092',
  },
}));

import { ProductService } from '../../services/product.service';
import { ProductRepo } from '../../repositories/product.repo';
import { NotFoundError, ConflictError, ValidationError } from '../../errors/service.errors';

// Valid MongoDB ObjectIds for testing
const TEST_MERCHANT_ID = '507f1f77bcf86cd799439011';
const TEST_ORG_ID = '507f1f77bcf86cd799439012';

describe('ProductService', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const input = {
        merchantId: TEST_MERCHANT_ID,
        name: 'Test Product',
        sku: 'TEST-001',
        category: 'FLOWER',
        description: 'A test product',
        price: 99.99,
      };

      const product = await ProductService.create(input);

      expect(product).toBeDefined();
      expect(product.name).toBe(input.name);
      expect(product.sku).toBe(input.sku);
      expect(product.category).toBe(input.category);
      expect(product.complianceStatus).toBe('PENDING');
      expect(product.status).toBe('DRAFT');
    });

    it('should create a GLOBAL product', async () => {
      const input = {
        scope: 'GLOBAL' as const,
        name: 'Global Product',
        sku: 'GLOBAL-001',
        category: 'OTHER',
      };

      const product = await ProductService.create(input);

      expect(product.scope).toBe('GLOBAL');
      expect(product.complianceStatus).toBe('COMPLIANT');
    });

    it('should throw ValidationError when organizationId missing for org product', async () => {
      const input = {
        scope: 'ORGANIZATION' as const,
        name: 'Org Product',
        sku: 'ORG-001',
        category: 'OTHER',
        // No merchantId or organizationId
      };

      await expect(ProductService.create(input)).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError for duplicate SKU', async () => {
      const input = {
        merchantId: TEST_MERCHANT_ID,
        name: 'Product 1',
        sku: 'DUP-SKU',
        category: 'FLOWER',
      };

      await ProductService.create(input);

      await expect(ProductService.create({
        ...input,
        name: 'Product 2',
      })).rejects.toThrow(ConflictError);
    });
  });

  describe('getById', () => {
    it('should get product by ID', async () => {
      const created = await ProductService.create({
        merchantId: TEST_MERCHANT_ID,
        name: 'Find Me',
        sku: 'FIND-001',
        category: 'FLOWER',
      });

      const product = await ProductService.getById(String(created._id));

      expect(product).toBeDefined();
      expect(product.name).toBe('Find Me');
    });

    it('should throw NotFoundError for non-existent ID', async () => {
      await expect(
        ProductService.getById('000000000000000000000000')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update product fields', async () => {
      const created = await ProductService.create({
        merchantId: TEST_MERCHANT_ID,
        name: 'Original Name',
        sku: 'UPD-001',
        category: 'FLOWER',
      });

      const updated = await ProductService.update(String(created._id), {
        name: 'Updated Name',
        description: 'New description',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('New description');
    });

    it('should throw NotFoundError when updating non-existent product', async () => {
      await expect(
        ProductService.update('000000000000000000000000', { name: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deactivate', () => {
    it('should soft delete (deactivate) a product', async () => {
      const created = await ProductService.create({
        merchantId: TEST_MERCHANT_ID,
        name: 'Delete Me',
        sku: 'DEL-001',
        category: 'FLOWER',
      });

      await ProductService.deactivate(String(created._id));

      // Product should still exist but be inactive
      const product = await ProductRepo.findById(String(created._id));
      expect(product).toBeDefined();
      expect(product?.isActive).toBe(false);
    });
  });

  describe('getAll', () => {
    beforeEach(async () => {
      // Create test products
      for (let i = 1; i <= 5; i++) {
        await ProductService.create({
          merchantId: TEST_MERCHANT_ID,
          organizationId: TEST_ORG_ID,
          name: `Product ${i}`,
          sku: `LIST-00${i}`,
          category: i <= 3 ? 'FLOWER' : 'EDIBLE',
        });
      }
    });

    it('should list products with pagination', async () => {
      const result = await ProductService.getAll({
        organizationId: TEST_ORG_ID,
        page: 1,
        limit: 3,
      });

      expect(result.data.length).toBe(3);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(2);
      expect(result.hasNextPage).toBe(true);
    });

    it('should filter by category', async () => {
      const result = await ProductService.getAll({
        organizationId: TEST_ORG_ID,
        category: 'FLOWER',
      });

      expect(result.data.length).toBe(3);
      result.data.forEach((p: { category: string }) => {
        expect(p.category).toBe('FLOWER');
      });
    });

    it('should search by name', async () => {
      const result = await ProductService.getAll({
        organizationId: TEST_ORG_ID,
        search: 'Product 1',
      });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
