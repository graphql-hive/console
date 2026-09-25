// @vitest-environment jsdom
import { type ReactNode } from 'react';
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { organizationMembers } from '@/lib/testing/fixtures/organization-members';
import { organizationSettings } from '@/lib/testing/fixtures/organization-settings';
import { projectSettings } from '@/lib/testing/fixtures/project-settings';
import { targetSettings } from '@/lib/testing/fixtures/target-settings';
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
// The lazily loaded schema editor resolves to Monaco, which has no DOM to mount into here.
vi.mock('@/components/schema-editor', async importOriginal => ({
  ...(await importOriginal<typeof import('@/components/schema-editor')>()),
  SchemaEditor: () => null,
}));

// A signed-in session without SuperTokens: the wrappers pass through and the session exists.
vi.mock('supertokens-auth-react', async importOriginal => ({
  ...(await importOriginal<typeof import('supertokens-auth-react')>()),
  default: { init: () => {} },
  SuperTokensWrapper: (props: { children: ReactNode }) => props.children,
}));
// The OIDC interstitial redirects away unless the provider is on.
vi.mock('@/lib/supertokens/thirdparty', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/supertokens/thirdparty')>()),
  isProviderEnabled: () => true,
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
const client = { current: null as null | ReturnType<typeof createTestClient> };
const at = (url: string) => renderAtUrl(url, { client: client.current! });

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
  { url: `${TARGET}/history`, current: 'History' },
  { url: `${TARGET}/history/version-42`, current: 'History' },
  { url: `${TARGET}/insights/manage-filters`, current: 'Insights' },
  { url: `${TARGET}/insights/schema-coordinate/Query.me`, current: 'Insights' },
  { url: `${TARGET}/insights/client/web`, current: 'Insights' },
  { url: `${TARGET}/insights/GetUser/abc123`, current: 'Insights' },
  { url: `${TARGET}/traces`, current: 'Traces' },
  { url: `${TARGET}/traces/trace-1`, current: 'Traces' },
  { url: `${TARGET}/explorer`, current: 'Explorer' },
  { url: `${TARGET}/explorer/deprecated`, current: 'Explorer' },
  { url: `${TARGET}/explorer/User`, current: 'Explorer' },
  { url: `${TARGET}/checks/check-1/affected-deployments`, current: 'Checks' },
  { url: `${TARGET}/apps/app/1.0.0`, current: 'Apps' },
  { url: `${TARGET}/laboratory`, current: 'Laboratory' },
  { url: `${TARGET}/proposals`, current: 'Proposals' },
  { url: `${TARGET}/proposals/new`, current: 'Proposals' },
  { url: `${TARGET}/proposals/proposal-1`, current: 'Proposals' },
  { url: `${TARGET}/alerts`, current: 'Alerts' },
  { url: `${TARGET}/alerts/rules`, current: 'Alerts' },
  { url: `${TARGET}/alerts/activity`, current: 'Alerts' },
  { url: `${TARGET}/alerts/create`, current: 'Alerts' },
  { url: `${TARGET}/alerts/rule-1`, current: 'Alerts' },
  { url: `${TARGET}/settings`, current: 'Settings' },
];

describe('chrome at every page', () => {
  beforeEach(() => {
    client.current = createTestClient(layoutFixtures());
    // The laboratory greets a first visit with a modal, which hides the chrome from role queries.
    localStorage.setItem('hive:laboratory:welcome-dialog-shown', 'true');
  });

  // The header is owned by the layout route, so moving between sibling pages keeps the same DOM
  // node; a remount would create a new one.
  it('keeps the organization layout mounted across its pages', { timeout: 30_000 }, async () => {
    const { router } = at(ORGANIZATION);
    const header = await screen.findByRole('banner');
    await router.navigate({
      to: '/$organizationSlug/view/members',
      params: { organizationSlug: SLUGS.organizationSlug },
      search: { page: 'list' },
    });
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`${ORGANIZATION}/view/members`),
    );
    await screen.findByRole('link', { name: 'Members', current: 'page' });
    expect(screen.getByRole('banner')).toBe(header);
  });

  it('keeps the target layout mounted across its pages', { timeout: 30_000 }, async () => {
    const { router } = at(`${TARGET}/checks`);
    const header = await screen.findByRole('banner');
    await router.navigate({
      to: '/$organizationSlug/$projectSlug/$targetSlug/insights',
      params: SLUGS,
      search: {},
    });
    await screen.findByRole('link', { name: 'Insights', current: 'page' });
    expect(screen.getByRole('banner')).toBe(header);
  });

  it('sends the bare history URL to the latest version', { timeout: 30_000 }, async () => {
    client.current!.fixtures.set('TargetHistoryLatestVersionQuery', {
      organization: {
        id: 'org-1',
        project: {
          id: 'project-1',
          target: { id: 'target-1', latestSchemaVersion: { id: 'version-42' } },
        },
      },
    });
    const { router } = at(`${TARGET}/history`);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`${TARGET}/history/version-42`),
    );
    expect(router.history.length).toBe(1);
  });

  it('keeps the project layout mounted across its pages', { timeout: 30_000 }, async () => {
    const { router } = at(PROJECT);
    const header = await screen.findByRole('banner');
    await router.navigate({
      to: '/$organizationSlug/$projectSlug/view/alerts',
      params: { organizationSlug: SLUGS.organizationSlug, projectSlug: SLUGS.projectSlug },
    });
    await screen.findByRole('link', { name: 'Alerts', current: 'page' });
    expect(screen.getByRole('banner')).toBe(header);
  });

  it('keeps the header mounted across levels', { timeout: 30_000 }, async () => {
    const { router } = at(TARGET);
    const header = await screen.findByRole('banner');
    await router.navigate({
      to: '/$organizationSlug/$projectSlug',
      params: { organizationSlug: SLUGS.organizationSlug, projectSlug: SLUGS.projectSlug },
    });
    await screen.findByRole('link', { name: 'Targets', current: 'page' });
    await router.navigate({
      to: '/$organizationSlug',
      params: { organizationSlug: SLUGS.organizationSlug },
    });
    await screen.findByRole('link', { name: 'Overview', current: 'page' });
    expect(screen.getByRole('banner')).toBe(header);
  });

  it('renders the header on the OIDC interstitial', { timeout: 30_000 }, async () => {
    at(`${ORGANIZATION}/oidc-request?id=oidc-1&redirectToPath=%2F`);
    await screen.findByRole('banner');
    expect(screen.getByRole('combobox', { name: /organization/i })).toBeTruthy();
  });

  // The viewer is one request per session; each level fetches only its entity document.
  it('loads the viewer once for the session', { timeout: 30_000 }, async () => {
    const { router } = at(TARGET);
    await screen.findByRole('banner');
    await router.navigate({
      to: '/$organizationSlug/$projectSlug',
      params: { organizationSlug: SLUGS.organizationSlug, projectSlug: SLUGS.projectSlug },
    });
    await screen.findByRole('link', { name: 'Targets', current: 'page' });
    await router.navigate({
      to: '/$organizationSlug',
      params: { organizationSlug: SLUGS.organizationSlug },
    });
    await screen.findByRole('link', { name: 'Overview', current: 'page' });

    const seen = client.current!.seen;
    expect(seen.filter(name => name === 'ViewerQuery')).toHaveLength(1);
    expect(seen).toContain('ProjectLayoutQuery');
    expect(seen).toContain('OrganizationLayoutQuery');
  });

  it('shows the user menu for the current organization', { timeout: 30_000 }, async () => {
    at(ORGANIZATION);
    // The trigger pulses until the current organization is known.
    await waitFor(() =>
      expect(document.querySelector('[data-cy="user-menu-trigger"]')?.className).not.toContain(
        'animate-pulse',
      ),
    );
  });

  it('renders a missing page inside the chrome, not over it', { timeout: 30_000 }, async () => {
    at(`${TARGET}/nope`);
    const heading = await screen.findByText('Page Not Found');
    expect(screen.getByRole('navigation', { name: 'Secondary' })).toBeTruthy();
    // `h-screen` here would push the 404 a header's height past the bottom of the window.
    expect(heading.closest('.h-screen')).toBeNull();
  });

  for (const page of pages) {
    it(`${page.url}: one secondary nav, ${page.current} current`, { timeout: 30_000 }, async () => {
      at(page.url);

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

/** The labels of a tertiary nav's links and the one that is current, once it has rendered. */
async function sectionNav(name = 'Settings') {
  const nav = await screen.findByRole('navigation', { name });
  const links = within(nav).getAllByRole('link');
  return {
    labels: links.map(link => link.textContent),
    current: links.find(link => link.getAttribute('aria-current') === 'page')?.textContent,
  };
}

describe('target settings sections', () => {
  const SETTINGS = `${TARGET}/settings`;

  function renderSettings(url: string, fixture = targetSettings()) {
    client.current = createTestClient(layoutFixtures());
    client.current.fixtures.set('TargetSettingsPageQuery', fixture);
    return at(url);
  }

  it(
    'renders General at the bare URL, with only General current',
    { timeout: 30_000 },
    async () => {
      renderSettings(SETTINGS);
      expect(await sectionNav()).toEqual({
        labels: [
          'General',
          'Breaking Changes',
          'Schema Contracts',
          'Registry Tokens',
          'CDN Tokens',
        ],
        current: 'General',
      });
      expect(await screen.findByText('Target ID')).toBeTruthy();
    },
  );

  it('renders a section at its path and keeps the data-cy hooks', { timeout: 30_000 }, async () => {
    renderSettings(`${SETTINGS}/cdn`);
    expect((await sectionNav()).current).toBe('CDN Tokens');
    expect(await screen.findByText('CDN Access Token')).toBeTruthy();
    expect(document.querySelector('[data-cy="target-settings-registry-token-link"]')).toBeTruthy();
  });

  it(
    'offers Base Schema instead of Schema Contracts outside federation',
    { timeout: 30_000 },
    async () => {
      renderSettings(`${SETTINGS}/base-schema`, targetSettings({ projectType: 'SINGLE' }));
      expect(await sectionNav()).toEqual({
        labels: ['General', 'Base Schema', 'Breaking Changes', 'Registry Tokens', 'CDN Tokens'],
        current: 'Base Schema',
      });
    },
  );

  it('hides sections the viewer may not open', { timeout: 30_000 }, async () => {
    renderSettings(
      `${SETTINGS}/registry-token`,
      targetSettings({ viewerCanModifyCDNAccessToken: false }),
    );
    expect((await sectionNav()).labels).toEqual([
      'General',
      'Breaking Changes',
      'Schema Contracts',
      'Registry Tokens',
    ]);
  });

  it(
    'sends a viewer who may not open General to their first section',
    { timeout: 30_000 },
    async () => {
      const { router } = renderSettings(
        SETTINGS,
        targetSettings({ viewerCanModifySettings: false }),
      );
      await waitFor(() =>
        expect(router.state.location.pathname).toBe(`${SETTINGS}/registry-token`),
      );
      expect((await sectionNav()).current).toBe('Registry Tokens');
    },
  );

  it('sends a viewer with no section at all back to the target', { timeout: 30_000 }, async () => {
    const { router } = renderSettings(
      `${SETTINGS}/cdn`,
      targetSettings({
        viewerCanModifySettings: false,
        viewerCanModifyCDNAccessToken: false,
        viewerCanModifyTargetAccessToken: false,
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(TARGET));
  });
});

describe('organization settings sections', () => {
  const SETTINGS = `${ORGANIZATION}/view/settings`;

  function renderSettings(url: string, fixture = organizationSettings()) {
    client.current = createTestClient(layoutFixtures());
    client.current.fixtures.set('OrganizationSettingsPageQuery', fixture);
    return at(url);
  }

  it(
    'renders General at the bare URL, with only General current',
    { timeout: 30_000 },
    async () => {
      renderSettings(SETTINGS);
      expect(await sectionNav()).toEqual({
        labels: ['General', 'Policy', 'SSO / SCIM', 'Access Tokens', 'Personal Access Tokens'],
        current: 'General',
      });
      expect(await screen.findByText('Organization ID')).toBeTruthy();
    },
  );

  it('renders a section at its path and keeps the data-cy hooks', { timeout: 30_000 }, async () => {
    renderSettings(`${SETTINGS}/policy`);
    expect((await sectionNav()).current).toBe('Policy');
    expect(await screen.findByText('Rules')).toBeTruthy();
    expect(document.querySelector('[data-cy="link-sso"]')).toBeTruthy();
  });

  it('hides sections the viewer may not open', { timeout: 30_000 }, async () => {
    renderSettings(
      SETTINGS,
      organizationSettings({
        viewerCanManageOIDCIntegration: false,
        viewerCanManagePersonalAccessTokens: false,
      }),
    );
    expect((await sectionNav()).labels).toEqual(['General', 'Policy', 'Access Tokens']);
  });

  it('sends a viewer who may not open General to Policy', { timeout: 30_000 }, async () => {
    const { router } = renderSettings(
      SETTINGS,
      organizationSettings({ viewerCanAccessSettings: false }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(`${SETTINGS}/policy`));
    expect((await sectionNav()).current).toBe('Policy');
  });
});

describe('project settings sections', () => {
  const SETTINGS = `${PROJECT}/view/settings`;

  function renderSettings(url: string, fixture = projectSettings()) {
    client.current = createTestClient(layoutFixtures());
    client.current.fixtures.set('ProjectSettingsPageQuery', fixture);
    return at(url);
  }

  it(
    'renders General at the bare URL, with only General current',
    { timeout: 30_000 },
    async () => {
      renderSettings(SETTINGS);
      expect(await sectionNav()).toEqual({
        labels: ['General', 'Policy', 'Composition', 'Access Tokens'],
        current: 'General',
      });
      expect(await screen.findByText('Project ID')).toBeTruthy();
    },
  );

  it('renders a section at its path', { timeout: 30_000 }, async () => {
    renderSettings(`${SETTINGS}/policy`);
    expect((await sectionNav()).current).toBe('Policy');
    expect(await screen.findByText('Rules')).toBeTruthy();
  });

  it('offers Composition only to federation projects', { timeout: 30_000 }, async () => {
    renderSettings(SETTINGS, projectSettings({ projectType: 'SINGLE' }));
    expect((await sectionNav()).labels).toEqual(['General', 'Policy', 'Access Tokens']);
  });

  it('sends a viewer who may not open General to Policy', { timeout: 30_000 }, async () => {
    const { router } = renderSettings(
      SETTINGS,
      projectSettings({ viewerCanModifySettings: false }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(`${SETTINGS}/policy`));
    expect((await sectionNav()).current).toBe('Policy');
  });

  it(
    'sends a viewer without settings access back to the project',
    { timeout: 30_000 },
    async () => {
      const { router } = renderSettings(
        `${SETTINGS}/policy`,
        projectSettings({
          viewerCanModifySettings: false,
          viewerCanManageProjectAccessTokens: false,
        }),
      );
      await waitFor(() => expect(router.state.location.pathname).toBe(PROJECT));
    },
  );
});

describe('members sections', () => {
  const MEMBERS = `${ORGANIZATION}/view/members`;

  function renderMembers(url: string, fixture = organizationMembers()) {
    client.current = createTestClient(layoutFixtures());
    client.current.fixtures.set('OrganizationMembersPageQuery', fixture);
    return at(url);
  }

  it(
    'renders the list at the bare URL, keeping its search param',
    { timeout: 30_000 },
    async () => {
      const { router } = renderMembers(`${MEMBERS}?search=jo`);
      expect(await sectionNav('Members')).toEqual({
        labels: ['Members', 'Roles', 'Groups', 'Invitations'],
        current: 'Members',
      });
      expect(await screen.findByText('List of organization members')).toBeTruthy();
      expect(router.state.location.search).toEqual({ search: 'jo' });
    },
  );

  it('renders a section at its path', { timeout: 30_000 }, async () => {
    renderMembers(`${MEMBERS}/roles`);
    expect((await sectionNav('Members')).current).toBe('Roles');
    expect(await screen.findByText('List of roles')).toBeTruthy();
  });

  it(
    'hides sections the viewer may not open and sends them to the list',
    { timeout: 30_000 },
    async () => {
      const { router } = renderMembers(
        `${MEMBERS}/invitations`,
        organizationMembers({ viewerCanManageInvitations: false, viewerCanManageRoles: false }),
      );
      await waitFor(() => expect(router.state.location.pathname).toBe(MEMBERS));
      expect((await sectionNav('Members')).labels).toEqual(['Members', 'Groups']);
    },
  );

  it(
    'sends a viewer who may not see members back to the organization',
    { timeout: 30_000 },
    async () => {
      const { router } = renderMembers(
        MEMBERS,
        organizationMembers({ viewerCanSeeMembers: false }),
      );
      await waitFor(() => expect(router.state.location.pathname).toBe(ORGANIZATION));
    },
  );
});

describe('alerts sections', () => {
  const ALERTS = `${TARGET}/alerts`;

  function renderAlerts(url: string, viewerCanUseMetricAlertRules = true) {
    client.current = createTestClient(layoutFixtures());
    client.current.fixtures.set('TargetAlertsPageQuery', {
      target: { __typename: 'Target', id: 'target-1', viewerCanUseMetricAlertRules },
    });
    return at(url);
  }

  it(
    'renders Activity at the bare URL, with only Activity current',
    { timeout: 30_000 },
    async () => {
      renderAlerts(ALERTS);
      expect(await sectionNav('Alerts')).toEqual({
        labels: ['Alert activity', 'Alert rules', 'Create a new alert'],
        current: 'Alert activity',
      });
    },
  );

  it('renders a section at its path', { timeout: 30_000 }, async () => {
    renderAlerts(`${ALERTS}/rules`);
    expect((await sectionNav('Alerts')).current).toBe('Alert rules');
  });

  it('renders the rule detail without the alerts nav', { timeout: 30_000 }, async () => {
    renderAlerts(`${ALERTS}/rule-1`);
    await screen.findByRole('link', { name: 'Alerts', current: 'page' });
    expect(screen.queryByRole('navigation', { name: 'Alerts' })).toBeNull();
  });

  it('sends a viewer without alert rules back to the target', { timeout: 30_000 }, async () => {
    const { router } = renderAlerts(`${ALERTS}/rules`, false);
    await waitFor(() => expect(router.state.location.pathname).toBe(TARGET));
  });
});
