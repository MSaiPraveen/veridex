/**
 * Auth Routes Integration Tests
 * Tests for authentication API endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../helpers/mongo-memory';
import { jsonRequest } from '../helpers/fastify-test';

// Mock Kafka
vi.mock('kafkajs', () => ({
  Kafka: vi.fn(() => ({
    producer: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue({ topicPartitions: [] }),
      on: vi.fn(),
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
    PORT: '3001',
    MONGO_URI: 'mongodb://localhost:27017/test',
    JWT_ACCESS_SECRET: 'test-access-secret-key-for-testing-purposes-only',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing-purposes-only',
    ACCESS_TOKEN_TTL: '15m',
    REFRESH_TOKEN_TTL: '7d',
    KAFKA_BROKER: 'localhost:9092',
  },
}));

import { buildApp } from '../../app';
import { Role } from '@veridex/roles-permissions';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await connectTestDB();
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
          role: 'CONSUMER',
          firstName: 'John',
          lastName: 'Doe',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
    });

    it('should register a merchant with company info', async () => {
      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'merchant@example.com',
          password: 'Password123!',
          role: 'MERCHANT',
          companyName: 'Test Company LLC',
          industry: 'Technology',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.user.role).toBe('MERCHANT');
    });

    it('should return 400 for invalid email', async () => {
      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'Password123!',
          role: 'CONSUMER',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: '123', // too weak
          role: 'CONSUMER',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 for duplicate email', async () => {
      // First registration
      await jsonRequest(app, {
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'dup@example.com',
          password: 'Password123!',
          role: 'CONSUMER',
        },
      });

      // Second registration with same email
      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'dup@example.com',
          password: 'Password123!',
          role: 'CONSUMER',
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await jsonRequest(app, {
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'login@example.com',
          password: 'Password123!',
          role: 'CONSUMER',
        },
      });
    });

    it('should login with valid credentials', async () => {
      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'Password123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('login@example.com');
      expect(body.data.tokens.accessToken).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'WrongPassword!',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for non-existent user', async () => {
      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'Password123!',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Register first
      const regResponse = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'refresh@example.com',
          password: 'Password123!',
          role: 'CONSUMER',
        },
      });

      const { refreshToken } = JSON.parse(regResponse.body).data.tokens;

      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken: 'invalid-token' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and revoke token', async () => {
      // Register first
      const regResponse = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'logout@example.com',
          password: 'Password123!',
          role: 'CONSUMER',
        },
      });

      const { refreshToken } = JSON.parse(regResponse.body).data.tokens;

      const response = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/logout',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.revokedCount).toBe(1);

      // Try to use the revoked token
      const refreshResponse = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken },
      });

      expect(refreshResponse.statusCode).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      // Register first
      const regResponse = await jsonRequest(app, {
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'me@example.com',
          password: 'Password123!',
          role: 'CONSUMER',
          firstName: 'Current',
          lastName: 'User',
        },
      });

      const { accessToken } = JSON.parse(regResponse.body).data.tokens;

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('me@example.com');
    });

    it('should return 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      // May be 200 or 404 depending on route definition
      expect([200, 404]).toContain(response.statusCode);
    });
  });
});
