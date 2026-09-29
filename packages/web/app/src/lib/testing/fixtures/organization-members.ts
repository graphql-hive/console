import { SLUGS } from './layouts';

type MembersPermissions = {
  viewerCanSeeMembers: boolean;
  viewerCanManageInvitations: boolean;
  viewerCanManageRoles: boolean;
};

/**
 * `OrganizationMembersPageQuery` for a viewer with every permission and an organization with no
 * members, roles, groups or invitations; ids match the layout fixtures.
 */
export function organizationMembers(overrides: Partial<MembersPermissions> = {}) {
  return {
    organization: {
      __typename: 'Organization' as const,
      id: 'organization-1',
      slug: SLUGS.organizationSlug,
      viewerCanSeeMembers: true,
      viewerCanManageInvitations: true,
      viewerCanManageRoles: true,
      viewerCanAssignUserRoles: true,
      owner: { __typename: 'User' as const, id: 'user-1' },
      me: {
        __typename: 'Member' as const,
        id: 'member-1',
        role: { __typename: 'MemberRole' as const, id: 'role-1', name: 'Admin' },
      },
      oidcIntegration: null,
      availableMemberPermissionGroups: [],
      memberRoles: { __typename: 'MemberRoleConnection' as const, edges: [] },
      invitations: { __typename: 'OrganizationInvitationConnection' as const, edges: [] },
      members: {
        __typename: 'MemberConnection' as const,
        edges: [],
        pageInfo: { __typename: 'PageInfo' as const, endCursor: null, hasNextPage: false },
      },
      ...overrides,
    },
  };
}
