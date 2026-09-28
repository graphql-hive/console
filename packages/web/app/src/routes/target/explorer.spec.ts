// @vitest-environment jsdom
import { explorerFixtures } from '@/lib/testing/fixtures/explorer';
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

const EXPLORER = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}/explorer`;
const REMEMBERED = 'hive:schema-explorer:period-1';
const LAST_WEEK = { from: 'now-7d', to: 'now' };
const LAST_MONTH = { from: 'now-30d', to: 'now' };

function client() {
  return createTestClient(new Map([...layoutFixtures(), ...explorerFixtures()]));
}

async function loadedAt(url: string) {
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
    urqlClient: client(),
  });
  await router.load();
  return router;
}

describe('explorer period', () => {
  afterEach(() => {
    localStorage.removeItem(REMEMBERED);
  });

  it.each(['', '/unused', '/deprecated', '/User'])(
    'sends a bare URL%s to the last week, replacing the entry',
    { timeout: 30_000 },
    async view => {
      const router = await loadedAt(`${EXPLORER}${view}`);

      await waitFor(() => expect(router.state.location.search).toEqual(LAST_WEEK));
      expect(router.state.location.pathname).toBe(`${EXPLORER}${view}`);
      expect(router.history.length).toBe(1);
    },
  );

  it('sends a bare URL to the preset last picked on any view', { timeout: 30_000 }, async () => {
    localStorage.setItem(REMEMBERED, JSON.stringify(LAST_MONTH));
    const router = await loadedAt(`${EXPLORER}/unused`);

    await waitFor(() => expect(router.state.location.search).toEqual(LAST_MONTH));
  });

  it('keeps the filters a bare URL carries through the redirect', { timeout: 30_000 }, async () => {
    const router = await loadedAt(`${EXPLORER}?subgraph=users&meta=owner:team`);

    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        ...LAST_WEEK,
        subgraph: 'users',
        meta: 'owner:team',
      }),
    );
  });

  it(
    'a preset picked on a view lands in the URL beside the filters and is remembered',
    { timeout: 30_000 },
    async () => {
      const { router } = renderAtUrl(`${EXPLORER}/deprecated?from=now-7d&to=now&subgraph=users`, {
        client: client(),
      });

      fireEvent.click(await screen.findByRole('button', { name: 'Last 7 days' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Last 30 days' }));

      await waitFor(() =>
        expect(router.state.location.search).toEqual({ ...LAST_MONTH, subgraph: 'users' }),
      );
      expect(JSON.parse(localStorage.getItem(REMEMBERED)!)).toEqual(LAST_MONTH);
    },
  );
});
