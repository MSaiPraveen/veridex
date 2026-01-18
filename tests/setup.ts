/**
 * Test Setup - Global configuration for all tests
 * This file is loaded before each test file
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Mock console to reduce noise during tests (optional - uncomment if needed)
// vi.spyOn(console, 'log').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});

// Global setup
beforeAll(() => {
  // Any global setup
});

// Global teardown
afterAll(() => {
  // Any global cleanup
});
