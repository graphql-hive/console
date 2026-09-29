import type { OIDCIntegration, Organization, User } from '../../../shared/entities';
import type { OrganizationMembers } from '../../organization/providers/organization-members';
import { NoopLogger } from '../../shared/providers/logger';
import type { Storage } from '../../shared/providers/storage';
import { SuperTokensCookieBasedSession } from './supertokens-strategy';

class TestableSession extends SuperTokensCookieBasedSession {
  public getPolicyStatementsForOrganization(organizationId: string) {
    return this.loadPolicyStatementsForOrganization(organizationId);
  }
}

const superadminOrganizationId = '8b1f0c6e-2d4a-4f3b-9e5c-1a7d6b3c9f20';

function createTestSession(deps: {
  isAdmin: boolean;
  superadminForeignOrganizationActions: ReadonlyArray<string>;
  superadminOrganizationId?: string | null;
  user?: Partial<User>;
}) {
  const user = {
    id: 'user-1',
    isAdmin: deps.isAdmin,
    provisioningStatus: null,
    provisionedByOrganizationId: null,
    deactivatedAt: null,
    ...deps.user,
  } as User;

  const storage: Partial<Storage> = {
    getUserBySuperTokenId: async () => user,
    getUserById: async () => user,
    getOrganization: async () => ({ id: 'org-1' }) as Organization,
    getOIDCIntegrationForOrganization: async () => null as OIDCIntegration | null,
  };

  const organizationMembers: Partial<OrganizationMembers> = {
    findOrganizationMembership: async () => null,
  };

  return new TestableSession(
    { version: '1', superTokensUserId: 'supertokens-user-1' },
    {
      storage: storage as Storage,
      organizationMembers: organizationMembers as OrganizationMembers,
      logger: new NoopLogger(),
      superadminForeignOrganizationActions: deps.superadminForeignOrganizationActions,
      superadminOrganizationId: deps.superadminOrganizationId ?? null,
    },
  );
}

describe('SuperTokensCookieBasedSession.loadPolicyStatementsForOrganization', () => {
  test('grants only the configured actions to a superadmin with no membership', async () => {
    const session = createTestSession({
      isAdmin: true,
      superadminForeignOrganizationActions: ['*:describe'],
    });

    const statements = await session.getPolicyStatementsForOrganization(
      '50b84370-49fc-48d4-87cb-bde5a3c8fd2f',
    );

    expect(statements).toEqual([
      {
        action: '*:describe',
        effect: 'allow',
        resource:
          'hrn:50b84370-49fc-48d4-87cb-bde5a3c8fd2f:organization/50b84370-49fc-48d4-87cb-bde5a3c8fd2f',
      },
    ]);
  });

  test('grants every configured action when more than one is set', async () => {
    const session = createTestSession({
      isAdmin: true,
      superadminForeignOrganizationActions: ['*:describe', 'alert:modify'],
    });

    const statements = await session.getPolicyStatementsForOrganization(
      '50b84370-49fc-48d4-87cb-bde5a3c8fd2f',
    );

    expect(statements.map(s => s.action)).toEqual(['*:describe', 'alert:modify']);
  });

  test('a non-admin with no membership still resolves no permissions, regardless of configured actions', async () => {
    const session = createTestSession({
      isAdmin: false,
      superadminForeignOrganizationActions: ['*:describe', 'alert:modify'],
    });

    const statements = await session.getPolicyStatementsForOrganization(
      '50b84370-49fc-48d4-87cb-bde5a3c8fd2f',
    );

    expect(statements).toEqual([]);
  });
});

describe('SuperTokensCookieBasedSession SUPERADMIN_ORGANIZATION_ID', () => {
  const provisionedBySuperadminOrganization: Partial<User> = {
    provisioningStatus: 'active',
    provisionedByOrganizationId: superadminOrganizationId,
  };

  test('resolves a user provisioned by the superadmin organization as a superadmin', async () => {
    const session = createTestSession({
      isAdmin: false,
      superadminForeignOrganizationActions: ['*:describe'],
      superadminOrganizationId,
      user: provisionedBySuperadminOrganization,
    });

    expect((await session.getViewer()).isAdmin).toBe(true);
    expect(
      (
        await session.getPolicyStatementsForOrganization('50b84370-49fc-48d4-87cb-bde5a3c8fd2f')
      ).map(s => s.action),
    ).toEqual(['*:describe']);
  });

  test('does not resolve a user provisioned by another organization as a superadmin', async () => {
    const session = createTestSession({
      isAdmin: false,
      superadminForeignOrganizationActions: ['*:describe'],
      superadminOrganizationId,
      user: {
        provisioningStatus: 'active',
        provisionedByOrganizationId: '2e9d4a7c-6b1f-4c8e-a3d5-0f7b9c2e4a61',
      },
    });

    expect((await session.getViewer()).isAdmin).toBe(false);
    expect(
      await session.getPolicyStatementsForOrganization('50b84370-49fc-48d4-87cb-bde5a3c8fd2f'),
    ).toEqual([]);
  });

  test('does not resolve a deactivated provisioned user as a superadmin', async () => {
    const session = createTestSession({
      isAdmin: false,
      superadminForeignOrganizationActions: ['*:describe'],
      superadminOrganizationId,
      user: { ...provisionedBySuperadminOrganization, deactivatedAt: new Date().toISOString() },
    });

    expect((await session.getViewer()).isAdmin).toBe(false);
  });

  test('does nothing when SUPERADMIN_ORGANIZATION_ID is not set', async () => {
    const session = createTestSession({
      isAdmin: false,
      superadminForeignOrganizationActions: ['*:describe'],
      superadminOrganizationId: null,
      user: provisionedBySuperadminOrganization,
    });

    expect((await session.getViewer()).isAdmin).toBe(false);
  });
});
