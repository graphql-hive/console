// @vitest-environment jsdom
import { PersonalAccessTokensTable_MoreAccessTokensQuery } from '@/components/organization/settings/personal-access-tokens/personal-access-tokens-table';
import { DeliveryEvent } from '@/gql/graphql';
import { layoutFixtures, organizationLayout, SLUGS } from '@/lib/testing/fixtures/layouts';
import { organizationSettings } from '@/lib/testing/fixtures/organization-settings';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { createAppRouter } from '@/router';
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
vi.mock('@/lib/auth/session', () => import('@/lib/testing/mocks/auth-session'));
// Polls every 200 ms here, so a spec sees a few ticks with real timers.
vi.mock('@/components/organization/settings/emails/email-polling', () => ({
  EMAIL_DELIVERIES_POLL_INTERVAL_MS: 200,
}));

const SETTINGS = `/${SLUGS.organizationSlug}/view/settings`;
const SLUG = { organizationSlug: SLUGS.organizationSlug };
const PAGE = 'OrganizationSettingsPageQuery';

type TestClient = ReturnType<typeof createTestClient>;

async function loadedAt(url: string, settings = organizationSettings(), layout?: unknown) {
  const client = createTestClient(layoutFixtures());
  client.fixtures.set(PAGE, settings);
  if (layout) {
    client.fixtures.set('OrganizationLayoutQuery', layout);
  }
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
    urqlClient: client,
  });
  await router.load();
  return { client, router };
}

// A revalidating request whose organization the layout already cached is a partial hit, which
// graphcache forwards as network-only.
function expectRevalidating(client: TestClient, name: string) {
  const policies = client.requests(name).map(o => o.context.requestPolicy);
  expect(policies).toHaveLength(1);
  expect(['cache-and-network', 'network-only']).toContain(policies[0]);
}

const EVERY_EMAIL_KIND = [
  DeliveryEvent.OrganizationInvitation,
  DeliveryEvent.OrganizationOwnershipTransfer,
  DeliveryEvent.AuditLogExport,
  DeliveryEvent.UsageRateLimitWarning,
  DeliveryEvent.UsageRateLimitExceeded,
];

function emailDeliveriesPage(
  visibility: { events: DeliveryEvent[]; isLimited: boolean } = {
    events: EVERY_EMAIL_KIND,
    isLimited: false,
  },
) {
  return {
    __typename: 'Query',
    organization: {
      __typename: 'Organization',
      id: 'organization-1',
      viewerEmailDeliveryVisibility: { __typename: 'EmailDeliveryVisibility', ...visibility },
      emailDeliveryStats: null,
      emailDeliveryHealth: null,
      emailDeliveryLog: null,
    },
  };
}

const SECTIONS = [
  ['sso', 'SingleSignOnSubpageQuery'],
  ['access-tokens', 'AccessTokensSubPage_OrganizationQuery'],
  ['personal-access-tokens', 'PersonalAccessTokensSubPage_OrganizationQuery'],
] as const;

describe('organization settings loaders', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(SECTIONS)(
    '%s loads the page document once and starts its own, revalidating',
    { timeout: 30_000 },
    async (section, document) => {
      const { client } = await loadedAt(`${SETTINGS}/${section}`);

      expect(client.requests(PAGE).map(o => o.variables)).toEqual([SLUG]);
      expect(client.requests(document).map(o => o.variables)).toEqual([SLUG]);
      expectRevalidating(client, document);
    },
  );

  it('loads General and Policy from the page document alone', { timeout: 30_000 }, async () => {
    const general = await loadedAt(SETTINGS);
    expect(general.client.requests(PAGE)).toHaveLength(1);
    for (const [, document] of SECTIONS) {
      expect(general.client.seen).not.toContain(document);
    }

    const policy = await loadedAt(`${SETTINGS}/policy`);
    expect(policy.client.requests(PAGE)).toHaveLength(1);
  });

  it(
    'sends a viewer who may not open a section to the first one they may, replacing the entry',
    { timeout: 30_000 },
    async () => {
      const { router } = await loadedAt(
        `${SETTINGS}/personal-access-tokens`,
        organizationSettings({ viewerCanManagePersonalAccessTokens: false }),
        organizationLayout({ viewerCanManagePersonalAccessTokens: false }),
      );

      await waitFor(() => expect(router.state.location.pathname).toBe(SETTINGS));
      expect(router.history.length).toBe(1);
    },
  );

  it(
    'opens Email Deliveries from the page document alone, and keeps a viewer without the flag out',
    { timeout: 30_000 },
    async () => {
      const allowed = await loadedAt(`${SETTINGS}/emails`);
      expect(allowed.router.state.location.pathname).toBe(`${SETTINGS}/emails`);
      expect(allowed.client.requests(PAGE)).toHaveLength(1);

      const { router } = await loadedAt(
        `${SETTINGS}/emails`,
        organizationSettings({ viewerCanSeeEmailDeliveries: false }),
        organizationLayout({ viewerCanSeeEmailDeliveries: false }),
      );
      await waitFor(() => expect(router.state.location.pathname).toBe(SETTINGS));
    },
  );

  // Only the clock is faked; timers stay real so the router, the poll and waitFor run as usual.
  it(
    'polls email deliveries on every tick, asking for the same hour-aligned window',
    { timeout: 30_000 },
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-28T15:30:00.000Z'));
      const client = createTestClient(layoutFixtures());
      client.fixtures.set(PAGE, organizationSettings());
      client.fixtures.set('EmailDeliveriesSubPage_Query', emailDeliveriesPage());
      renderAtUrl(`${SETTINGS}/emails`, { client });
      const polls = () => client.requests('EmailDeliveriesSubPage_Query');
      // The mount settles at two: the synchronous fixture answers the cache-and-network miss during
      // render, then the effect's subscription hits the cache and refetches as network-only.
      await waitFor(() => expect(polls().length).toBeGreaterThanOrEqual(1));
      const mounted = polls().length;

      vi.setSystemTime(new Date('2026-09-28T15:31:00.000Z'));
      await waitFor(() => expect(polls()).toHaveLength(mounted + 1));
      vi.setSystemTime(new Date('2026-09-28T15:32:00.000Z'));
      await waitFor(() => expect(polls()).toHaveLength(mounted + 2));

      expect(new Set(polls().map(o => JSON.stringify(o.variables))).size).toBe(1);
    },
  );

  it(
    'names the kinds of email a viewer with a limited view is shown',
    { timeout: 30_000 },
    async () => {
      const client = createTestClient(layoutFixtures());
      client.fixtures.set(PAGE, organizationSettings());
      client.fixtures.set(
        'EmailDeliveriesSubPage_Query',
        emailDeliveriesPage({
          events: [DeliveryEvent.OrganizationInvitation, DeliveryEvent.AuditLogExport],
          isLimited: true,
        }),
      );
      renderAtUrl(`${SETTINGS}/emails`, { client });

      await screen.findByText(
        /Showing only the kinds of email you have access to: invitations, audit log exports\./,
      );
    },
  );

  it('does not name the kinds for a viewer who sees every kind', { timeout: 30_000 }, async () => {
    const client = createTestClient(layoutFixtures());
    client.fixtures.set(PAGE, organizationSettings());
    client.fixtures.set('EmailDeliveriesSubPage_Query', emailDeliveriesPage());
    renderAtUrl(`${SETTINGS}/emails`, { client });

    await screen.findByText(/Details for emails Hive sent for this organization/);
    expect(screen.queryByText(/Showing only/)).toBeNull();
  });

  it('sends a viewer who may not open General to Policy', { timeout: 30_000 }, async () => {
    const { router } = await loadedAt(
      SETTINGS,
      organizationSettings({ viewerCanAccessSettings: false }),
      organizationLayout({ viewerCanAccessSettings: false }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe(`${SETTINGS}/policy`));
  });
});

describe('personal access tokens', () => {
  function tokensPage(after: string | null) {
    const nodes = after === null ? ['token-1', 'token-2'] : ['token-3'];
    return {
      __typename: 'Query',
      organization: {
        __typename: 'Organization',
        id: 'organization-1',
        me: {
          __typename: 'Member',
          id: 'member-1',
          accessTokens: {
            __typename: 'PersonalAccessTokenConnection',
            edges: nodes.map(id => ({
              __typename: 'PersonalAccessTokenEdge',
              cursor: `cursor-${id}`,
              node: {
                __typename: 'PersonalAccessToken',
                id,
                title: id,
                firstCharacters: 'hv',
                createdAt: '2026-09-27T10:00:00.000Z',
                expiresAt: null,
              },
            })),
            pageInfo: {
              __typename: 'PageInfo',
              hasNextPage: after === null,
              endCursor: after === null ? 'cursor-token-2' : null,
            },
          },
        },
      },
    };
  }

  it('merges the pages the table loads into one list', { timeout: 30_000 }, async () => {
    const client = createTestClient(
      new Map([
        [
          'PersonalAccessTokensTable_MoreAccessTokensQuery',
          (variables: { after?: string | null }) => tokensPage(variables.after ?? null),
        ],
      ]),
    );
    const query = (after: string | null, requestPolicy?: 'cache-only') =>
      client
        .query(
          PersonalAccessTokensTable_MoreAccessTokensQuery,
          { ...SLUG, after },
          { requestPolicy },
        )
        .toPromise();

    await query(null);
    await query('cursor-token-2');
    const merged = await query(null, 'cache-only');

    const connection = (
      merged.data as unknown as {
        organization: { me: { accessTokens: { edges: { node: { id: string } }[] } } };
      }
    ).organization.me.accessTokens;
    expect(connection.edges.map(edge => edge.node.id)).toEqual(['token-1', 'token-2', 'token-3']);
    expect(client.requests('PersonalAccessTokensTable_MoreAccessTokensQuery')).toHaveLength(2);
  });
});
