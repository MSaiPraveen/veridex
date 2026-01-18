/**
 * Fastify Test Helper
 * Utilities for testing Fastify applications
 */

import { FastifyInstance } from 'fastify';
import { InjectOptions, Response } from 'light-my-request';

// Re-export Response type for convenience
export type { Response };

/**
 * Make an authenticated request to a Fastify app
 */
export async function authenticatedRequest(
  app: FastifyInstance,
  opts: InjectOptions,
  token: string
): Promise<Response> {
  return app.inject({
    ...opts,
    headers: {
      ...opts.headers,
      authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Make a JSON request to a Fastify app
 */
export async function jsonRequest(
  app: FastifyInstance,
  opts: Omit<InjectOptions, 'headers'> & { 
    headers?: Record<string, string>;
    payload?: unknown;
  }
): Promise<Response> {
  return app.inject({
    ...opts,
    headers: {
      ...opts.headers,
      'content-type': 'application/json',
    },
    payload: opts.payload ? JSON.stringify(opts.payload) : undefined,
  });
}

/**
 * Create test user data
 */
export function createTestUser(overrides = {}) {
  return {
    email: `test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    role: 'CONSUMER',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  };
}

/**
 * Create test merchant data
 */
export function createTestMerchant(overrides = {}) {
  return {
    email: `merchant-${Date.now()}@example.com`,
    password: 'Test123!@#',
    role: 'MERCHANT',
    companyName: 'Test Company LLC',
    industry: 'Technology',
    firstName: 'Merchant',
    lastName: 'User',
    ...overrides,
  };
}
