import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.{ts,tsx}'],
    globals: true,
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Vitest-only scope: pure-logic libs that have unit tests. The
      // UI layer (components/, app/) is covered by Playwright; we
      // don't try to combine the two coverage sources here (would
      // need istanbul-instrumented builds — Phase 12 polish).
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/i18n.ts', 'src/lib/utils.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
