import { readFileSync } from 'fs';
import { publishSchema } from 'testkit/flow';
import { ProjectType } from 'testkit/seed';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

/** The nav's current item, by the router's `aria-current`. */
function current(page: Page, nav: string) {
  return page.locator(`nav[aria-label="${nav}"] a[aria-current="page"]`);
}

/**
 * What only a browser can check about routing; the jsdom specs in packages/web/app/src/routes cover
 * the rest. The laboratory mounts Monaco, a section URL is a direct full-page load through the
 * server, and the history index redirects on real data.
 */
test('pages render in their layout on a full load', async ({ page, seed, auth }) => {
  const { accessToken, refreshToken, slug, resources } = await seed.seedTarget(
    ProjectType.Federation,
  );
  await publishSchema(
    {
      sdl: readFileSync('integration-tests/fixtures/federation-00.graphql', 'utf-8'),
      service: 'test',
      url: 'http://localhost:4141/test',
      target: { byId: resources.targetId },
      author: 'e2e',
      commit: 'xyz',
    },
    accessToken,
  );
  await auth.useSession({ refreshToken, accessToken });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(`/${slug}/laboratory`, { waitUntil: 'domcontentloaded' });
  await expect(current(page, 'Secondary')).toHaveText('Laboratory');

  await page.goto(`/${slug}/settings/cdn`, { waitUntil: 'domcontentloaded' });
  await expect(current(page, 'Secondary')).toHaveText('Settings');
  await expect(current(page, 'Settings')).toHaveText('CDN Tokens');

  await page.goto(`/${slug}/history`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(new RegExp(`/${slug}/history/[^/?]+$`));
  await expect(current(page, 'Secondary')).toHaveText('History');

  expect(errors).toEqual([]);
});
