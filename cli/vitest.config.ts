import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 10_000,
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
});
