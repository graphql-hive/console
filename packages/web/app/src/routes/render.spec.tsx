// @vitest-environment jsdom
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { screen, waitFor, within } from '@testing-library/react';

// The tree imports every page; these stand in for what cannot load under jsdom.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);

// A signed-in session without SuperTokens: the wrappers pass through and the session exists.
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

// The layout queries are answered; every other query stays in flight, so pages show their loading
// branch and the chrome around them is what gets asserted.
const client = vi.hoisted(() => ({ current: null as null | ReturnType<typeof createTestClient> }));
vi.mock('@/lib/urql', () => ({
  get urqlClient() {
    return client.current;
  },
}));

const TARGET = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}`;
const PROJECT = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}`;
const ORGANIZATION = `/${SLUGS.organizationSlug}`;

/** Every URL the chrome is asserted on, with the secondary item that must be current there. */
const pages: Array<{ url: string; current: string }> = [
  { url: ORGANIZATION, current: 'Overview' },
  { url: `${ORGANIZATION}?search=gate&sortBy=name`, current: 'Overview' },
  { url: `${ORGANIZATION}/view/members`, current: 'Members' },
  { url: `${ORGANIZATION}/view/settings`, current: 'Settings' },
  { url: `${ORGANIZATION}/view/support`, current: 'Support' },
  { url: `${ORGANIZATION}/view/support/ticket/ticket-1`, current: 'Support' },
  // The subscription pages redirect to the overview while Stripe is disabled, as it is here.
  { url: PROJECT, current: 'Targets' },
  { url: `${PROJECT}/view/alerts`, current: 'Alerts' },
  { url: `${PROJECT}/view/settings`, current: 'Settings' },
  { url: TARGET, current: 'Schema' },
  { url: `${TARGET}?service=users`, current: 'Schema' },
  { url: `${TARGET}/checks`, current: 'Checks' },
  { url: `${TARGET}/checks/check-1`, current: 'Checks' },
  { url: `${TARGET}/explorer/unused`, current: 'Explorer' },
  { url: `${TARGET}/insights`, current: 'Insights' },
  { url: `${TARGET}/apps`, current: 'Apps' },
  { url: `${TARGET}/alerts/rules`, current: 'Alerts' },
  { url: `${TARGET}/settings`, current: 'Settings' },
];

describe('chrome at every page', () => {
  beforeEach(() => {
    client.current = createTestClient(layoutFixtures());
  });

  // The header is owned by the layout route, so moving between sibling pages keeps the same DOM
  // node; a remount would create a new one.
  it('keeps the organization layout mounted across its pages', { timeout: 30_000 }, async () => {
    const { router } = renderAtUrl(ORGANIZATION);
    const header = await screen.findByRole('banner');
    await router.navigate({ to: '/$organizationSlug/view/members', params: SLUGS });
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`${ORGANIZATION}/view/members`),
    );
    await screen.findByRole('link', { name: 'Members', current: 'page' });
    expect(screen.getByRole('banner')).toBe(header);
  });

  for (const page of pages) {
    it(`${page.url}: one secondary nav, ${page.current} current`, { timeout: 30_000 }, async () => {
      renderAtUrl(page.url);

      await waitFor(() =>
        expect(document.querySelectorAll('nav[aria-label="Secondary"]')).toHaveLength(1),
      );
      // Scoped to the secondary nav: the header's selector links prefix every URL too.
      const nav = screen.getByRole('navigation', { name: 'Secondary' });
      const current = within(nav)
        .getAllByRole('link')
        .filter(link => link.getAttribute('aria-current') === 'page')
        .map(link => link.textContent);
      expect(current).toEqual([page.current]);
      expect(screen.queryByText('Oops, something went wrong.')).toBeNull();
      expect(screen.queryByText('Page Not Found')).toBeNull();
    });
  }
});
