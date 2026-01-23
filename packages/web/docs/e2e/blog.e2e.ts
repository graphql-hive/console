import { expect, test } from '@playwright/test';

test.describe('Blog & Content User Journeys', () => {
  test('developer discovers Hive through blog and explores docs', async ({ page }) => {
    await page.goto('/blog');

    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible();

    const posts = page.getByRole('article');
    await expect(posts.first()).toBeVisible();

    const firstPostLink = page
      .locator('a[href^="/blog/"]')
      .filter({ has: page.getByRole('article') })
      .first();
    await firstPostLink.click();

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.locator('article p').first()).toBeVisible();

    const docsLink = page.getByRole('contentinfo').getByRole('link', { name: 'Documentation' });
    await docsLink.scrollIntoViewIfNeeded();
    await expect(docsLink).toBeVisible();
    await docsLink.click();

    await expect(page).toHaveURL(/docs/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('user reads case study to evaluate Hive for their company', async ({ page }) => {
    await page.goto('/case-studies');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Target the "Explore customer stories" section which contains case study cards
    // FeaturedCaseStudiesGrid is hidden on mobile (max-xl:hidden) so we use AllCaseStudiesList
    const storiesSection = page.locator('section', {
      has: page.getByRole('heading', { name: 'Explore customer stories' }),
    });
    const caseStudyLinks = storiesSection.locator('a[href^="/case-studies/"]');
    await caseStudyLinks.first().scrollIntoViewIfNeeded();
    await expect(caseStudyLinks.first()).toBeVisible();

    await caseStudyLinks.first().click();

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.locator('p').first()).toBeVisible();
  });

  test('user checks product updates to see recent improvements', async ({ page }) => {
    // User wants to know what's new
    await page.goto('/product-updates');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Sees list of updates
    const updates = page.locator('a[href^="/product-updates/"]');
    await expect(updates.first()).toBeVisible();

    // Clicks on recent update
    await updates.first().click();

    // Reads update details
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('developer reads multiple blog posts in a session', async ({ page }) => {
    await page.goto('/blog');

    const firstPostLink = page
      .locator('a[href^="/blog/"]')
      .filter({ has: page.getByRole('article') })
      .first();
    await expect(firstPostLink).toBeVisible();
    const firstHref = await firstPostLink.getAttribute('href');
    await firstPostLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/blog');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible();

    const secondPostLink = page
      .locator(`a[href^="/blog/"]:not([href="${firstHref}"])`)
      .filter({ has: page.getByRole('article') })
      .first();
    await expect(secondPostLink).toBeVisible();
    await secondPostLink.click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.locator('article p').first()).toBeVisible();
  });

  test('user explores ecosystem and partner pages', async ({ page }) => {
    // User wants to understand the Hive ecosystem
    await page.goto('/ecosystem');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Navigates to partners page
    await page.goto('/partners');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Partners page has content (paragraphs or list items)
    await expect(page.locator('p').first()).toBeVisible();
  });

  test('user checks OSS friends page and discovers related projects', async ({ page }) => {
    await page.goto('/oss-friends');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const projectLinks = page.locator('dl a[href^="http"]');

    await projectLinks.first().scrollIntoViewIfNeeded();
    await expect(projectLinks.first()).toBeVisible();
  });
});
