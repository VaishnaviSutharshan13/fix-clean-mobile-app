import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

// Shared by main.ts and the e2e tests so both run with the same configuration.
export function setupApp(app: INestApplication): void {
  app.enableCors();
  // Profile photos are uploaded as base64 JSON (up to 512 KB of image data).
  (app as NestExpressApplication).useBodyParser('json', { limit: '1mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
