import { expect, test } from '@playwright/test';

test.describe('Landing Page User Journeys', () => {
  test('new visitor explores Hive and decides to sign up', async ({ page }) => {
    await page.goto('/');

    // Sees the main value proposition
    await expect(
      page.getByRole('heading', { name: 'Open-Source GraphQL Federation Platform' }),
    ).toBeVisible();

    // Notices key selling points (as list items)
    await expect(
      page.getByRole('listitem').filter({ hasText: 'MIT licensed' }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: 'No vendor-lock' }).first(),
    ).toBeVisible();

    // Feature tabs section exists
    const featureTabs = page.getByRole('tablist').first();
    await expect(featureTabs).toBeVisible();

    // Click a different tab
    const observabilityTab = page.getByRole('tab', { name: /Observability/i });
    if ((await observabilityTab.count()) > 0) {
      await observabilityTab.click();
      // Verify at least one tabpanel is visible
      await expect(page.getByRole('tabpanel').first()).toBeVisible();
    }

    // Sees social proof
    await expect(page.getByText('Trusted by global enterprises')).toBeVisible();

    // CTA to sign up is present
    const signUpCta = page.getByRole('link', { name: 'Get started for free' }).first();
    await expect(signUpCta).toHaveAttribute('href', 'https://app.graphql-hive.com');
  });

  test('developer navigates to federation page', async ({ page }) => {
    await page.goto('/');

    // Clicks federation link in hero paragraph
    const federationLink = page.locator('p').getByRole('link', { name: 'GraphQL federation' });
    await federationLink.click();

    await expect(page).toHaveURL('/federation');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('developer navigates to gateway page', async ({ page }) => {
    await page.goto('/');

    // Clicks gateway link (the one in hero that says just "gateway")
    await page.getByRole('link', { name: 'gateway', exact: true }).click();

    await expect(page).toHaveURL('/gateway');
    await expect(page.getByRole('heading', { name: 'Hive Gateway', level: 1 })).toBeVisible();
  });

  test('user navigates to pricing via nav', async ({ page }) => {
    await page.goto('/');

    // Clicks pricing link in navigation
    const nav = page.getByRole('navigation', { name: 'Navigation Menu' });
    await nav.getByRole('link', { name: 'Pricing' }).click();

    await expect(page).toHaveURL('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('FAQ accordion expands on click', async ({ page }) => {
    await page.goto('/');

    // Scroll to FAQ section
    const faqHeading = page.getByRole('heading', { name: 'Frequently Asked Questions' });
    await faqHeading.scrollIntoViewIfNeeded();
    await expect(faqHeading).toBeVisible();

    // Click first FAQ item button
    const faqButton = page.getByRole('button', { name: /vendor lock-in/i });
    await faqButton.click();

    // Content should expand (data-state changes)
    await expect(page.locator('[data-state="open"]').first()).toBeVisible();
  });

  test('testimonials section shows company tabs', async ({ page }) => {
    await page.goto('/');

    // Scroll to testimonials
    const testimonialsHeading = page.getByRole('heading', { name: /Loved by Developers/i });
    await testimonialsHeading.scrollIntoViewIfNeeded();
    await expect(testimonialsHeading).toBeVisible();

    // Testimonial tabs exist (company logos)
    const testimonialSection = page.locator('section').filter({ has: testimonialsHeading });
    const tabs = testimonialSection.getByRole('tab');
    expect(await tabs.count()).toBeGreaterThan(0);
  });

  test('navigation menu is accessible', async ({ page }) => {
    await page.goto('/');

    // Navigation is visible
    const nav = page.getByRole('navigation', { name: 'Navigation Menu' });
    await expect(nav).toBeVisible();

    // Key menu items exist (within nav)
    await expect(nav.getByRole('button', { name: 'Products' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Developer' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Pricing' })).toBeVisible();
  });
});
