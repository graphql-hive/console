// @vitest-environment jsdom
import type { Cache } from '@urql/exchange-graphcache';

// The updaters import pages; these stand in for what cannot load under jsdom.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);

describe('joinOrganization updater', () => {
  it(
    "invalidates the viewer's organizations so the selector picks up the new one",
    { timeout: 30_000 },
    async () => {
      const { Mutation } = await import('./urql-cache');
      const cache = { invalidate: vi.fn(), updateQuery: vi.fn() };

      Mutation.joinOrganization(
        {
          __typename: 'Mutation',
          joinOrganization: {
            __typename: 'OrganizationPayload',
            selector: { __typename: 'OrganizationSelector', organizationSlug: 'acme' },
            organization: { __typename: 'Organization', id: 'organization-2', slug: 'acme' },
          },
        },
        { code: 'invite-1' },
        cache as unknown as Cache,
        {} as never,
      );

      expect(cache.invalidate).toHaveBeenCalledWith('Query', 'organizations');
    },
  );

  it('does nothing when the invitation was rejected', { timeout: 30_000 }, async () => {
    const { Mutation } = await import('./urql-cache');
    const cache = { invalidate: vi.fn(), updateQuery: vi.fn() };

    Mutation.joinOrganization(
      {
        __typename: 'Mutation',
        joinOrganization: { __typename: 'OrganizationInvitationError', message: 'expired' },
      },
      { code: 'invite-1' },
      cache as unknown as Cache,
      {} as never,
    );

    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});

describe('createTarget updater', () => {
  it(
    "invalidates the project's targets so the selector tree refetches",
    { timeout: 30_000 },
    async () => {
      const { Mutation } = await import('./urql-cache');
      const cache = { invalidate: vi.fn(), updateQuery: vi.fn() };
      const result: Parameters<typeof Mutation.createTarget>[0] = {
        __typename: 'Mutation',
        createTarget: {
          __typename: 'CreateTargetResult',
          ok: {
            __typename: 'CreateTargetResultOk',
            selector: {
              __typename: 'TargetSelector',
              organizationSlug: 'acme',
              projectSlug: 'shop',
              targetSlug: 'staging',
            },
            createdTarget: {
              __typename: 'Target',
              id: 'target-2',
              slug: 'staging',
              project: { __typename: 'Project', id: 'project-1' },
            },
          },
          error: null,
        },
      };
      const args = {
        input: {
          project: { bySelector: { organizationSlug: 'acme', projectSlug: 'shop' } },
          slug: 'staging',
        },
      };

      Mutation.createTarget(result, args, cache as unknown as Cache, {} as never);

      expect(cache.invalidate).toHaveBeenCalledWith(
        { __typename: 'Project', id: 'project-1' },
        'targets',
      );
    },
  );
});
