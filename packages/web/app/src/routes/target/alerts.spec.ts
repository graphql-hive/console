// @vitest-environment jsdom
import { loaderPeriod } from '@/lib/hooks/use-date-range-controller';
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { presetLast1Hour } from '@/pages/target-alerts-activity';
import { createAppRouter } from '@/router';
import { UTCDate } from '@date-fns/utc';
import { createMemoryHistory } from '@tanstack/react-router';
import { screen, waitFor } from '@testing-library/react';

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
// Polls every 200 ms here, so a spec sees a few ticks with real timers.
vi.mock('@/components/target/alerts/alert-polling', () => ({ ALERTS_POLL_INTERVAL_MS: 200 }));

const ALERTS = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}/alerts`;
const ACTIVITY = 'TargetAlertsActivityPage_Query';
const RETENTION = 'TargetAlertsActivityPage_RetentionQuery';
const TARGET_NODE = { __typename: 'Target', id: 'target-1' };

function activityFixtures() {
  return new Map<string, unknown>([
    ...layoutFixtures(),
    [
      RETENTION,
      { __typename: 'Query', target: { ...TARGET_NODE, metricAlertStateLogRetentionDays: 30 } },
    ],
    [ACTIVITY, { __typename: 'Query', target: { ...TARGET_NODE, metricAlertRuleStateLog: [] } }],
  ]);
}

async function loadedAt(url: string) {
  const client = createTestClient(layoutFixtures());
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
    urqlClient: client,
  });
  await router.load();
  return { client, router };
}

describe('alerts activity route', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Only the clock is faked; timers stay real so the router, the poll and waitFor run as usual.
  it(
    'sends a bare URL to the last hour and starts retention and the log together',
    { timeout: 30_000 },
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-28T10:59:50.000Z'));
      const client = createTestClient(activityFixtures());
      const router = createAppRouter({
        history: createMemoryHistory({ initialEntries: [ALERTS] }),
        urqlClient: client,
      });
      await router.load();
      await waitFor(() => expect(router.state.location.search).toEqual(presetLast1Hour.range));

      const { period } = loaderPeriod(
        presetLast1Hour.range,
        presetLast1Hour,
        new UTCDate('2026-09-28T10:59:50.000Z'),
      );
      expect(client.requests(RETENTION).map(o => o.variables)).toEqual([SLUGS]);
      expect(client.requests(ACTIVITY).map(o => [o.variables, o.context.requestPolicy])).toEqual([
        [{ ...SLUGS, from: period.from, to: period.to }, 'cache-and-network'],
      ]);
    },
  );

  it('resets a range in months to the last hour and notes it', { timeout: 30_000 }, async () => {
    const client = createTestClient(activityFixtures());
    const router = createAppRouter({
      history: createMemoryHistory({ initialEntries: [`${ALERTS}?from=now-6M&to=now&types=["x"]`] }),
      urqlClient: client,
    });
    await router.load();

    await waitFor(() =>
      expect(router.state.location.search).toEqual({ ...presetLast1Hour.range, types: ['x'] }),
    );
    expect(router.history.length).toBe(1);
    expect(router.state.location.state.rangeReset).toBe(true);
    expect(client.requests(ACTIVITY)).toHaveLength(1);
  });

  it(
    'polls through the router: the same bounds within the minute, new ones when it rolls',
    { timeout: 30_000 },
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-28T10:59:50.000Z'));
      const client = createTestClient(activityFixtures());
      renderAtUrl(`${ALERTS}?from=now-1h&to=now`, { client });
      await screen.findAllByText('Alert activity');
      const bounds = () => client.requests(ACTIVITY).map(o => (o.variables as { to: string }).to);
      expect(bounds()).toHaveLength(1);
      expect(new Date(bounds()[0]).getUTCMinutes()).toBe(59);

      vi.setSystemTime(new Date('2026-09-28T11:00:05.000Z'));
      await waitFor(() => expect(bounds().length).toBeGreaterThanOrEqual(3));

      // Every poll after the roll asks for the new minute, and they all ask for the same one.
      const rolled = bounds().filter(to => new Date(to).getUTCMinutes() === 0);
      expect(rolled.length).toBeGreaterThanOrEqual(2);
      expect(new Set(rolled).size).toBe(1);
      expect(client.requests(RETENTION)).toHaveLength(1);
    },
  );
});

describe('alerts rules and detail routes', () => {
  it(
    'start their configuration documents, revalidating, and leave the state log to the page',
    { timeout: 30_000 },
    async () => {
      const rules = await loadedAt(`${ALERTS}/rules`);
      expect(
        rules.client
          .requests('TargetAlertsRulesPage_Query')
          .map(o => [o.variables, o.context.requestPolicy]),
      ).toEqual([[SLUGS, 'cache-and-network']]);

      const detail = await loadedAt(`${ALERTS}/rule-1`);
      expect(
        detail.client
          .requests('TargetAlertsDetailPage_RuleConfigQuery')
          .map(o => [o.variables, o.context.requestPolicy]),
      ).toEqual([[{ ...SLUGS, ruleId: 'rule-1' }, 'cache-and-network']]);
      expect(detail.client.seen).not.toContain('TargetAlertsDetailPage_StateLogQuery');
    },
  );
});

describe('alerts create route', () => {
  it(
    'starts the cap, channels and saved filters documents with the form variables',
    { timeout: 30_000 },
    async () => {
      const { client } = await loadedAt(`${ALERTS}/create`);
      const variables = (name: string) =>
        client.requests(name).map(operation => operation.variables);

      expect(variables('TargetAlertsCreatePage_CapQuery')).toEqual([SLUGS]);
      expect(variables('AlertForm_ChannelsQuery')).toEqual([
        { organizationSlug: SLUGS.organizationSlug, projectSlug: SLUGS.projectSlug },
      ]);
      expect(variables('AlertForm_SavedFiltersQuery')).toEqual([SLUGS]);
    },
  );
});
