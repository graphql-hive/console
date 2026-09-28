// @vitest-environment jsdom
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { createTestClient } from '@/lib/testing/urql';
import { createAppRouter } from '@/router';
import { createMemoryHistory } from '@tanstack/react-router';

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

const ALERTS = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}/alerts`;

async function loadedAt(url: string) {
  const client = createTestClient(layoutFixtures());
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
    urqlClient: client,
  });
  await router.load();
  return { client, router };
}

describe('alerts create route', () => {
  it(
    'starts the cap, channels and saved filters documents with the form variables',
    { timeout: 30_000 },
    async () => {
      const { client } = await loadedAt(`${ALERTS}/create`);
      const variables = (name: string) => client.requests(name).map(operation => operation.variables);

      expect(variables('TargetAlertsCreatePage_CapQuery')).toEqual([SLUGS]);
      expect(variables('AlertForm_ChannelsQuery')).toEqual([
        { organizationSlug: SLUGS.organizationSlug, projectSlug: SLUGS.projectSlug },
      ]);
      expect(variables('AlertForm_SavedFiltersQuery')).toEqual([SLUGS]);
    },
  );
});
