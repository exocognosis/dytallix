import { test, expect } from '@playwright/test';

test('landing page loads (smoke)', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Dytallix|Lean Launch/i);
});
