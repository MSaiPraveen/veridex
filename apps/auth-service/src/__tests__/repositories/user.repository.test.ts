/**
 * User Repository Unit Tests
 * Tests for user data access layer
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../helpers/mongo-memory';

// Mock environment
vi.mock('../../config/env', () => ({
  env: {
    PORT: '3001',
    MONGO_URI: 'mongodb://localhost:27017/test',
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    ACCESS_TOKEN_TTL: '15m',
    REFRESH_TOKEN_TTL: '7d',
    KAFKA_BROKER: 'localhost:9092',
  },
}));

import { UserRepo } from '../../repositories/user.repository';
import { UserModel } from '../../domain/user.entity';
import { Role } from '@veridex/roles-permissions';

describe('UserRepo', () => {
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
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword123',
        role: Role.CONSUMER,
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await UserRepo.create(userData);

      expect(user).toBeDefined();
      expect(user._id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe(Role.CONSUMER);
      expect(user.isActive).toBe(true);
      expect(user.failedLoginAttempts).toBe(0);
    });

    it('should lowercase email on create', async () => {
      const user = await UserRepo.create({
        email: 'TEST@EXAMPLE.COM',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should reject duplicate emails', async () => {
      await UserRepo.create({
        email: 'dup@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      await expect(
        UserRepo.create({
          email: 'dup@example.com',
          passwordHash: 'hash2',
          role: Role.CONSUMER,
        })
      ).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      await UserRepo.create({
        email: 'find@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      const user = await UserRepo.findByEmail('find@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('find@example.com');
    });

    it('should find user with uppercase email query', async () => {
      await UserRepo.create({
        email: 'find@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      const user = await UserRepo.findByEmail('FIND@EXAMPLE.COM');

      expect(user).toBeDefined();
      expect(user?.email).toBe('find@example.com');
    });

    it('should return null for non-existent email', async () => {
      const user = await UserRepo.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const created = await UserRepo.create({
        email: 'findid@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      const user = await UserRepo.findById(String(created._id));

      expect(user).toBeDefined();
      expect(user?.email).toBe('findid@example.com');
    });

    it('should return null for non-existent id', async () => {
      const user = await UserRepo.findById('000000000000000000000000');

      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const created = await UserRepo.create({
        email: 'update@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      const updated = await UserRepo.update(String(created._id), {
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(updated?.firstName).toBe('Updated');
      expect(updated?.lastName).toBe('Name');
    });
  });

  describe('updateLoginSuccess', () => {
    it('should reset failed attempts and update lastLoginAt', async () => {
      const created = await UserRepo.create({
        email: 'loginsuccess@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      // Simulate failed attempts
      await UserModel.findByIdAndUpdate(created._id, {
        failedLoginAttempts: 3,
      });

      const updated = await UserRepo.updateLoginSuccess(String(created._id));

      expect(updated?.failedLoginAttempts).toBe(0);
      expect(updated?.lastLoginAt).toBeDefined();
      expect(updated?.lockoutUntil).toBeNull();
    });
  });

  describe('incrementFailedAttempts', () => {
    it('should increment failed login attempts', async () => {
      const created = await UserRepo.create({
        email: 'failed@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      await UserRepo.incrementFailedAttempts(String(created._id));
      let user = await UserRepo.findById(String(created._id));
      expect(user?.failedLoginAttempts).toBe(1);

      await UserRepo.incrementFailedAttempts(String(created._id));
      user = await UserRepo.findById(String(created._id));
      expect(user?.failedLoginAttempts).toBe(2);
    });

    it('should lock account after 5 failed attempts', async () => {
      const created = await UserRepo.create({
        email: 'lockout@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await UserRepo.incrementFailedAttempts(String(created._id));
      }

      const user = await UserRepo.findById(String(created._id));
      expect(user?.failedLoginAttempts).toBe(5);
      expect(user?.lockoutUntil).toBeDefined();
      expect(user?.lockoutUntil?.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('existsByEmail', () => {
    it('should return true for existing email', async () => {
      await UserRepo.create({
        email: 'exists@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      const exists = await UserRepo.existsByEmail('exists@example.com');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await UserRepo.existsByEmail('notexists@example.com');

      expect(exists).toBe(false);
    });
  });

  describe('setActive', () => {
    it('should deactivate user', async () => {
      const created = await UserRepo.create({
        email: 'active@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      const deactivated = await UserRepo.setActive(String(created._id), false);

      expect(deactivated?.isActive).toBe(false);
    });

    it('should reactivate user', async () => {
      const created = await UserRepo.create({
        email: 'inactive@example.com',
        passwordHash: 'hash',
        role: Role.CONSUMER,
      });

      await UserRepo.setActive(String(created._id), false);
      const reactivated = await UserRepo.setActive(String(created._id), true);

      expect(reactivated?.isActive).toBe(true);
    });
  });
});
