import { test, expect } from '@playwright/test';
import { mockHub, signInAsProducer, FIXTURE_PHI_A } from './fixtures';

test.describe('Batch generation wizard (T-031)', () => {
  test.beforeEach(async ({ page }) => {
    await mockHub(page);
    await signInAsProducer(page);
  });

  test('past batches list reads from hub stub', async ({ page }) => {
    await page.goto(`/vi/projects/${FIXTURE_PHI_A}/batches`);
    await expect(page.getByText('Đã xác nhận')).toBeVisible();
  });

  test('wizard runs through count → review → done with download link + tx', async ({ page }) => {
    await page.goto(`/vi/projects/${FIXTURE_PHI_A}/batches/new`);
    // Step 2 — count input is preset to 10. Just advance.
    await page.getByLabel('Số lượng').fill('10');
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 3 — cost preview rendered, generate.
    await expect(page.getByText(/Lô 10 mã/)).toBeVisible();

    // Capture the auto-download via Playwright's download event.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Generate/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.zip');

    // Success card surfaces a "Re-download ZIP" link — its presence is
    // the canonical 'done' signal for the wizard.
    await expect(page.getByRole('link', { name: /Tải lại/ })).toBeVisible({ timeout: 30_000 });
  });
});
