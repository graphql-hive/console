import { readFileSync } from 'fs';
import { checkSchema, publishSchema } from 'testkit/flow';
import { ProjectType } from 'testkit/seed';
import { expect, test } from '../fixtures';

test.describe('checks', () => {
  test('should not show a diff for a version and check with the same SDL', async ({
    page,
    seed,
    auth,
  }) => {
    // const { accessToken, refreshToken, slug } = await seed.seedOrg();
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
    await expect(check.schemaCheck.__typename).toBe('SchemaCheckSuccess');
    if (check.schemaCheck.__typename === 'SchemaCheckSuccess') {
      async function editorHasNoDeletions() {
        let previousScrollTop = -1;
        let currentScrollTop = 0;
        while (currentScrollTop !== previousScrollTop) {
          previousScrollTop = currentScrollTop;
          currentScrollTop = await page.evaluate(async () => {
            const scroller = document.querySelector(
              '.monaco-editor .monaco-scrollable-element',
            ) as HTMLElement;
            scroller.scrollTop += 400; // Shift downwards
            return scroller.scrollTop;
          });
          await expect(page.locator('.monaco-editor .gutter-delete')).toBeHidden(); // no "removed" diff element
          await page.waitForTimeout(50);
        }
      }

      await auth.useSession({ refreshToken, accessToken });
      await page.goto(
        `/${slug}/checks/${check.schemaCheck.schemaCheck?.id}?filter_changed=false&filter_failed=false`,
        {
          waitUntil: 'domcontentloaded',
        },
      );

      await page.getByTestId('service-view-btn').click(); // move to service tab
      await expect(page.locator('.monaco-editor.gutter')).toBeAttached({ timeout: 2000 }); // schema diff editor exists
      await editorHasNoDeletions();

      await page.getByTestId('schema-view-btn').click(); // move to schema tab
      await expect(page.locator('.monaco-editor.gutter')).toBeAttached({ timeout: 2000 }); // schema diff editor exists
      await editorHasNoDeletions();

      await page.getByTestId('supergraph-view-btn').click(); // move to supergraph tab
      await expect(page.locator('.monaco-editor.gutter')).toBeAttached({ timeout: 2000 }); // schema diff editor exists
      await editorHasNoDeletions();
    }
  });
});
