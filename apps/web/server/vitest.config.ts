import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Resolve @novel/core to its TS source so tests run without pre-building core
// (Vite resolves the `.js` specifiers to the sibling `.ts` files).
const coreSrc = fileURLToPath(new URL('../../../packages/core/src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@novel/core': coreSrc,
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 10_000,
  },
});
