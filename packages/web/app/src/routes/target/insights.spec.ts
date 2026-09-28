// @vitest-environment jsdom
import { type ReactNode } from 'react';
import { presetLast7Days } from '@/components/ui/date-range-picker';
import { resolvePeriod } from '@/lib/hooks/use-date-range-controller';
import { insightsFixtures, OPERATION } from '@/lib/testing/fixtures/insights';
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient, operationName } from '@/lib/testing/urql';
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
vi.mock('supertokens-auth-react', async importOriginal => ({
  ...(await importOriginal<typeof import('supertokens-auth-react')>()),
  default: { init: () => {} },
  SuperTokensWrapper: (props: { children: ReactNode }) => props.children,
}));
vi.mock('supertokens-auth-react/recipe/session', () => ({
  default: {
    doesSessionExist: async () => true,
    getAccessTokenPayloadSecurely: async () => ({
      superTokensUserId: 'user-1',
      email: 'user@the-guild.dev',
    }),
    attemptRefreshingSession: async () => true,
  },
  SessionAuth: (props: { children: ReactNode }) => props.children,
  useSessionContext: () => ({ loading: false, doesSessionExist: true, userId: 'user-1' }),
}));

const TARGET = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}`;

// An absolute range, so the loader and the page resolve the same period whatever the clock does
// between them: the seven days up to the top of this hour.
const HOUR = 60 * 60 * 1000;
const to = new Date(Math.floor(Date.now() / HOUR) * HOUR).toISOString();
const from = new Date(Date.parse(to) - 7 * 24 * HOUR).toISOString();
const RANGE_TO = to;
const RANGE = `from=${from}&to=${to}`;
const OPERATIONS = `operations=${encodeURIComponent(JSON.stringify([OPERATION.hash]))}`;
const INSIGHTS = `${TARGET}/insights?${RANGE}&${OPERATIONS}`;
const OPERATION_PAGE = `${TARGET}/insights/${OPERATION.name}/${OPERATION.hash}?${RANGE}`;

const PAGE_DOCUMENTS = [
  'TargetOperationsPageQuery',
  'InsightsFilterPicker',
  'Stats_GeneralOperationsStats',
  'OperationsList_OperationsStats',
];

type TestClient = ReturnType<typeof createTestClient>;

function fixtures() {
  return new Map([...layoutFixtures(), ...insightsFixtures()]);
}

function requests(client: TestClient, name: string) {
  return client.seen.filter(seen => seen === name).length;
}

function variablesOf(client: TestClient, name: string) {
  return client.operations.find((_, index) => client.seen[index] === name)?.variables;
}

describe('insights route', () => {
  it(
    'starts every document the page reads, with its variables, before rendering',
    { timeout: 30_000 },
    async () => {
      const client = createTestClient(layoutFixtures());
      const router = createAppRouter({
        history: createMemoryHistory({ initialEntries: [INSIGHTS] }),
        urqlClient: client,
      });
      await router.load();

      expect(client.seen).toEqual(expect.arrayContaining(PAGE_DOCUMENTS));
      const policies = client.operations.map(operation => [
        operationName(operation),
        operation.context.requestPolicy,
      ]);
      expect(policies).toEqual(
        expect.arrayContaining([
          ['TargetOperationsPageQuery', 'cache-first'],
          ['InsightsFilterPicker', 'cache-first'],
          ['Stats_GeneralOperationsStats', 'cache-and-network'],
          ['OperationsList_OperationsStats', 'cache-and-network'],
        ]),
      );
      const { range: period, resolution } = resolvePeriod({ from, to });
      const filter = { operationIds: [OPERATION.hash] };
      expect(variablesOf(client, 'TargetOperationsPageQuery')).toEqual(SLUGS);
      expect(variablesOf(client, 'InsightsFilterPicker')).toEqual({ selector: SLUGS, period });
      expect(variablesOf(client, 'Stats_GeneralOperationsStats')).toEqual({
        targetSelector: SLUGS,
        period,
        filter,
        resolution,
      });
      expect(variablesOf(client, 'OperationsList_OperationsStats')).toEqual({
        targetSelector: SLUGS,
        period,
        filter,
      });
    },
  );

  it('sends a bare URL to the default range and loads once', { timeout: 30_000 }, async () => {
    const client = createTestClient(layoutFixtures());
    const router = createAppRouter({
      history: createMemoryHistory({ initialEntries: [`${TARGET}/insights`] }),
      urqlClient: client,
    });
    await router.load();

    await waitFor(() => expect(router.state.location.search).toEqual(presetLast7Days.range));
    for (const name of PAGE_DOCUMENTS) {
      expect(requests(client, name)).toBe(1);
    }
  });

  it('renders the page from the cache: one request per document', { timeout: 30_000 }, async () => {
    const client = createTestClient(fixtures());
    renderAtUrl(INSIGHTS, { client });
    await screen.findByRole('button', { name: 'Refresh' });
    await screen.findByText('Total requests served');

    for (const name of PAGE_DOCUMENTS) {
      expect(requests(client, name)).toBe(1);
    }
  });

  it(
    'Refresh reloads the route: the stats again, nothing else, no remount',
    { timeout: 30_000 },
    async () => {
      const client = createTestClient(fixtures());
      renderAtUrl(INSIGHTS, { client });
      const refresh = await screen.findByRole('button', { name: 'Refresh' });

      fireEvent.click(refresh);

      await waitFor(() => {
        expect(requests(client, 'Stats_GeneralOperationsStats')).toBe(2);
        expect(requests(client, 'OperationsList_OperationsStats')).toBe(2);
      });
      for (const name of [
        'TargetOperationsPageQuery',
        'InsightsFilterPicker',
        'TargetLayoutQuery',
        'ViewerQuery',
      ]) {
        expect(requests(client, name)).toBe(1);
      }
      expect(screen.getByRole('button', { name: 'Refresh' })).toBe(refresh);
    },
  );
});

describe('operation route', () => {
  it('is not preloaded when an operations row is hovered', { timeout: 30_000 }, async () => {
    const client = createTestClient(fixtures());
    renderAtUrl(INSIGHTS, { client });
    const row = await screen.findByRole('link', { name: OPERATION.name });

    fireEvent.mouseEnter(row);
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(client.seen).not.toContain('OperationInsightsPageQuery');
  });

  it('warms the body and the stats of this operation alone', { timeout: 30_000 }, async () => {
    const client = createTestClient(fixtures());
    renderAtUrl(OPERATION_PAGE, { client });
    await screen.findByText('Relative Request Frequency');

    const { range: period, resolution } = resolvePeriod({ from, to });
    expect(variablesOf(client, 'Stats_GeneralOperationsStats')).toEqual({
      targetSelector: SLUGS,
      period,
      filter: { operationIds: [OPERATION.hash] },
      resolution,
    });
    expect(variablesOf(client, 'GraphQLOperationBody_GetOperationBodyQuery')).toEqual({
      selector: SLUGS,
      hash: OPERATION.hash,
    });
    for (const name of [
      'OperationInsightsPageQuery',
      'GraphQLOperationBody_GetOperationBodyQuery',
      'Stats_GeneralOperationsStats',
    ]) {
      expect(requests(client, name)).toBe(1);
    }
  });
});

describe('insights preloading', () => {
  it('a hover only warms; the visit that follows revalidates', { timeout: 30_000 }, async () => {
    const client = createTestClient(fixtures());
    const router = createAppRouter({
      history: createMemoryHistory({ initialEntries: [TARGET] }),
      urqlClient: client,
    });
    await router.load();
    const to = '/$organizationSlug/$projectSlug/$targetSlug/insights';
    const search = { from, to: RANGE_TO };
    const stats = () =>
      client.operations
        .filter((_, index) => client.seen[index] === 'Stats_GeneralOperationsStats')
        .map(operation => [operation.context.preload, operation.context.requestPolicy]);

    await router.preloadRoute({ to, params: SLUGS, search });
    expect(stats()).toEqual([[true, 'cache-first']]);

    await router.navigate({ to, params: SLUGS, search });
    await waitFor(() => expect(stats()).toHaveLength(2));
    // The network leg of a cache-and-network hit reaches the network as network-only.
    expect(stats()[1]).toEqual([false, 'network-only']);
  });
});

describe('the period', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Only the clock is faked; timers stay real so the router and waitFor run as usual.
  it(
    'is resolved once, by the loader, so a filter change after the hour rolls over stays on one period',
    { timeout: 30_000 },
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-28T10:59:30.000Z'));
      const client = createTestClient(fixtures());
      const { router } = renderAtUrl(`${TARGET}/insights?from=now-7d&to=now`, { client });
      await screen.findByText('Total requests served');
      const periods = () =>
        client.operations
          .filter((_, index) => client.seen[index] === 'Stats_GeneralOperationsStats')
          .map(operation => (operation.variables as { period: { to: string } }).period.to);
      expect(periods()).toHaveLength(1);

      vi.setSystemTime(new Date('2026-09-28T11:00:30.000Z'));
      await router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug/insights',
        params: SLUGS,
        search: { from: 'now-7d', to: 'now', operations: [OPERATION.hash] },
      });
      await waitFor(() => expect(periods()).toHaveLength(2));
      await new Promise(resolve => setTimeout(resolve, 100));

      // One request per filter, both on the new bucket: the page did not ask for the old one.
      expect(periods()).toHaveLength(2);
      expect(new Date(periods()[1]).getUTCHours()).toBe(11);
    },
  );
});
