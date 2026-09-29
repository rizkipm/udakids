/// <reference types="vitest/config" />
import { defineConfig, defaultClientConditions, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Satu .env di root repo untuk semua paket (hanya variabel VITE_* yang sampai ke browser).
  const env = loadEnv(mode, '../..', '');
  const api = `http://localhost:${env.API_PORT || 7177}`;
  // Web memanggil API di alamat yang SAMA (`/api`), diteruskan ke API lokal. Dengan begitu iPad/HP di
  // jaringan lokal cukup membuka http://<ip-laptop>:6006 — tanpa CORS dan tanpa "localhost" yang salah alamat.
  const proxy = {
    '/api': { target: api, changeOrigin: true, rewrite: (p: string) => p.replace(/^\/api/, '') },
  };
  const lan = {
    host: true, // dengarkan di semua antarmuka jaringan (0.0.0.0)
    port: 6006,
    strictPort: true,
    allowedHosts: ['.local', 'localhost'] as string[], // nama mDNS mis. macbook.local (IP selalu diizinkan)
    proxy,
  };
  return {
    plugins: [react()],
    envDir: '../..',
    // Pakai source TypeScript engine langsung (tanpa build) di dev & test.
    resolve: { conditions: ['source', ...defaultClientConditions] },
    server: lan,
    preview: lan,
    test: {
      environment: 'jsdom',
      include: ['test/**/*.test.{ts,tsx}'],
      setupFiles: ['test/setup.ts'],
      // Test memakai URL API absolut (fetch di Node butuh URL lengkap; mock mencocokkan path).
      env: { VITE_API_URL: 'http://localhost:7177' },
    },
  };
});
