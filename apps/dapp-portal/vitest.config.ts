import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Vitest-only unit tests live under `test/**`. Playwright E2E
    // specs under `e2e/**/*.spec.ts` are intentionally excluded so
    // Vitest doesn't try to interpret Playwright's `test.describe()`
    // (different runtime). Run them via `pnpm test:e2e` instead.
    include: ['test/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**', 'out/**'],
    // No unit tests today — the dApp is exercised end-to-end via
    // Playwright. `passWithNoTests` keeps the apps-ci matrix green
    // when this surface is empty; once unit tests land under
    // `test/`, remove this flag.
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
