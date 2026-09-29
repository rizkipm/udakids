import { defineConfig } from 'vitest/config';

// Test untuk scripts/ (root). Paket punya vitest.config sendiri.
export default defineConfig({
  test: { include: ['scripts/**/*.test.ts'], testTimeout: 30_000 },
});
