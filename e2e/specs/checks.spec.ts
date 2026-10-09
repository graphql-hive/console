import { readFileSync } from 'fs';
import { checkSchema, publishSchema } from 'testkit/flow';
import { ProjectType } from 'testkit/seed';
import type { Page } from '@playwright/test';
import { expect, test, type SeedHelper } from '../fixtures';
import type { AuthHelper } from '../helpers/auth';

/** Publishes a federation schema, checks the same SDL again and opens that check. */
async function openUnchangedCheck(args: { page: Page; seed: SeedHelper; auth: AuthHelper }) {
  const { page, seed, auth } = args;
  const { accessToken, refreshToken, slug, resources } = await seed.seedTarget(
    ProjectType.Federation,
  );
  const sdl = readFileSync('integration-tests/fixtures/federation-00.graphql', 'utf-8');
  await publishSchema(
    {
      sdl,
      service: 'test',
      url: 'http://localhost:4141/test',
      target: {
        byId: resources.targetId,
      },
      author: 'e2e',
      commit: 'xyz',
    },
    accessToken,
  );
  const check = await checkSchema(
    {
      sdl,
      service: 'test',
      url: 'http://localhost:4141/test',
      target: {
        byId: resources.targetId,
      },
    },
    accessToken,
  ).then(r => r.expectNoGraphQLErrors());
  expect(check.schemaCheck.__typename).toBe('SchemaCheckSuccess');

  await auth.useSession({ refreshToken, accessToken });
  await page.goto(
    `/${slug}/checks/${check.schemaCheck.schemaCheck?.id}?filter_changed=false&filter_failed=false`,
    {
      waitUntil: 'domcontentloaded',
    },
  );
}

test.describe('checks', () => {
  test('should not show a diff for a version and check with the same SDL', async ({
    page,
    seed,
    auth,
  }) => {
    await openUnchangedCheck({ page, seed, auth });

    await page.getByTestId('service-view-btn').click(); // move to service tab
    await expect(page.getByTestId('schema-title-before')).toHaveText('test@xyz');
    await expect(page.getByTestId('schema-title')).toHaveText('test@unknown');
    await expect(page.getByTestId('schema-title-changed')).toHaveText('(unchanged)');

    await page.getByTestId('schema-view-btn').click(); // move to schema tab
    await expect(page.getByTestId('schema-title-before')).toHaveText('schema@xyz');
    await expect(page.getByTestId('schema-title')).toHaveText('schema@unknown');
    await expect(page.getByTestId('schema-title-changed')).toHaveText('(unchanged)');

    await page.getByTestId('supergraph-view-btn').click(); // move to supergraph tab
    await expect(page.getByTestId('schema-title-before')).toHaveText('supergraph@xyz');
    await expect(page.getByTestId('schema-title')).toHaveText('supergraph@unknown');
    await expect(page.getByTestId('schema-title-changed')).toHaveText('(unchanged)');
  });

  test('keeps the page inside the viewport when the schema has long lines', async ({
    page,
    seed,
    auth,
  }) => {
    await openUnchangedCheck({ page, seed, auth });

    // The supergraph's directive definitions are wider than the detail column.
    await page.getByTestId('supergraph-view-btn').click();
    // Lines arrive from the viewer's worker, so the width is only final once one is on screen.
    await expect(page.locator('[data-line]').first()).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      )
      .toBe(0);
  });
});
