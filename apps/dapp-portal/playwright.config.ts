import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8765',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-iphone-se', use: { ...devices['iPhone SE'] } },
    { name: 'mobile-pixel-5', use: { ...devices['Pixel 5'] } },
  ],
  // Serve the real static export — `next dev` is incompatible with
  // `output: 'export'` once dynamic routes use generateStaticParams,
  // so we ship the same artifact that gets pinned to IPFS.
  webServer: {
    command: 'pnpm build && node test/serve-static.cjs out 8765',
    url: 'http://localhost:8765/vi/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
