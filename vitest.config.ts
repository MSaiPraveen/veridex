import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/vitest.config.ts',
      ],
    },
    // Timeout for async tests
    testTimeout: 30000,
    // Hook timeout
    hookTimeout: 30000,
    // Retry failed tests
    retry: 0,
    // Run tests in sequence by default (for DB tests)
    sequence: {
      shuffle: false,
    },
  },
  resolve: {
    alias: {
      '@veridex/roles-permissions': path.resolve(__dirname, './packages/roles-permissions/src/index.ts'),
      '@veridex/event-contracts': path.resolve(__dirname, './packages/event-contracts/src/index.ts'),
      '@veridex/api-contracts': path.resolve(__dirname, './packages/api-contracts/src/index.ts'),
      '@veridex/schemas': path.resolve(__dirname, './packages/schemas/src/index.ts'),
      '@veridex/compliance-rules': path.resolve(__dirname, './packages/compliance-rules/src/index.ts'),
      '@test-helpers': path.resolve(__dirname, './tests/helpers'),
    },
  },
});
