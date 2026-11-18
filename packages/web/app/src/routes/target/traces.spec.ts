// @vitest-environment jsdom
import { presetLast7Days } from '@/components/ui/date-range-picker';
import { loaderPeriod } from '@/lib/hooks/use-date-range-controller';
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { tracesFixtures } from '@/lib/testing/fixtures/traces';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { defaultTracesSort, tracesPageVariables } from '@/pages/target-traces';
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

// ECharts never sizes under jsdom, so the chart is stood in for to reach its range handler.
const chart = vi.hoisted(() => ({
  onRangeSelect: undefined as ((range: { from: Date; to: Date }) => void) | undefined,
}));
vi.mock('@/components/ui/primitives/chart/time-series-chart', () => ({
  TimeSeriesChart: (props: { onRangeSelect?: typeof chart.onRangeSelect }) => {
    chart.onRangeSelect = props.onRangeSelect;
    return null;
  },
}));

const TARGET = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}`;
const TRACES = `${TARGET}/traces`;
const TRACE = `${TRACES}/trace-1`;
const LIST_DOCUMENT = 'TargetTracesPageQuery';
const VALUES_DOCUMENT = 'TargetTracesFilterValuesQuery';
const TRACE_DOCUMENT = 'TargetInsightsNewPageContent_TraceQuery';

async function loadedAt(url: string) {
  const client = createTestClient(layoutFixtures());
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
    urqlClient: client,
  });
  await router.load();
  return { client, router };
}

describe('traces route', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it(
    'sends a bare URL to the last week and starts the list, revalidating, with the default filter and sort',
    { timeout: 30_000 },
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-28T10:59:50.000Z'));
      const { client, router } = await loadedAt(TRACES);
      await waitFor(() => expect(router.state.location.search).toEqual(presetLast7Days.range));

      const { period } = loaderPeriod(
        presetLast7Days.range,
        presetLast7Days,
        new UTCDate('2026-09-28T10:59:50.000Z'),
      );
      expect(
        client.requests(LIST_DOCUMENT).map(o => [o.variables, o.context.requestPolicy]),
      ).toEqual([[tracesPageVariables(SLUGS, {}, defaultTracesSort, period), 'cache-and-network']]);
    },
  );

  it(
    'resets a range older than the rollups keep, as a retention reset',
    { timeout: 30_000 },
    async () => {
      const { router } = await loadedAt(`${TRACES}?from=now-2y&to=now`);

      await waitFor(() => expect(router.state.location.search).toEqual(presetLast7Days.range));
      expect(router.state.location.state.rangeReset).toBe('retention');
    },
  );

  it('a row link follows the picker', { timeout: 30_000 }, async () => {
    const client = createTestClient(new Map([...layoutFixtures(), ...tracesFixtures()]));
    const { router } = renderAtUrl(`${TRACES}?from=now-1d&to=now`, { client });
    const rowHref = () => screen.getByRole('link', { name: 'trace-1' }).getAttribute('href') ?? '';
    await screen.findByRole('link', { name: 'trace-1' });
    expect(rowHref()).toContain('now-1d');

    fireEvent.click(await screen.findByRole('button', { name: 'Last 24 hours' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Last 7 days' }));

    await waitFor(() => expect(router.state.location.search).toMatchObject({ from: 'now-7d' }));
    await waitFor(() => expect(rowHref()).toContain('now-7d'));
  });

  it(
    'a drag across the chart sets the range and keeps the filter',
    { timeout: 30_000 },
    async () => {
      const client = createTestClient(new Map([...layoutFixtures(), ...tracesFixtures()]));
      const { router } = renderAtUrl(
        `${TRACES}?from=now-7d&to=now&operationNames=${encodeURIComponent(JSON.stringify(['GetUser']))}`,
        { client },
      );
      await waitFor(() => expect(chart.onRangeSelect).toBeDefined());

      chart.onRangeSelect!({
        from: new Date('2026-09-25T10:00:00.000Z'),
        to: new Date('2026-09-25T14:00:00.000Z'),
      });

      await waitFor(() =>
        expect(router.state.location.search).toMatchObject({
          from: '2026-09-25T10:00:00.000Z',
          to: '2026-09-25T14:00:00.000Z',
          operationNames: ['GetUser'],
        }),
      );
    },
  );

  it('carries the filter and sort from the URL into the list', { timeout: 30_000 }, async () => {
    const json = (value: unknown) => encodeURIComponent(JSON.stringify(value));
    const search = [
      'from=now-1d&to=now',
      `operationNames=${json(['GetUser'])}`,
      `operationTypes=${json(['query', 'unknown'])}`,
      'status=error',
      'durationMin=10&durationMax=20',
      `sort=${json({ id: 'duration', desc: false })}`,
    ].join('&');
    const { client } = await loadedAt(`${TRACES}?${search}`);

    expect(client.requests(LIST_DOCUMENT)[0]?.variables).toMatchObject({
      filter: {
        operationNames: ['GetUser'],
        operationTypes: ['QUERY', null],
        success: [false],
        duration: { min: 10, max: 20 },
      },
      sort: { sort: 'DURATION', direction: 'ASC' },
      first: 50,
    });
  });

  it(
    'ignores an unreadable filter param instead of failing the route',
    { timeout: 30_000 },
    async () => {
      const { client, router } = await loadedAt(
        `${TRACES}?from=now-1d&to=now&status=maybe&operationNames=${encodeURIComponent(JSON.stringify(['GetUser']))}`,
      );

      expect(router.state.location.pathname).toBe(TRACES);
      expect(client.requests(LIST_DOCUMENT)[0]?.variables).toMatchObject({
        filter: { operationNames: ['GetUser'], success: [] },
      });
    },
  );
});

describe('traces filter values', () => {
  const RANGE = `${TRACES}?from=now-1d&to=now`;

  function rendered(url: string) {
    const client = createTestClient(new Map([...layoutFixtures(), ...tracesFixtures()]));
    const { router } = renderAtUrl(url, { client });
    const count = (name: string) => client.requests(name).length;
    const navigateSearch = (next: Record<string, unknown>) =>
      router.navigate({
        to: router.state.location.pathname,
        search: { ...router.state.location.search, ...next },
      });
    return { client, router, count, navigateSearch };
  }

  it(
    'starts the filter values for the period alone, cache-first',
    { timeout: 30_000 },
    async () => {
      const { client } = await loadedAt(`${RANGE}&status=error&operationNames=%5B%22GetUser%22%5D`);

      const [values] = client.requests(VALUES_DOCUMENT);
      const listPeriod = (client.requests(LIST_DOCUMENT)[0]?.variables as any).filter.period;
      expect(values?.variables).toEqual({ targetRef: SLUGS, period: listPeriod });
      expect(values?.context.requestPolicy).toBe('cache-first');
    },
  );

  it('does not refetch filter values when a filter changes', { timeout: 30_000 }, async () => {
    const { count, navigateSearch } = rendered(RANGE);
    await screen.findByRole('link', { name: 'trace-1' });

    await navigateSearch({ status: 'error' });

    await waitFor(() => expect(count(LIST_DOCUMENT)).toBe(2));
    expect(count(VALUES_DOCUMENT)).toBe(1);
  });

  it('refetches filter values when the range changes', { timeout: 30_000 }, async () => {
    const { count, navigateSearch } = rendered(RANGE);
    await screen.findByRole('link', { name: 'trace-1' });

    await navigateSearch({ from: 'now-7d' });

    await waitFor(() => expect(count(VALUES_DOCUMENT)).toBe(2));
  });

  it(
    'shows the filter row with a chip per URL filter, and clears them',
    { timeout: 30_000 },
    async () => {
      const { router } = rendered(
        `${RANGE}&durationMin=100&operationNames=%5B%22DoesNotExist%22%5D`,
      );

      expect(await screen.findByRole('button', { name: 'Filter' })).toBeTruthy();
      expect(screen.getByRole('group', { name: 'Duration filter' })).toBeTruthy();
      expect(screen.getByRole('group', { name: 'Operation name filter' })).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
      await waitFor(() =>
        expect(router.state.location.search).toEqual({ from: 'now-1d', to: 'now' }),
      );
    },
  );
});

describe('trace route', () => {
  it(
    'starts the trace document with the page variables before rendering',
    { timeout: 30_000 },
    async () => {
      const client = createTestClient(layoutFixtures());
      const router = createAppRouter({
        history: createMemoryHistory({ initialEntries: [TRACE] }),
        urqlClient: client,
      });
      await router.load();

      expect(client.requests(TRACE_DOCUMENT).map(operation => operation.variables)).toEqual([
        { targetSelector: SLUGS, traceId: 'trace-1' },
      ]);
    },
  );

  it(
    'shows the error when the trace request fails, not "not found"',
    { timeout: 30_000 },
    async () => {
      const client = createTestClient(layoutFixtures());
      client.fixtures.set(TRACE_DOCUMENT, new Error('the server is away'));
      renderAtUrl(TRACE, { client });

      await screen.findByText('Oops, something went wrong.');
      expect(screen.queryByText('Trace not found.')).toBeNull();
    },
  );

  it('carries the range it arrived with back to the list', { timeout: 30_000 }, async () => {
    const client = createTestClient(layoutFixtures());
    client.fixtures.set(TRACE_DOCUMENT, {
      __typename: 'Query',
      target: { __typename: 'Target', id: 'target-1', trace: null },
    });
    renderAtUrl(`${TRACE}?from=now-1d&to=now`, { client });

    // The nav item and the breadcrumb; both carry it.
    const links = await screen.findAllByRole('link', { name: 'Traces' });
    expect(links).toHaveLength(2);
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(new URL(href, 'http://localhost').searchParams.get('from')).toContain('now-1d');
    }
  });

  it('shows "not found" for a trace the server does not have', { timeout: 30_000 }, async () => {
    const client = createTestClient(layoutFixtures());
    client.fixtures.set(TRACE_DOCUMENT, {
      __typename: 'Query',
      target: { __typename: 'Target', id: 'target-1', trace: null },
    });
    renderAtUrl(TRACE, { client });

    await screen.findByText('Trace not found.');
    expect(client.requests(TRACE_DOCUMENT)).toHaveLength(1);
  });
});
