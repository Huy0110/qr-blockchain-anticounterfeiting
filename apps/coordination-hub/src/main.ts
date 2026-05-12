import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { loadEnv, EnvValidationError } from './config/env.schema';

async function bootstrap(): Promise<void> {
  let env;
  try {
    env = loadEnv();
  } catch (err) {
    if (err instanceof EnvValidationError) {
      // Crash before NestJS starts so operators see the issue immediately.
      // eslint-disable-next-line no-console
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.use(helmet());
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });

  // DTO validation runs per-controller via ZodValidationPipe (see
  // src/common/pipes/zod-validation.pipe.ts) — Zod schemas live in
  // @qr-bc/shared, so we deliberately don't wire NestJS's class-validator
  // ValidationPipe here.

  if (env.EXPOSE_SWAGGER) {
    const cfg = new DocumentBuilder()
      .setTitle('qr-blockchain-anticounterfeiting Coordination Hub API')
      .setDescription('Hub API for the dual-QR anti-counterfeiting system.')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, cfg);
    SwaggerModule.setup('api/docs', app, doc, { jsonDocumentUrl: 'api/docs-json' });
  }

  await app.listen(env.PORT);
  Logger.log(`Coordination Hub listening on :${env.PORT}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
