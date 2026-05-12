import { test, expect } from '@playwright/test';
import { mockHub, signInAsProducer, FIXTURE_PHI_A } from './fixtures';

test.describe('Verification analytics (T-032)', () => {
  test.beforeEach(async ({ page }) => {
    await mockHub(page);
    await signInAsProducer(page);
  });

  test('renders totals + charts + recent table from stats endpoint', async ({ page }) => {
    await page.goto(`/vi/projects/${FIXTURE_PHI_A}/verifications`);

    // Totals card values reflect the seeded mock (8 / 1 / 1).
    await expect(page.locator('span.text-success.text-3xl')).toHaveText('8', { timeout: 10_000 });
    // Recent table renders at least one row with a Polygonscan-linked tx.
    await expect(page.locator('a[href*="/tx/0x"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('charts mount via dynamic-import (canvas elements present)', async ({ page }) => {
    await page.goto(`/vi/projects/${FIXTURE_PHI_A}/verifications`);
    // Daily line + outcome donut → 2 canvas elements once dynamic chunks land.
    await expect(page.locator('canvas')).toHaveCount(2, { timeout: 10_000 });
  });
});
