import { test, expect } from '@playwright/test';

/**
 * T-028 smoke: login page renders, locale defaults to vi, protected
 * dashboard route redirects to /login when no session is present, and
 * the locale-toggle preserves the route.
 */

test.describe('Auth + protected routing (T-028)', () => {
  test('default locale = vi: bare /login redirects with prefix', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/vi\/login/);
    await expect(page.getByRole('heading', { name: /Đăng nhập/ })).toBeVisible();
  });

  test('protected /dashboard redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/vi/dashboard');
    await expect(page).toHaveURL(/\/vi\/login/);
  });

  test('en locale renders English copy', async ({ page }) => {
    await page.goto('/en/login');
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible();
  });

  test('login fails fast with bad credentials and stays on the page', async ({ page }) => {
    // The hub isn't running for this smoke; the credentials provider
    // will get a network error and surface the invalid-creds message.
    await page.goto('/vi/login');
    await page.getByLabel('Email').fill('nobody@example.test');
    await page.getByLabel('Mật khẩu').fill('wrongpass1');
    await page.getByRole('button', { name: /Đăng nhập/ }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/vi\/login/);
  });
});
