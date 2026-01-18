/**
 * Auth Service Unit Tests
 * Tests for authentication service functions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../helpers/mongo-memory';
import { Role } from '@veridex/roles-permissions';

// Mock Kafka before importing auth service
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

// Mock environment before imports
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

// Import after mocks
import { register, login, logout, getCurrentUser } from '../../services/auth.service';
import { UserRepo } from '../../repositories/user.repository';
import { UserModel } from '../../domain/user.entity';
import { 
  InvalidCredentialsError, 
  UserExistsError,
  AccountLockedError,
  AccountDisabledError,
} from '../../errors/auth.errors';
import * as bcrypt from 'bcrypt';

describe('Auth Service', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const input = {
        email: 'test@example.com',
        password: 'Password123!',
        role: Role.CONSUMER,
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await register(input);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(input.email.toLowerCase());
      expect(result.user.role).toBe(Role.CONSUMER);
      expect(result.user.firstName).toBe('John');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should register a merchant with company info', async () => {
      const input = {
        email: 'merchant@example.com',
        password: 'Password123!',
        role: Role.MERCHANT,
        companyName: 'Test Company LLC',
        industry: 'Technology',
      };

      const result = await register(input);

      expect(result.user.email).toBe(input.email.toLowerCase());
      expect(result.user.role).toBe(Role.MERCHANT);
      expect(result.user.companyName).toBe(input.companyName);
    });

    it('should throw UserExistsError for duplicate email', async () => {
      const input = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        role: Role.CONSUMER,
      };

      await register(input);

      await expect(register(input)).rejects.toThrow(UserExistsError);
    });

    it('should lowercase the email', async () => {
      const input = {
        email: 'TeSt@EXAMPLE.com',
        password: 'Password123!',
        role: Role.CONSUMER,
      };

      const result = await register(input);

      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('login', () => {
    let testEmail: string;
    const password = 'Password123!';

    beforeEach(async () => {
      // Use unique email per test to avoid token collisions
      testEmail = `login-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      await register({
        email: testEmail,
        password,
        role: Role.CONSUMER,
        firstName: 'Test',
      });
    });

    it('should login with valid credentials', async () => {
      const result = await login({
        email: testEmail,
        password,
      });

      expect(result.user.email).toBe(testEmail);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw InvalidCredentialsError for wrong password', async () => {
      await expect(
        login({
          email: testEmail,
          password: 'WrongPassword123!',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError for non-existent user', async () => {
      await expect(
        login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should lock account after 5 failed attempts', async () => {
      // Fail 5 times
      for (let i = 0; i < 5; i++) {
        await expect(
          login({ email: testEmail, password: 'wrong' })
        ).rejects.toThrow(InvalidCredentialsError);
      }

      // 6th attempt should throw AccountLockedError
      await expect(
        login({ email: testEmail, password })
      ).rejects.toThrow(AccountLockedError);
    });

    it('should throw AccountDisabledError for inactive user', async () => {
      // Deactivate user
      const user = await UserModel.findOne({ email: testEmail });
      await UserRepo.setActive(String(user?._id), false);

      await expect(
        login({ email: testEmail, password })
      ).rejects.toThrow(AccountDisabledError);
    });
  });

  describe('logout', () => {
    it('should revoke a single refresh token', async () => {
      const uniqueEmail = `logout-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      const { tokens } = await register({
        email: uniqueEmail,
        password: 'Password123!',
        role: Role.CONSUMER,
      });

      const result = await logout({ refreshToken: tokens.refreshToken, allDevices: false });

      expect(result.revokedCount).toBe(1);
    });

    it('should revoke all tokens for a user', async () => {
      const uniqueEmail = `logoutall-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      const { user, tokens } = await register({
        email: uniqueEmail,
        password: 'Password123!',
        role: Role.CONSUMER,
      });

      // Login again to create another token
      await login({
        email: uniqueEmail,
        password: 'Password123!',
      });

      const result = await logout(
        { refreshToken: tokens.refreshToken, allDevices: true },
        user.id
      );

      expect(result.revokedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getCurrentUser', () => {
    it('should return user by id', async () => {
      const uniqueEmail = `getuser-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      const { user } = await register({
        email: uniqueEmail,
        password: 'Password123!',
        role: Role.CONSUMER,
        firstName: 'Get',
        lastName: 'User',
      });

      const result = await getCurrentUser(user.id);

      expect(result).toBeDefined();
      expect(result?.email).toBe(uniqueEmail);
    });

    it('should return null for non-existent user', async () => {
      const result = await getCurrentUser('000000000000000000000000');

      expect(result).toBeNull();
    });
  });
});
