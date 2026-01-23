import { expect, test } from '@playwright/test';

test.describe('Search User Journeys', () => {
  // Search uses actual ellipsis character: …
  const searchPlaceholder = 'Search documentation…';

  test('developer uses search to find federation info', async ({ page }) => {
    await page.goto('/');

    // Finds search combobox in header
    const searchInput = page.getByRole('combobox', { name: searchPlaceholder });
    await expect(searchInput).toBeVisible();

    // Clicks search to focus/open
    await searchInput.click();

    // Types search query
    await page.keyboard.type('federation');

    // Search should have value
    await expect(searchInput).toHaveValue('federation');
  });

  test('user opens search with keyboard shortcut', async ({ page }) => {
    await page.goto('/');

    // Opens search with Ctrl+K
    await page.keyboard.press('Control+k');

    // Can type in search
    await page.keyboard.type('gateway');

    // Search should have value
    const searchInput = page.getByRole('combobox', { name: searchPlaceholder });
    await expect(searchInput).toHaveValue('gateway');
  });

  test('search is available on pricing page', async ({ page }) => {
    await page.goto('/pricing');

    const searchInput = page.getByRole('combobox', { name: searchPlaceholder });
    await expect(searchInput).toBeVisible();
  });

  test('search is available on blog page', async ({ page }) => {
    await page.goto('/blog');

    const searchInput = page.getByRole('combobox', { name: searchPlaceholder });
    await expect(searchInput).toBeVisible();
  });

  test('search persists across navigation', async ({ page }) => {
    // Homepage
    await page.goto('/');
    await expect(page.getByRole('combobox', { name: searchPlaceholder })).toBeVisible();

    // Pricing
    await page.goto('/pricing');
    await expect(page.getByRole('combobox', { name: searchPlaceholder })).toBeVisible();

    // Federation
    await page.goto('/federation');
    await expect(page.getByRole('combobox', { name: searchPlaceholder })).toBeVisible();

    // Gateway
    await page.goto('/gateway');
    await expect(page.getByRole('combobox', { name: searchPlaceholder })).toBeVisible();
  });
});
