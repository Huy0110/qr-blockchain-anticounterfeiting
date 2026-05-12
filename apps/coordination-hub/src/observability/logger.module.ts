import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { loadEnv } from '../config/env.schema';

/**
 * Pino logger module. Each request gets a child logger bound to the
 * request id (set by RequestIdInterceptor) so logs across the request
 * lifecycle correlate.
 *
 * In dev we pretty-print via pino-pretty for readability; in test/prod
 * we emit one-line JSON for ingestion (Loki, Elastic, Datadog).
 */
const env = loadEnv();

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        ...(env.NODE_ENV === 'development'
          ? {
              transport: {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'HH:MM:ss.l' },
              },
            }
          : {}),
        customProps: (req) => ({
          requestId: req.headers['x-request-id'] ?? 'unknown',
        }),
        autoLogging: env.NODE_ENV !== 'test',
        serializers: {
          req: (req: { method?: string; url?: string }) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class HubLoggerModule {}
