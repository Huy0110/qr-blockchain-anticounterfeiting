import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';

/**
 * Test harness that boots the full hub against an in-memory MongoDB.
 *
 * Mirrors main.ts wiring (helmet, prefix, versioning) sans port listening.
 * Returns the app + mongo instance; caller is responsible for `app.close()`
 * and `mongo.stop()` in afterAll.
 */
export async function createTestApp(envOverrides: Record<string, string> = {}): Promise<{
  app: INestApplication;
  mongo: MongoMemoryServer;
}> {
  const mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();

  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGO_URI: mongoUri,
    JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long-aaaaa',
    REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters-long-aaaaa',
    WALLET_ENCRYPTION_KEK: Buffer.alloc(32, 1).toString('base64'),
    ...envOverrides,
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(helmet());
  await app.init();

  return { app, mongo };
}

export async function teardownTestApp(handle: {
  app: INestApplication;
  mongo: MongoMemoryServer;
}): Promise<void> {
  await handle.app.close();
  await handle.mongo.stop();
}
