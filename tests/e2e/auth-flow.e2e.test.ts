/**
 * E2E Test: User Registration and Authentication Flow
 * 
 * Tests the complete flow:
 * 1. User registers
 * 2. User logs in
 * 3. User accesses protected resource
 * 4. Token refresh works
 * 5. User logs out
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../helpers/mongo-memory';

// Mock Kafka for E2E tests (in real E2E, use actual Kafka)
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
vi.mock('../../apps/auth-service/src/config/env', () => ({
  env: {
    PORT: '3001',
    MONGO_URI: 'mongodb://localhost:27017/test',
    JWT_ACCESS_SECRET: 'e2e-test-access-secret-key-for-testing-purposes-only',
    JWT_REFRESH_SECRET: 'e2e-test-refresh-secret-key-for-testing-purposes-only',
    ACCESS_TOKEN_TTL: '15m',
    REFRESH_TOKEN_TTL: '7d',
    KAFKA_BROKER: 'localhost:9092',
  },
}));

describe('E2E: User Authentication Flow', () => {
  let authApp: FastifyInstance;
  
  beforeAll(async () => {
    await connectTestDB();
    
    // Dynamically import after mocking
    const { buildApp } = await import('../../apps/auth-service/src/app');
    authApp = buildApp();
    await authApp.ready();
  });

  afterAll(async () => {
    await authApp?.close();
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('Complete User Journey', () => {
    const testUser = {
      email: 'e2e-user@example.com',
      password: 'SecurePassword123!',
      role: 'CONSUMER',
      firstName: 'E2E',
      lastName: 'User',
    };

    it('should complete full auth flow: register → login → access → refresh → logout', async () => {
      // Step 1: Register
      const registerResponse = await authApp.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify(testUser),
      });

      expect(registerResponse.statusCode).toBe(201);
      const registerBody = JSON.parse(registerResponse.body);
      expect(registerBody.success).toBe(true);
      expect(registerBody.data.user.email).toBe(testUser.email);
      
      const { accessToken: regAccessToken, refreshToken: regRefreshToken } = registerBody.data.tokens;
      expect(regAccessToken).toBeDefined();
      expect(regRefreshToken).toBeDefined();

      // Step 2: Login with same credentials
      const loginResponse = await authApp.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      expect(loginResponse.statusCode).toBe(200);
      const loginBody = JSON.parse(loginResponse.body);
      expect(loginBody.success).toBe(true);
      
      const { accessToken, refreshToken } = loginBody.data.tokens;

      // Step 3: Access protected resource
      const meResponse = await authApp.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meResponse.statusCode).toBe(200);
      const meBody = JSON.parse(meResponse.body);
      expect(meBody.data.user.email).toBe(testUser.email);
      expect(meBody.data.user.firstName).toBe(testUser.firstName);

      // Step 4: Refresh tokens
      const refreshResponse = await authApp.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ refreshToken }),
      });

      expect(refreshResponse.statusCode).toBe(200);
      const refreshBody = JSON.parse(refreshResponse.body);
      const newAccessToken = refreshBody.data.tokens.accessToken;
      const newRefreshToken = refreshBody.data.tokens.refreshToken;
      
      // New tokens should be different (token rotation)
      expect(newAccessToken).toBeDefined();
      expect(newRefreshToken).toBeDefined();

      // Step 5: Access with new token should work
      const meResponse2 = await authApp.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${newAccessToken}`,
        },
      });

      expect(meResponse2.statusCode).toBe(200);

      // Step 6: Old refresh token should be revoked (token rotation)
      const oldRefreshResponse = await authApp.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ refreshToken }), // old token
      });

      expect(oldRefreshResponse.statusCode).toBe(401);

      // Step 7: Logout
      const logoutResponse = await authApp.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { 
          'content-type': 'application/json',
          authorization: `Bearer ${newAccessToken}`,
        },
        payload: JSON.stringify({ refreshToken: newRefreshToken }),
      });

      expect(logoutResponse.statusCode).toBe(200);
      const logoutBody = JSON.parse(logoutResponse.body);
      expect(logoutBody.data.revokedCount).toBe(1);

      // Step 8: Refresh with revoked token should fail
      const postLogoutRefresh = await authApp.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ refreshToken: newRefreshToken }),
      });

      expect(postLogoutRefresh.statusCode).toBe(401);
    });

    it('should handle merchant registration with organization creation', async () => {
      const merchantData = {
        email: 'merchant@company.com',
        password: 'SecurePassword123!',
        role: 'MERCHANT',
        companyName: 'Test Company LLC',
        industry: 'Technology',
      };

      const response = await authApp.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify(merchantData),
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.user.role).toBe('MERCHANT');
      expect(body.data.user.companyName).toBe(merchantData.companyName);
    });

    it('should lock account after multiple failed login attempts', async () => {
      // Register user first
      await authApp.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify(testUser),
      });

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        const response = await authApp.inject({
          method: 'POST',
          url: '/auth/login',
          headers: { 'content-type': 'application/json' },
          payload: JSON.stringify({
            email: testUser.email,
            password: 'WrongPassword!',
          }),
        });
        expect(response.statusCode).toBe(401);
      }

      // 6th attempt with correct password should fail (account locked)
      const lockedResponse = await authApp.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      expect(lockedResponse.statusCode).toBe(423); // Account locked
    });

    it('should reject access without token', async () => {
      const response = await authApp.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject access with invalid token', async () => {
      const response = await authApp.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
