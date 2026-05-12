import { test, expect } from '@playwright/test';
import { mockHub, FIXTURE_PHI } from './fixtures';

/**
 * T-027 final E2E: exercise all three main routes (landing/scanner,
 * public-scan, private-scan) plus the locale toggle and the offline
 * fallback. This is the "full smoke" suite — the per-feature specs
 * (public-scan.spec.ts, private-scan.spec.ts) own the deeper assertions.
 */

const VALID_SID = '0x' + 'b'.repeat(40);

test.describe('Full dApp smoke (T-027)', () => {
  test('landing → scanner → about: all three routes render in vi', async ({ page }) => {
    await page.goto('/vi/');
    await expect(page.locator('h1')).toContainText(/quét|qr/i);

    await page.goto('/vi/scanner/');
    await expect(page.locator('h1')).toBeVisible();

    await page.goto('/vi/about/');
    // About page uses Card/h3 heading; assert by text content + DOI label.
    await expect(page.getByText(/DOI/i).first()).toBeVisible();
  });

  test('locale switch: vi ↔ en preserves the route', async ({ page }) => {
    await page.goto('/vi/about/');
    await expect(page).toHaveURL(/\/vi\/about/);
    await expect(page.getByText(/Mã nguồn|nguồn mở/i).first()).toBeVisible();

    await page.goto('/en/about/');
    await expect(page).toHaveURL(/\/en\/about/);
    await expect(page.getByText(/Source code|open-source/i).first()).toBeVisible();
  });

  test('public scan flow: project renders cooperative + crop', async ({ page }) => {
    await mockHub(page);
    await page.goto(`/vi/projects/${FIXTURE_PHI}/`);
    // Scope to the page header h1 (avoids collision with Leaflet popup text).
    await expect(page.getByRole('heading', { level: 1, name: /HTX Vân Nội/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('rau muống').first()).toBeVisible();
  });

  test('private scan flow: AUTHENTIC outcome surfaces in vi', async ({ page }) => {
    await page.route('**/api/v1/scan/private', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          status: 'AUTHENTIC',
          txHash: '0x' + 'd'.repeat(64),
          eventArgs: {
            phi: FIXTURE_PHI,
            h: '0x' + 'e'.repeat(64),
            producer: '0x' + '1'.repeat(40),
            timestamp: 1_700_000_000,
          },
          verifiedAt: '2026-04-01T00:00:00.000Z',
        },
      });
    });
    await page.goto(`/vi/scan/${FIXTURE_PHI}/${VALID_SID}/`);
    // Use first() to disambiguate badge vs heading both showing "HÀNG THẬT".
    await expect(page.getByText('HÀNG THẬT', { exact: false }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('hub offline → "Cannot connect" + retry button (no white screen)', async ({ page }) => {
    // Simulate the hub being unreachable: every request fails at the network layer.
    await page.route('**/api/v1/scan/public/**', (route) => route.abort('failed'));

    await page.goto(`/vi/projects/${FIXTURE_PHI}/`);

    // VI copy from messages/vi.json#errors.network ("Không kết nối được máy chủ").
    await expect(page.getByText(/không kết nối|Cannot reach/i)).toBeVisible({
      timeout: 10_000,
    });
    // Retry button must be present and clickable (no white screen).
    const retry = page.getByRole('button', { name: /thử lại|retry/i });
    await expect(retry).toBeVisible();
    await expect(retry).toBeEnabled();
  });

  test('private scan offline → "Cannot connect" + retry', async ({ page }) => {
    await page.route('**/api/v1/scan/private', (route) => route.abort('failed'));

    await page.goto(`/en/scan/${FIXTURE_PHI}/${VALID_SID}/`);
    await expect(page.getByText(/Cannot reach|Không kết nối/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('button', { name: /retry|thử lại/i })).toBeVisible();
  });
});
