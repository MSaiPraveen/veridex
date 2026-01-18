import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * E2E Test Configuration
 * For testing complete user flows across services
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // E2E tests need longer timeouts
    testTimeout: 60000,
    hookTimeout: 60000,
    // Run E2E tests sequentially
    sequence: {
      shuffle: false,
    },
    // Retry flaky tests
    retry: 1,
  },
  resolve: {
    alias: {
      '@veridex/roles-permissions': path.resolve(__dirname, './packages/roles-permissions/src/index.ts'),
      '@veridex/event-contracts': path.resolve(__dirname, './packages/event-contracts/src/index.ts'),
      '@veridex/api-contracts': path.resolve(__dirname, './packages/api-contracts/src/index.ts'),
      '@veridex/schemas': path.resolve(__dirname, './packages/schemas/src/index.ts'),
    },
  },
});
