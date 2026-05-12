import { test, expect } from '@playwright/test';

const PHI = '0x' + 'a'.repeat(64);
const VALID_SID = '0x' + 'b'.repeat(40);
const FAKE_SID = '0x' + 'f'.repeat(40);

test.describe('Private scan page (T-025)', () => {
  test('valid sid → AUTHENTIC with txHash linking to Polygonscan', async ({ page }) => {
    await page.route('**/api/v1/scan/private', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}') as {
        secretId?: string;
      };
      if (body.secretId === VALID_SID) {
        await route.fulfill({
          status: 200,
          json: {
            status: 'AUTHENTIC',
            txHash: '0x' + 'd'.repeat(64),
            eventArgs: {
              phi: PHI,
              h: '0x' + 'e'.repeat(64),
              producer: '0x' + '1'.repeat(40),
              timestamp: 1_700_000_000,
            },
            verifiedAt: '2026-04-01T00:00:00.000Z',
          },
        });
      } else {
        await route.fulfill({
          status: 200,
          json: { status: 'COUNTERFEIT', message: 'Not on chain' },
        });
      }
    });
    await page.goto(`/vi/scan/${PHI}/${VALID_SID}`);
    await expect(page.getByText('HÀNG THẬT', { exact: false }).first()).toBeVisible({
      timeout: 10_000,
    });
    const link = page.getByRole('link', { name: /polygonscan/i }).first();
    await expect(link).toHaveAttribute('href', /\/tx\/0x[d]{64}/);
  });

  test('redeemed sid → ALREADY_VERIFIED with previousTxHash', async ({ page }) => {
    await page.route('**/api/v1/scan/private', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          status: 'ALREADY_VERIFIED',
          previousTxHash: '0x' + 'a'.repeat(64),
          previousVerifiedAt: '2026-03-15T12:00:00.000Z',
        },
      });
    });
    await page.goto(`/vi/scan/${PHI}/${VALID_SID}`);
    await expect(page.getByText('Đã xác thực trước đó').first()).toBeVisible({ timeout: 10_000 });
  });

  test('invalid sid → COUNTERFEIT', async ({ page }) => {
    await page.route('**/api/v1/scan/private', async (route) => {
      await route.fulfill({
        status: 200,
        json: { status: 'COUNTERFEIT', message: 'Not on chain' },
      });
    });
    await page.goto(`/vi/scan/${PHI}/${FAKE_SID}`);
    await expect(page.getByText('KHÔNG HỢP LỆ').first()).toBeVisible({ timeout: 10_000 });
  });

  test('English locale renders English outcome strings', async ({ page }) => {
    await page.route('**/api/v1/scan/private', async (route) => {
      await route.fulfill({
        status: 200,
        json: { status: 'COUNTERFEIT', message: 'Not on chain' },
      });
    });
    await page.goto(`/en/scan/${PHI}/${FAKE_SID}`);
    await expect(page.getByText('NOT GENUINE').first()).toBeVisible({ timeout: 10_000 });
  });
});
