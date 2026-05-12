import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001/vi/login',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
    env: {
      NEXTAUTH_SECRET: 'e2e-test-secret-do-not-use-in-prod-AAAAAAAAAAAAAAAAAA',
      NEXTAUTH_URL: 'http://localhost:3001',
      NEXT_PUBLIC_HUB_BASE_URL: 'http://localhost:3000/api/v1',
      // Authorise any credentials in tests — see src/lib/auth.ts.
      MGMT_PORTAL_E2E_BYPASS: '1',
    },
  },
});
