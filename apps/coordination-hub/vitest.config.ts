import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * SWC plugin emits the TS decorator metadata that NestJS's DI relies on.
 * Vitest's default esbuild transformer drops it, leaving constructor
 * injection broken (controllers see `undefined` services). Without this
 * plugin, the auth integration tests fail with
 * "Cannot read properties of undefined".
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true, dynamicImport: true },
        transform: { decoratorMetadata: true, legacyDecorator: true },
        target: 'es2022',
        keepClassNames: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'test/**/*.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.module.ts', 'src/main.ts', '**/*.dto.ts'],
    },
  },
});
