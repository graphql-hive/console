import { expect, test } from '@playwright/test';

test.describe('Blog & Content User Journeys', () => {
  test('developer discovers Hive through blog and explores product', async ({ page }) => {
    // User lands on blog (e.g., from search engine or social media)
    await page.goto('/blog');

    // Sees blog listing
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible();

    // Blog posts are visible as article cards
    const posts = page.getByRole('article');
    await expect(posts.first()).toBeVisible();

    // Clicks on an interesting post
    const firstPostLink = page
      .locator('a[href^="/blog/"]')
      .filter({ has: page.getByRole('article') })
      .first();
    await firstPostLink.click();

    // Reads the blog post - wait for navigation
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Post has content (paragraphs)
    const paragraphs = page.locator('p');
    expect(await paragraphs.count()).toBeGreaterThan(0);

    // After reading, user wants to learn more - uses nav to go to docs
    const docsLink = page.getByRole('link', { name: /docs|documentation/i });
    if ((await docsLink.count()) > 0) {
      await docsLink.first().click();
      await expect(page).toHaveURL(/docs/);
    }
  });

  test('user filters blog by tag to find related content', async ({ page }) => {
    await page.goto('/blog');

    // Sees tag filter buttons
    const tagButtons = page.getByRole('button').filter({ hasText: /GraphQL|TypeScript|React/i });

    if ((await tagButtons.count()) > 0) {
      // Click a tag to filter
      await tagButtons.first().click();

      // Posts should still be visible (filtered)
      const posts = page.getByRole('article');
      await expect(posts.first()).toBeVisible();
    }
  });

  test('user reads case study to evaluate Hive for their company', async ({ page }) => {
    // User is evaluating Hive and wants social proof
    await page.goto('/case-studies');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Sees case study cards/links
    const caseStudyLinks = page.locator('a[href^="/case-studies/"]');

    if ((await caseStudyLinks.count()) > 0) {
      // Clicks on a case study
      await caseStudyLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Reads the case study
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Case study has content
      const paragraphs = page.locator('p');
      expect(await paragraphs.count()).toBeGreaterThan(0);
    }
  });

  test('user checks product updates to see recent improvements', async ({ page }) => {
    // User wants to know what's new
    await page.goto('/product-updates');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Sees list of updates
    const updates = page.locator('a[href^="/product-updates/"]');

    if ((await updates.count()) > 0) {
      // Clicks on recent update
      await updates.first().click();
      await page.waitForLoadState('networkidle');

      // Reads update details
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('developer reads multiple blog posts in a session', async ({ page }) => {
    await page.goto('/blog');

    const postLinks = page.locator('a[href^="/blog/"]').filter({ has: page.getByRole('article') });
    const postCount = await postLinks.count();

    if (postCount >= 2) {
      // Read first post
      await postLinks.first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Go back to blog list
      await page.goBack();
      await expect(page).toHaveURL('/blog');

      // Read second post
      await postLinks.nth(1).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Post has content
      expect(await page.locator('p').count()).toBeGreaterThan(0);
    }
  });

  test('user explores ecosystem and partner pages', async ({ page }) => {
    // User wants to understand the Hive ecosystem
    await page.goto('/ecosystem');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Navigates to partners page
    await page.goto('/partners');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Partners page has content
    const content = page.locator('main, [class*="content"]');
    await expect(content.first()).toBeVisible();
  });

  test('user checks OSS friends page and discovers related projects', async ({ page }) => {
    await page.goto('/oss-friends');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Page shows OSS projects with external links
    const projectLinks = page.locator('a[href^="http"]').filter({ hasText: /.+/ });

    // There should be external links to OSS projects
    expect(await projectLinks.count()).toBeGreaterThan(0);
  });
});
