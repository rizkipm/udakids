import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/types.ts'],
      // PRD A16 (M1): coverage engine >= 90%.
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
