import './common/env.js'; // .env root repo dimuat paling awal
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { setIndonesianValidationMessages } from '@little-coder/engine';
import { AppModule } from './app.module.js';

async function bootstrap() {
  setIndonesianValidationMessages();
  const app = await NestFactory.create(AppModule);
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
