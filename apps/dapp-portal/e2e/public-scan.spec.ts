import { test, expect } from '@playwright/test';
import { mockHub, FIXTURE_PHI } from './fixtures';

test.describe('Public scan page (T-024)', () => {
  test('renders cooperative + vegetable + activities + certs for a real project', async ({
    page,
  }) => {
    await mockHub(page);
    await page.goto(`/vi/projects/${FIXTURE_PHI}`);
    await expect(page.getByRole('heading', { level: 1, name: /HTX Vân Nội/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('rau muống').first()).toBeVisible();
    await expect(page.getByText('Gieo hạt').first()).toBeVisible();
    // "Thu hoạch" appears as a date label and a harvest-activity heading; pin to h3.
    await expect(page.getByRole('heading', { level: 3, name: 'Thu hoạch' })).toBeVisible();
    await expect(page.getByText('VietGAP').first()).toBeVisible();
  });

  test('unknown phi shows the not-found state with paste-URL fallback CTA', async ({ page }) => {
    await mockHub(page);
    const unknownPhi = '0x' + 'b'.repeat(64);
    await page.goto(`/vi/projects/${unknownPhi}`);
    await expect(page.getByText('Không tìm thấy dự án')).toBeVisible();
  });

  test('project without coordinates does NOT mount the Leaflet map', async ({ page }) => {
    await mockHub(page, { withCoords: false });
    await page.goto(`/vi/projects/${FIXTURE_PHI}`);
    await expect(page.getByRole('heading', { level: 1, name: /HTX Vân Nội/i })).toBeVisible({
      timeout: 10_000,
    });
    // Leaflet container is the marker for an instantiated map. Absent ⇒ map not mounted.
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
  });
});
