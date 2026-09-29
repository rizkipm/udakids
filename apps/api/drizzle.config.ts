import { defineConfig } from 'drizzle-kit';
import './src/common/env.js';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ?? 'postgres://littlecoder:littlecoder@localhost:5432/littlecoder',
  },
});
