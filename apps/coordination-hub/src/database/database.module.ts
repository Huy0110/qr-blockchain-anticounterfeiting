import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

/**
 * Mongo connection bootstrap. Pulls MONGO_URI from the validated Env.
 * Marked global so feature modules can register schemas via
 * `MongooseModule.forFeature(...)` without re-importing this provider.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ENV_TOKEN],
      useFactory: (env: Env) => ({
        uri: env.MONGO_URI,
        autoIndex: env.NODE_ENV !== 'production',
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
