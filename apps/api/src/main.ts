import './common/env.js'; // .env root repo dimuat paling awal
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { setIndonesianValidationMessages } from '@little-coder/engine';
import { AppModule } from './app.module.js';
import { configureApp } from './common/app-setup.js';

async function bootstrap() {
  setIndonesianValidationMessages();
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
  // CORS hanya untuk web di domain lain; web lewat `/api` (proxy) adalah same-origin.
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:6006')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins });
  app.enableShutdownHooks();
  const port = Number(process.env.API_PORT ?? 7177);
  await app.listen(port);
  console.log(`API berjalan di http://localhost:${port}`);
}

void bootstrap();
