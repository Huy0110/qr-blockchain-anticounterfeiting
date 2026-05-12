import { Module, Global } from '@nestjs/common';
import { loadEnv, type Env } from './env.schema';

export const ENV_TOKEN = Symbol('Env');

/**
 * Global ConfigModule providing the validated Env via DI.
 *
 * We deliberately don't use @nestjs/config: its Joi-based validate()
 * returns the merged object but doesn't preserve Zod's typed inference,
 * so DI consumers would lose autocompletion. Plain provider with a
 * symbol token keeps the Env type tight and the module trivial.
 */
@Global()
@Module({
  providers: [
    {
      provide: ENV_TOKEN,
      useFactory: (): Env => loadEnv(),
    },
  ],
  exports: [ENV_TOKEN],
})
export class ConfigModule {}
