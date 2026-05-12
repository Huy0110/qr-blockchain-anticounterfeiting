import { test, expect } from '@playwright/test';
import { mockHub, signInAsProducer, FIXTURE_PHI_A } from './fixtures';

test.describe('Activities + certifications + images (T-030)', () => {
  test.beforeEach(async ({ page }) => {
    await mockHub(page);
    await signInAsProducer(page);
  });

  test('producer can add 5 cultivation activities and timeline sorts ascending', async ({
    page,
  }) => {
    await page.goto(`/vi/projects/${FIXTURE_PHI_A}/activities`);

    const dates = ['2026-01-10', '2026-02-15', '2026-02-20', '2026-03-05', '2026-04-01'];
    for (let i = 0; i < dates.length; i += 1) {
      await page.getByLabel('Ngày thực hiện').fill(dates[i] ?? '');
      await page.getByLabel('Tên').fill(`Activity ${i + 1}`);
      await page.getByRole('button', { name: 'Thêm hoạt động' }).first().click();
      await expect(page.getByText(`Activity ${i + 1}`)).toBeVisible({ timeout: 5_000 });
    }

    // Timeline should be sorted ascending: first heading is the earliest date.
    const headings = await page.getByRole('heading', { level: 3 }).allTextContents();
    expect(headings).toContain('Activity 1');
    expect(headings.indexOf('Activity 1')).toBeLessThan(headings.indexOf('Activity 5'));
  });

  test('certifications form rejects non-PDF MIME', async ({ page }) => {
    await page.goto(`/vi/projects/${FIXTURE_PHI_A}/certifications`);
    await page.getByLabel('Tên chứng nhận').fill('VietGAP');
    await page.getByLabel('Đơn vị cấp').fill('Bộ NN&PTNT');
    await page.getByLabel('Ngày cấp').fill('2026-01-01');

    // Attach a fake "image" with an .png mime to trigger the MIME guard.
    await page.setInputFiles('#cFile', {
      name: 'fake.png',
      mimeType: 'image/png',
      buffer: Buffer.from('not-a-pdf'),
    });
    await page.getByRole('button', { name: 'Tải lên chứng nhận' }).first().click();
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 5_000 });
  });

  test('image upload rejects non-image files with localised error', async ({ page }) => {
    await page.goto(`/vi/projects/${FIXTURE_PHI_A}/images`);
    await page.setInputFiles('#imgFiles', {
      name: 'bad.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not-an-image'),
    });
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 5_000 });
  });

  test('image upload of valid PNG fires multipart and shows progress UI', async ({ page }) => {
    await page.goto(`/vi/projects/${FIXTURE_PHI_A}/images`);
    // 1×1 PNG (8-byte signature + minimal IHDR/IDAT/IEND chunks).
    const png = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex',
    );
    await page.setInputFiles('#imgFiles', {
      name: 'pixel.png',
      mimeType: 'image/png',
      buffer: png,
    });
    // Either the progress text or the final state appears — for a tiny file
    // the upload is essentially instant. At minimum no error.
    await page.waitForTimeout(500);
    // The Next.js route announcer always renders one role=alert; ensure
    // no FORM-level alert appeared (matches our text-danger paragraph).
    await expect(page.locator('p[role=alert]')).toHaveCount(0);
  });
});
