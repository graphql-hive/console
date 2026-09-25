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

function createTestSession(deps: {
  isAdmin: boolean;
  superadminForeignOrganizationActions: ReadonlyArray<string>;
}) {
  const user: Partial<User> = {
    id: 'user-1',
    isAdmin: deps.isAdmin,
    provisioningStatus: null,
    deactivatedAt: null,
  };

  const storage: Partial<Storage> = {
    getUserBySuperTokenId: async () => user as User,
    getUserById: async () => user as User,
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
