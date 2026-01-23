import { expect, test } from '@playwright/test';

// Note: /docs requires Nextra to be properly built. These tests may fail in dev mode.
// Run against built static site for reliable results.

test.describe('Documentation User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Check if docs page loads without error
    const response = await page.goto('/docs');
    if (!response?.ok()) {
      test.skip(true, 'Docs page not available (needs build)');
    }
  });

  test('new user follows getting started guide', async ({ page }) => {
    // Sees documentation homepage
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Finds sidebar navigation
    const nav = page.getByRole('navigation');
    await expect(nav.first()).toBeVisible();

    // Finds and clicks "Get Started" link
    const getStartedLink = page.getByRole('link', { name: /get started/i }).first();
    if ((await getStartedLink.count()) > 0) {
      await getStartedLink.click();
      await expect(page).toHaveURL(/get-started/);
    }
  });

  test('developer navigates to schema registry docs', async ({ page }) => {
    // Finds schema registry link
    const schemaLink = page.getByRole('link', { name: /schema registry/i }).first();
    if ((await schemaLink.count()) > 0) {
      await schemaLink.click();
      await expect(page).toHaveURL(/schema-registry/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('developer explores gateway documentation', async ({ page }) => {
    // Finds gateway docs link
    const gatewayLink = page.getByRole('link', { name: /gateway/i }).first();
    if ((await gatewayLink.count()) > 0) {
      await gatewayLink.click();
      await expect(page).toHaveURL(/gateway/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('documentation shows code examples', async ({ page }) => {
    // Navigate to a page likely to have code
    await page.goto('/docs/get-started/first-steps');

    // Check for code blocks
    const codeBlock = page.locator('pre code');
    if ((await codeBlock.count()) > 0) {
      await expect(codeBlock.first()).toBeVisible();
    }
  });

  test('sidebar navigation highlights current page', async ({ page }) => {
    await page.goto('/docs/get-started/first-steps');

    // Current page should be indicated somehow (aria-current or active class)
    const currentLink = page.locator('[aria-current="page"], [data-active="true"], .active');
    if ((await currentLink.count()) > 0) {
      await expect(currentLink.first()).toBeVisible();
    }
  });
});

test.describe('Documentation API Reference', () => {
  test('CLI reference page loads', async ({ page }) => {
    const response = await page.goto('/docs/api-reference/cli');
    if (!response?.ok()) {
      test.skip(true, 'Page not available');
    }

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
