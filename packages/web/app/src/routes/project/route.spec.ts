// @vitest-environment jsdom
import { overviewPeriod } from '@/lib/overview-period';
import { layoutFixtures, projectLayout, SLUGS } from '@/lib/testing/fixtures/layouts';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { createAppRouter } from '@/router';
import { UTCDate } from '@date-fns/utc';
import { createMemoryHistory } from '@tanstack/react-router';
import { waitFor } from '@testing-library/react';

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
vi.mock('@/components/project/alerts/channel-polling', () => ({
  CHANNEL_DELIVERIES_POLL_INTERVAL_MS: 200,
}));

const PROJECT = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}`;
const PROJECT_SLUGS = { organizationSlug: SLUGS.organizationSlug, projectSlug: SLUGS.projectSlug };
const NOW = '2026-09-28T15:30:00.000Z';

type TestClient = ReturnType<typeof createTestClient>;

async function loadedAt(url: string, fixtures = layoutFixtures()) {
  const client = createTestClient(fixtures);
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
    urqlClient: client,
  });
  await router.load();
  return { client, router };
}

function requestsOf(client: TestClient, name: string) {
  return client.requests(name).map(o => [o.variables, o.context.requestPolicy]);
}

/** The channel route's own document and the page's deliveries document, both answering channel-1. */
function channelFixtures() {
  const fixtures = layoutFixtures();
  const channel = {
    __typename: 'AlertWebhookChannel',
    id: 'channel-1',
    disabledAt: null,
    disabledBy: null,
    deliveryHealth: null,
  };
  fixtures.set('ProjectAlertChannelPage_ChannelQuery', {
    __typename: 'Query',
    project: {
      __typename: 'Project',
      id: 'project-1',
      alertChannel: {
        ...channel,
        name: 'Ops',
        type: 'WEBHOOK',
        endpoint: 'https://example.com/hook',
      },
      targets: { __typename: 'TargetConnection', edges: [] },
    },
  });
  fixtures.set('ProjectAlertChannelPage_DeliveriesQuery', {
    __typename: 'Query',
    project: {
      __typename: 'Project',
      id: 'project-1',
      alertChannel: { ...channel, deliveryStats: null, deliveryLog: null },
    },
  });
  return fixtures;
}

describe('project overview route', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts the targets with the 14-day window, revalidating', { timeout: 30_000 }, async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    const { client } = await loadedAt(PROJECT);

    const { period, resolution } = overviewPeriod(new UTCDate(NOW));
    const [[variables, policy]] = requestsOf(client, 'ProjectOverviewPageQuery');
    expect(variables).toEqual({ ...PROJECT_SLUGS, chartResolution: resolution, period });
    expect(['cache-and-network', 'network-only']).toContain(policy);
  });

  it('asks for a week on a plan that keeps a week', { timeout: 30_000 }, async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    const fixtures = layoutFixtures();
    fixtures.set('ProjectLayoutQuery', projectLayout({}, { usageRetentionInDays: 7 }));
    const { client } = await loadedAt(PROJECT, fixtures);

    const { period } = overviewPeriod(new UTCDate(NOW), 7);
    const [[variables]] = requestsOf(client, 'ProjectOverviewPageQuery');
    expect(variables).toEqual({ ...PROJECT_SLUGS, chartResolution: 7, period });
  });
});

describe('project alerts route', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts the page read-once beside the gate', { timeout: 30_000 }, async () => {
    const { client, router } = await loadedAt(`${PROJECT}/view/alerts`);

    expect(router.state.location.pathname).toBe(`${PROJECT}/view/alerts`);
    expect(requestsOf(client, 'ProjectAlertsPageQuery')).toEqual([[PROJECT_SLUGS, 'cache-first']]);
    expect(client.requests('ProjectLayoutQuery')).toHaveLength(1);
  });

  it(
    'starts the channel page revalidating the channel beside the gate, leaving deliveries to the page',
    { timeout: 30_000 },
    async () => {
      const { client, router } = await loadedAt(`${PROJECT}/view/alerts/channels/channel-1`);

      expect(router.state.location.pathname).toBe(`${PROJECT}/view/alerts/channels/channel-1`);
      const [[variables, policy]] = requestsOf(client, 'ProjectAlertChannelPage_ChannelQuery');
      expect(variables).toEqual({ ...PROJECT_SLUGS, channelId: 'channel-1' });
      expect(['cache-and-network', 'network-only']).toContain(policy);
      expect(client.seen).not.toContain('ProjectAlertChannelPage_DeliveriesQuery');
      expect(client.requests('ProjectLayoutQuery')).toHaveLength(1);
    },
  );

  // Only the clock is faked; timers stay real so the router, the poll and waitFor run as usual.
  it(
    'polls deliveries on every tick, asking for the same hour-aligned window',
    { timeout: 30_000 },
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-28T15:30:00.000Z'));
      const client = createTestClient(channelFixtures());
      renderAtUrl(`${PROJECT}/view/alerts/channels/channel-1`, { client });
      const polls = () => client.requests('ProjectAlertChannelPage_DeliveriesQuery');
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

  it.each([`${PROJECT}/view/alerts`, `${PROJECT}/view/alerts/channels/channel-1`])(
    'sends a viewer who may not modify alerts from %s to the project',
    { timeout: 30_000 },
    async url => {
      const fixtures = layoutFixtures();
      fixtures.set('ProjectLayoutQuery', projectLayout({ viewerCanModifyAlerts: false }));
      const { router } = await loadedAt(url, fixtures);

      await waitFor(() => expect(router.state.location.pathname).toBe(PROJECT));
      expect(router.history.length).toBe(1);
    },
  );
});
