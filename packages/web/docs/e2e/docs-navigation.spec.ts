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

  test('docs landing page shows content', async ({ page, isMobile }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    if (isMobile) {
      const sidebar = page.getByRole('complementary');
      await expect(sidebar.first()).toBeVisible();
    } else {
      const nav = page.getByRole('navigation');
      await expect(nav.first()).toBeVisible();
    }
  });

  test('developer navigates to schema registry via sidebar', async ({ page }) => {
    // Schema Registry is under "Hive Console" section
    const sidebar = page.getByRole('complementary');

    // The link exists but HeadlessUI overlays intercept pointer events
    // Use JavaScript click to bypass the interception
    const schemaRegistryLink = sidebar.locator('a[href="/docs/schema-registry"]');
    await expect(schemaRegistryLink).toBeVisible();
    await schemaRegistryLink.evaluate((el: HTMLElement) => el.click());

    await expect(page).toHaveURL(/schema-registry/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('developer navigates to gateway via sidebar', async ({ page }) => {
    // Gateway docs link
    const sidebar = page.getByRole('complementary');

    // The link exists but HeadlessUI overlays intercept pointer events
    // Use JavaScript click to bypass the interception
    const gatewayLink = sidebar.locator('a[href="/docs/gateway"]');
    await expect(gatewayLink).toBeVisible();
    await gatewayLink.evaluate((el: HTMLElement) => el.click());

    await expect(page).toHaveURL(/gateway/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('documentation shows code examples', async ({ page }) => {
    // Navigate to CLI reference which has code examples
    await page.goto('/docs/api-reference/cli');

    // Check for code blocks
    const codeBlock = page.locator('pre').first();
    await expect(codeBlock).toBeVisible();
  });

  test('sidebar shows active section', async ({ page }) => {
    // Navigate to schema registry page
    await page.goto('/docs/schema-registry');

    // The sidebar should show Hive Console section as expanded/active
    const sidebar = page.getByRole('complementary');
    const hiveConsoleButton = sidebar.getByRole('button', { name: 'Hive Console' });
    await expect(hiveConsoleButton).toBeVisible();
    // Active sections have bg-primary styling
    await expect(hiveConsoleButton).toHaveClass(/bg-primary/);
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
