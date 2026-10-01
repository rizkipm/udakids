import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC memancarkan decorator metadata yang dibutuhkan DI NestJS (esbuild tidak).
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source'] } },
  test: {
    include: ['test/**/*.test.ts'],
    // Test e2e memanggil login/daftar berkali-kali dari satu IP; batas per IP dilonggarkan.
    env: { RATE_LIMIT_SCALE: '20' },
  },
});
