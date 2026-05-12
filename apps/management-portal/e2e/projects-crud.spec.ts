import { test, expect } from '@playwright/test';
import { mockHub, signInAsProducer, FIXTURE_PHI_A } from './fixtures';

test.describe('Project CRUD (T-029)', () => {
  test.beforeEach(async ({ page }) => {
    await mockHub(page);
    await signInAsProducer(page);
  });

  test('list shows seeded project + status badge', async ({ page }) => {
    await page.goto('/vi/projects');
    await expect(page.getByText('HTX E2E Vân Nội')).toBeVisible();
    await expect(page.getByText('Đang thu hoạch')).toBeVisible();
  });

  test('create new project end-to-end and land on detail page', async ({ page }) => {
    await page.goto('/vi/projects/new');
    await page.getByLabel(/Tên hợp tác xã/).fill('HTX New');
    await page.getByLabel(/Loại nông sản/).fill('cà chua');
    await page.getByLabel(/^Địa chỉ$/).fill('Mê Linh');
    await page.getByLabel(/Tỉnh/).fill('Hà Nội');
    await page.getByLabel(/Ngày bắt đầu/).fill('2026-02-01');
    await page.getByLabel(/Ngày thu hoạch/).fill('2026-05-01');
    await page.getByLabel(/Diện tích/).fill('800');
    await page.getByLabel(/Sản lượng/).fill('400');
    await page.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForURL(/\/vi\/projects\/0x[0-9a-fA-F]{64}/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'HTX New' })).toBeVisible();
  });

  test('inline validation surfaces required fields when submitting empty', async ({ page }) => {
    await page.goto('/vi/projects/new');
    // Keep dates empty to trigger required errors.
    await page.getByRole('button', { name: 'Lưu' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
  });

  test('edit project + soft-delete with confirmation', async ({ page }) => {
    await page.goto(`/vi/projects/${FIXTURE_PHI_A}/edit`);
    await page.getByLabel(/Tên hợp tác xã/).fill('HTX Renamed');
    await page.getByRole('button', { name: 'Lưu' }).click();
    await page.waitForURL(new RegExp(`/vi/projects/${FIXTURE_PHI_A}$`));
    await expect(page.getByRole('heading', { name: 'HTX Renamed' })).toBeVisible();

    // Soft-delete via the confirmation dialog.
    await page.getByRole('button', { name: 'Xoá dự án' }).click();
    await expect(page.getByText('Xác nhận xoá')).toBeVisible();
    // Click the inner Xoá dự án inside the dialog (second match).
    const dialogDelete = page.getByRole('button', { name: 'Xoá dự án' }).last();
    await dialogDelete.click();
    await page.waitForURL(/\/vi\/projects$/);
  });

  test('409 on update opens the edit-conflict dialog', async ({ page, context }) => {
    // Re-open the same context so cookies persist; wire a conflict mock.
    await context.clearCookies();
    await mockHub(page, { conflict: true });
    await signInAsProducer(page);
    await page.goto(`/vi/projects/${FIXTURE_PHI_A}/edit`);
    await page.getByLabel(/Tên hợp tác xã/).fill('Doomed Rename');
    await page.getByRole('button', { name: 'Lưu' }).click();
    await expect(page.getByText('Xung đột chỉnh sửa')).toBeVisible({ timeout: 10_000 });
  });
});
