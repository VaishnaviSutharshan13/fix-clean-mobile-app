import { defineConfig } from 'vitest/config';

// Unit tests for pure TypeScript logic (no React Native runtime).
export default defineConfig({
  test: {
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['node_modules/**'],
    environment: 'node',
  },
});
