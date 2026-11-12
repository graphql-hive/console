// @vitest-environment jsdom
import { loaderPeriod } from '@/lib/hooks/use-date-range-controller';
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { presetLast1Hour } from '@/pages/target-alerts-activity';
import { createAppRouter } from '@/router';
import { UTCDate } from '@date-fns/utc';
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
vi.mock('@/lib/auth/session', () => import('@/lib/testing/mocks/auth-session'));
// Polls every 200 ms here, so a spec sees a few ticks with real timers.
vi.mock('@/components/target/alerts/alert-polling', () => ({ ALERTS_POLL_INTERVAL_MS: 200 }));
// Stripe is off unless a case turns it on; the picker's retention note needs it.
const stripe = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/lib/billing/stripe-public-key', () => ({
  getStripePublicKey: () => (stripe.enabled ? 'pk_test' : null),
  getIsStripeEnabled: () => stripe.enabled,
}));

const ALERTS = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}/alerts`;
const ACTIVITY = 'TargetAlertsActivityPage_Query';
const RETENTION = 'TargetAlertsActivityPage_RetentionQuery';
const TARGET_NODE = { __typename: 'Target', id: 'target-1' };

function activityFixtures(metricAlertStateLogRetentionDays = 30) {
  return new Map<string, unknown>([
    ...layoutFixtures(),
    [
      RETENTION,
      { __typename: 'Query', target: { ...TARGET_NODE, metricAlertStateLogRetentionDays } },
    ],
    [ACTIVITY, { __typename: 'Query', target: { ...TARGET_NODE, metricAlertRuleStateLog: [] } }],
  ]);
}

async function loadedWith(fixtures: Map<string, unknown>, url: string) {
  const client = createTestClient(fixtures);
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
    urqlClient: client,
  });
  await router.load();
  return { client, router };
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

/** The detail route's rule document and the page's state log document, both answering rule-1. */
function ruleFixtures() {
  const fixtures = layoutFixtures();
  fixtures.set('TargetAlertsDetailPage_RuleConfigQuery', {
    __typename: 'Query',
    target: {
      ...TARGET_NODE,
      metricAlertRule: {
        __typename: 'MetricAlertRule',
        id: 'rule-1',
        name: 'Error rate',
        type: 'ERROR_RATE',
        metric: null,
        severity: 'CRITICAL',
        state: 'NORMAL',
        enabled: true,
        timeWindowMinutes: 5,
        thresholdType: 'FIXED_VALUE',
        thresholdValue: 5,
        direction: 'ABOVE',
        confirmationMinutes: 0,
        channels: [],
        savedFilter: null,
        createdAt: '2026-09-27T10:00:00.000Z',
        updatedAt: '2026-09-27T10:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      },
    },
  });
  fixtures.set('TargetAlertsDetailPage_StateLogQuery', {
    __typename: 'Query',
    target: {
      ...TARGET_NODE,
      metricAlertRule: {
        __typename: 'MetricAlertRule',
        id: 'rule-1',
        lastEvaluatedAt: null,
        stateAt: 'NORMAL',
        stateLog: [],
      },
      operationsStats: null,
    },
  });
  return fixtures;
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
      // A plan change moves the log retention, so every visit asks again.
      expect(['cache-and-network', 'network-only']).toContain(
        client.requests(RETENTION)[0].context.requestPolicy,
      );
      expect(client.requests(ACTIVITY).map(o => [o.variables, o.context.requestPolicy])).toEqual([
        [{ ...SLUGS, from: period.from, to: period.to }, 'cache-and-network'],
      ]);
    },
  );

  it('the picker names the log retention, not the usage one', { timeout: 30_000 }, async () => {
    stripe.enabled = true;
    try {
      renderAtUrl(`${ALERTS}?from=now-1h&to=now`, { client: createTestClient(activityFixtures()) });
      fireEvent.click(await screen.findByRole('button', { name: 'Last 1 hour' }));

      await screen.findByText(/Your Hobby plan keeps the last 30 days of alert activity\./);
    } finally {
      stripe.enabled = false;
    }
  });

  it(
    'keeps a range within the log retention and resets one past it',
    { timeout: 30_000 },
    async () => {
      const kept = await loadedWith(activityFixtures(30), `${ALERTS}?from=now-14d&to=now`);
      expect(kept.router.state.location.search).toEqual({ from: 'now-14d', to: 'now' });
      expect(kept.router.state.location.state.rangeReset).toBeUndefined();

      const reset = await loadedWith(
        activityFixtures(7),
        `${ALERTS}?from=now-14d&to=now&types=["x"]`,
      );
      await waitFor(() =>
        expect(reset.router.state.location.search).toEqual({
          ...presetLast1Hour.range,
          types: ['x'],
        }),
      );
      expect(reset.router.history.length).toBe(1);
      expect(reset.router.state.location.state.rangeReset).toBe('retention');
    },
  );

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
  afterEach(() => {
    vi.useRealTimers();
  });

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

  // Only the clock is faked; timers stay real so the router, the poll and waitFor run as usual.
  it(
    'polls the state log on every tick, asking for the same minute-aligned window',
    { timeout: 30_000 },
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-28T15:30:00.000Z'));
      const client = createTestClient(ruleFixtures());
      renderAtUrl(`${ALERTS}/rule-1`, { client });
      const polls = () => client.requests('TargetAlertsDetailPage_StateLogQuery');
      // The mount settles at two: the synchronous fixture answers the cache-and-network miss during
      // render, then the effect's subscription hits the cache and refetches as network-only.
      await waitFor(() => expect(polls().length).toBeGreaterThanOrEqual(1));
      const mounted = polls().length;

      vi.setSystemTime(new Date('2026-09-28T15:30:15.000Z'));
      await waitFor(() => expect(polls()).toHaveLength(mounted + 1));
      vi.setSystemTime(new Date('2026-09-28T15:30:30.000Z'));
      await waitFor(() => expect(polls()).toHaveLength(mounted + 2));

      expect(new Set(polls().map(o => JSON.stringify(o.variables))).size).toBe(1);
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
