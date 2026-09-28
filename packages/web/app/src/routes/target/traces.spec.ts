// @vitest-environment jsdom
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { createAppRouter } from '@/router';
import { createMemoryHistory } from '@tanstack/react-router';
import { screen } from '@testing-library/react';

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
vi.mock('react-virtualized-auto-sizer', () => import('@/lib/testing/mocks/auto-sizer'));
vi.mock('supertokens-auth-react', () => import('@/lib/testing/mocks/supertokens'));
vi.mock('supertokens-auth-react/recipe/session', () => import('@/lib/testing/mocks/session'));

const TARGET = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}`;
const TRACE = `${TARGET}/traces/trace-1`;
const TRACE_DOCUMENT = 'TargetInsightsNewPageContent_TraceQuery';

describe('trace route', () => {
  it('starts the trace document with the page variables before rendering', { timeout: 30_000 }, async () => {
    const client = createTestClient(layoutFixtures());
    const router = createAppRouter({
      history: createMemoryHistory({ initialEntries: [TRACE] }),
      urqlClient: client,
    });
    await router.load();

    expect(client.requests(TRACE_DOCUMENT).map(operation => operation.variables)).toEqual([
      { targetSelector: SLUGS, traceId: 'trace-1' },
    ]);
  });

  it('shows the error when the trace request fails, not "not found"', { timeout: 30_000 }, async () => {
    const client = createTestClient(layoutFixtures());
    client.fixtures.set(TRACE_DOCUMENT, new Error('the server is away'));
    renderAtUrl(TRACE, { client });

    await screen.findByText('Oops, something went wrong.');
    expect(screen.queryByText('Trace not found.')).toBeNull();
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
