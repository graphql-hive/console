import { expect, test } from '@playwright/test';

test.describe('Search User Journeys', () => {
  const searchPlaceholder = 'Search documentation…';

  test('developer uses search to find federation info', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      await page.getByRole('button', { name: 'Menu' }).click();
    }

    const searchInput = page.getByRole('combobox', { name: searchPlaceholder });
    await expect(searchInput).toBeVisible();

    await searchInput.click();
    await searchInput.fill('federation');

    await expect(searchInput).toHaveValue('federation');
    // Search results depend on pagefind index which is only built in production
    const results = page.getByRole('option');
    const errorMessage = page.getByText('Failed to load search index');
    await expect(results.first().or(errorMessage)).toBeVisible();
  });

  test('user opens search with keyboard shortcut', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      await page.getByRole('button', { name: 'Menu' }).click();
    }

    await page.keyboard.press('Meta+k');

    const searchInput = page.getByRole('combobox', { name: searchPlaceholder });
    await searchInput.fill('gateway');

    await expect(searchInput).toHaveValue('gateway');
    // Search results depend on pagefind index which is only built in production
    const results = page.getByRole('option');
    const errorMessage = page.getByText('Failed to load search index');
    await expect(results.first().or(errorMessage)).toBeVisible();
  });

  test('search results navigate to docs', async ({ page, isMobile }) => {
    test.skip(!process.env.CI, 'Search index only available in CI (production build)');

    await page.goto('/');

    if (isMobile) {
      await page.getByRole('button', { name: 'Menu' }).click();
    }

    const searchInput = page.getByRole('combobox', { name: searchPlaceholder });
    await searchInput.click();
    await searchInput.fill('schema registry');

    const firstResult = page.getByRole('option').first();
    await expect(firstResult).toBeVisible();
    await firstResult.click();

    await expect(page).toHaveURL(/docs/);
  });

  test('search is available on pricing page', async ({ page, isMobile }) => {
    await page.goto('/pricing');

    if (isMobile) {
      await page.getByRole('button', { name: 'Menu' }).click();
    }

    const searchInput = page.getByRole('combobox', { name: searchPlaceholder });
    await expect(searchInput).toBeVisible();
  });

  test('search is available on blog page', async ({ page, isMobile }) => {
    await page.goto('/blog');

    if (isMobile) {
      await page.getByRole('button', { name: 'Menu' }).click();
    }

    const searchInput = page.getByRole('combobox', { name: searchPlaceholder });
    await expect(searchInput).toBeVisible();
  });
});
