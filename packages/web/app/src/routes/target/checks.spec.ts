// @vitest-environment jsdom
import { CHECKS, checksFixtures } from '@/lib/testing/fixtures/checks';
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { createAppRouter } from '@/router';
import { createMemoryHistory } from '@tanstack/react-router';
import { fireEvent, screen, waitFor } from '@testing-library/react';

// The tree imports every page; these stand in for what cannot load under jsdom.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);
vi.mock('@/components/schema-editor', async importOriginal => ({
  ...(await importOriginal<typeof import('@/components/schema-editor')>()),
  SchemaEditor: () => null,
}));
vi.mock('supertokens-auth-react', () => import('@/lib/testing/mocks/supertokens'));
vi.mock('supertokens-auth-react/recipe/session', () => import('@/lib/testing/mocks/session'));

const CHECKS_PAGE = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}/checks`;

type TestClient = ReturnType<typeof createTestClient>;

function client() {
  return createTestClient(new Map([...layoutFixtures(), ...checksFixtures()]));
}

function listRequests(client: TestClient) {
  return client.requests('SchemaChecks_NavigationQuery').map(operation => operation.variables);
}

describe('schema checks list', () => {
  it('loads the next page into the same list', { timeout: 30_000 }, async () => {
    const testClient = client();
    renderAtUrl(CHECKS_PAGE, { client: testClient });
    await screen.findByText(CHECKS.first[0]);
    expect(screen.getByText(CHECKS.first[1])).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await screen.findByText(CHECKS.second[0]);
    expect(screen.getByText(CHECKS.first[0])).toBeTruthy();
    expect(screen.getByText(CHECKS.first[1])).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(listRequests(testClient).map(variables => variables?.after)).toEqual([
      null,
      CHECKS.nextCursor,
    ]);
  });

  it('starts over from the first page when a filter changes', { timeout: 30_000 }, async () => {
    const testClient = client();
    renderAtUrl(CHECKS_PAGE, { client: testClient });
    await screen.findByText(CHECKS.first[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByText(CHECKS.second[0]);
    const toggle = screen.getByLabelText('Show only failed checks');

    fireEvent.click(toggle);

    await waitFor(() => expect(screen.queryByText(CHECKS.first[0])).toBeNull());
    expect(screen.queryByText(CHECKS.second[0])).toBeNull();
    expect(screen.getByText(CHECKS.failedOnly)).toBeTruthy();
    expect(listRequests(testClient).at(-1)).toMatchObject({
      after: null,
      filters: { changed: false, failed: true },
    });
    // The side nav stayed mounted: whether checks exist does not depend on the filters.
    expect(screen.getByLabelText('Show only failed checks')).toBe(toggle);
    expect(testClient.requests('ChecksPageQuery')).toHaveLength(1);
  });

  it('does not preload a check when its row is hovered', { timeout: 30_000 }, async () => {
    const testClient = client();
    renderAtUrl(CHECKS_PAGE, { client: testClient });
    const row = await screen.findByRole('link', { name: new RegExp(CHECKS.first[0]) });

    fireEvent.mouseEnter(row);
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(testClient.seen).not.toContain('ActiveSchemaCheck_ActiveSchemaCheckQuery');
  });

  it('keeps the selected check when a filter changes', { timeout: 30_000 }, async () => {
    const { router } = renderAtUrl(`${CHECKS_PAGE}/check-2`, { client: client() });
    await screen.findByText(CHECKS.first[1]);

    fireEvent.click(screen.getByLabelText('Show only failed checks'));

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ filter_failed: true }),
    );
    expect(router.state.location.pathname).toBe(`${CHECKS_PAGE}/check-2`);
    expect(screen.getByText(CHECKS.failedOnly)).toBeTruthy();
    expect(screen.getByText(CHECKS.first[1])).toBeTruthy();
    expect(screen.queryByText('Select a schema check')).toBeNull();
  });
});

describe('checks route loaders', () => {
  it(
    'start the page and the first list page, with the filters from the URL, before rendering',
    { timeout: 30_000 },
    async () => {
      const testClient = client();
      const router = createAppRouter({
        history: createMemoryHistory({ initialEntries: [`${CHECKS_PAGE}?filter_failed=true`] }),
        urqlClient: testClient,
      });
      await router.load();

      expect(testClient.seen).toContain('ChecksPageQuery');
      expect(listRequests(testClient)).toEqual([
        { ...SLUGS, after: null, filters: { changed: false, failed: true } },
      ]);
    },
  );

  it('render the page from the cache: one request per document', { timeout: 30_000 }, async () => {
    const testClient = client();
    renderAtUrl(CHECKS_PAGE, { client: testClient });
    await screen.findByText(CHECKS.first[0]);

    expect(testClient.requests('ChecksPageQuery')).toHaveLength(1);
    expect(listRequests(testClient)).toHaveLength(1);
  });

  it("start a check's own document on its route, once", { timeout: 30_000 }, async () => {
    const testClient = client();
    testClient.fixtures.set('ActiveSchemaCheck_ActiveSchemaCheckQuery', new Promise(() => {}));
    renderAtUrl(`${CHECKS_PAGE}/check-2`, { client: testClient });
    await screen.findByText(CHECKS.first[1]);

    const active = testClient.requests('ActiveSchemaCheck_ActiveSchemaCheckQuery');
    expect(active.map(operation => operation.variables)).toEqual([
      { ...SLUGS, schemaCheckId: 'check-2' },
    ]);
  });
});
