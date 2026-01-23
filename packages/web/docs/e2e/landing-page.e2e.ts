import { expect, test } from '@playwright/test';

test.describe('Landing Page User Journeys', () => {
  test('new visitor explores Hive and decides to sign up', async ({ page, isMobile }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    if (!isMobile) {
      const heroList = page.locator('ul').first();
      await expect(heroList.getByRole('listitem').first()).toBeVisible();
    }

    const featureTabs = page.getByRole('tablist').first();
    await featureTabs.scrollIntoViewIfNeeded();
    await expect(featureTabs).toBeVisible();

    const tabs = featureTabs.getByRole('tab');
    await expect(tabs.first()).toBeVisible();

    if (isMobile) {
      // On mobile, tabs render as a dropdown - only active tab is visible.
      // Clicking the active tab opens the dropdown, revealing all tabs.
      await tabs.first().click();
      // Now the second tab should be visible and clickable
    }
    await tabs.nth(1).click();
    await expect(page.getByRole('tabpanel').first()).toBeVisible();

    const signUpCta = page.getByRole('link', { name: /get started/i }).first();
    await expect(signUpCta).toHaveAttribute('href', /app\.graphql-hive\.com/);
  });

  test('developer navigates to federation page', async ({ page }) => {
    await page.goto('/');

    // Clicks federation link in hero paragraph
    const federationLink = page
      .locator('p')
      .getByRole('link', { name: /federation/i })
      .first();
    await federationLink.click();

    await expect(page).toHaveURL('/federation');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('developer navigates to gateway page', async ({ page }) => {
    await page.goto('/');

    // Clicks gateway link
    await page.getByRole('link', { name: 'gateway', exact: true }).click();

    await expect(page).toHaveURL('/gateway');
    // Gateway page has multiple h1s, check the first one
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('user navigates to pricing via nav', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      // On mobile, open hamburger menu first
      await page.getByRole('button', { name: 'Menu' }).click();
      // Then click pricing in the opened sidebar
      await page
        .getByRole('complementary')
        .getByRole('link', { name: /pricing/i })
        .click();
    } else {
      const nav = page.getByRole('navigation').first();
      await nav.getByRole('link', { name: /pricing/i }).click();
    }

    await expect(page).toHaveURL('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('FAQ accordion expands on click', async ({ page }) => {
    await page.goto('/');

    // Find FAQ section by its accordion structure (Radix UI)
    const faqAccordion = page.locator('[data-orientation="vertical"]').first();
    await faqAccordion.scrollIntoViewIfNeeded();

    // Click first accordion trigger
    const faqTrigger = faqAccordion.getByRole('button').first();
    await expect(faqTrigger).toBeVisible();
    await faqTrigger.click();

    // Content should expand (data-state changes)
    await expect(page.locator('[data-state="open"]').first()).toBeVisible();
  });

  test('testimonials section shows company tabs', async ({ page }) => {
    await page.goto('/');

    // Find testimonials by tablist structure (second tablist on page after features)
    const tabLists = page.getByRole('tablist');
    const testimonialTabs = tabLists.nth(1);
    await testimonialTabs.scrollIntoViewIfNeeded();

    // Tabs exist for companies
    const tabs = testimonialTabs.getByRole('tab');
    await expect(tabs.first()).toBeVisible();
    expect(await tabs.count()).toBeGreaterThan(0);
  });

  test('navigation menu is accessible', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      const menuButton = page.getByRole('button', { name: 'Menu' });
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      const sidebar = page.getByRole('complementary');
      await expect(sidebar).toBeVisible();
      await expect(sidebar.getByRole('link', { name: /pricing/i })).toBeVisible();
    } else {
      const nav = page.getByRole('navigation').first();
      await expect(nav).toBeVisible();
      await expect(nav.getByRole('button').first()).toBeVisible();
      await expect(nav.getByRole('link', { name: /pricing/i })).toBeVisible();
    }
  });
});
