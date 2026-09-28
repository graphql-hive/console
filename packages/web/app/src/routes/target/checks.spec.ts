// @vitest-environment jsdom
import { type ReactNode } from 'react';
import { CHECKS, checksFixtures } from '@/lib/testing/fixtures/checks';
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
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

const CHECKS_PAGE = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}/checks`;

type TestClient = ReturnType<typeof createTestClient>;

function client() {
  return createTestClient(new Map([...layoutFixtures(), ...checksFixtures()]));
}

function listRequests(client: TestClient) {
  return client.operations
    .filter((_, index) => client.seen[index] === 'SchemaChecks_NavigationQuery')
    .map(operation => operation.variables);
}

describe('schema checks list', () => {
  it('loads the next page into the same list', { timeout: 30_000 }, async () => {
    const testClient = client();
    renderAtUrl(CHECKS_PAGE, { client: testClient });
    await screen.findByText(CHECKS.first[0]);
    expect(screen.getByText(CHECKS.first[1])).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await screen.findByText(CHECKS.second[0]);
    expect(screen.getByText(CHECKS.first[0])).toBeTruthy();
    expect(screen.getByText(CHECKS.first[1])).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(listRequests(testClient).map(variables => variables?.after)).toEqual([
      null,
      CHECKS.nextCursor,
    ]);
  });

  it('starts over from the first page when a filter changes', { timeout: 30_000 }, async () => {
    const testClient = client();
    renderAtUrl(CHECKS_PAGE, { client: testClient });
    await screen.findByText(CHECKS.first[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByText(CHECKS.second[0]);
    const toggle = screen.getByLabelText('Show only failed checks');

    fireEvent.click(toggle);

    await waitFor(() => expect(screen.queryByText(CHECKS.first[0])).toBeNull());
    expect(screen.getByText(CHECKS.failed[0])).toBeTruthy();
    expect(listRequests(testClient).at(-1)).toMatchObject({
      after: null,
      filters: { changed: false, failed: true },
    });
    // The side nav stayed mounted: whether checks exist does not depend on the filters.
    expect(screen.getByLabelText('Show only failed checks')).toBe(toggle);
    expect(testClient.seen.filter(name => name === 'ChecksPageQuery')).toHaveLength(1);
  });

  it('keeps the selected check when a filter changes', { timeout: 30_000 }, async () => {
    const { router } = renderAtUrl(`${CHECKS_PAGE}/check-2`, { client: client() });
    await screen.findByText(CHECKS.first[1]);

    fireEvent.click(screen.getByLabelText('Show only failed checks'));

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ filter_failed: true }),
    );
    expect(router.state.location.pathname).toBe(`${CHECKS_PAGE}/check-2`);
    expect(screen.getByText(CHECKS.failed[0])).toBeTruthy();
    expect(screen.queryByText('Select a schema check')).toBeNull();
  });
});
