import { Session } from '../../auth/lib/authz';
import { OrganizationAccessTokens } from '../providers/organization-access-tokens';
import { OrganizationManager } from '../providers/organization-manager';
import { OrganizationMemberRoles } from '../providers/organization-member-roles';
import { OrganizationMembers } from '../providers/organization-members';
import { ResourceSelector } from '../providers/resource-selector';
import type { OrganizationResolvers } from './../../../__generated__/types';

export const Organization: Pick<
  OrganizationResolvers,
  | 'accessToken'
  | 'accessTokenById'
  | 'accessTokens'
  | 'allAccessTokens'
  | 'availableMemberPermissionGroups'
  | 'availableOrganizationAccessTokenPermissionGroups'
  | 'cleanId'
  | 'getStarted'
  | 'id'
  | 'invitations'
  | 'me'
  | 'memberRoles'
  | 'members'
  | 'name'
  | 'owner'
  | 'projectForResourceSelector'
  | 'projectsForResourceSelector'
  | 'slug'
  | 'viewerCanAccessSettings'
  | 'viewerCanAssignUserRoles'
  | 'viewerCanDelete'
  | 'viewerCanExportAuditLogs'
  | 'viewerCanManageAccessTokens'
  | 'viewerCanManageInvitations'
  | 'viewerCanManagePersonalAccessTokens'
  | 'viewerCanManageRoles'
  | 'viewerCanModifySlug'
  | 'viewerCanSeeMembers'
  | 'viewerCanTransferOwnership'
> = {
  owner: async (organization, _, { injector }) => {
    const owner = await injector.get(OrganizationManager).findOrganizationOwner(organization);
    if (!owner) {
      throw new Error('Not found.');
    }

    return owner;
  },
  me: async (organization, _, { injector }) => {
    const me = await injector.get(Session).getViewer();

    const member = await injector.get(OrganizationMembers).findOrganizationMembership({
      organization,
      userId: me.id,
    });

    return member;
  },
  members: (organization, args, { injector }) => {
    return injector
      .get(OrganizationManager)
      .getPaginatedOrganizationMembersForOrganization(organization, {
        first: args.first ?? null,
        after: args.after ?? null,
        searchTerm: args.filters?.searchTerm ?? null,
      });
  },
  invitations: async (organization, args, { injector }) => {
    const invitations = await injector.get(OrganizationManager).getInvitations(organization, {
      first: args.first ?? null,
      after: args.after ?? null,
    });

    return invitations;
  },
  memberRoles: async (organization, args, { injector }) => {
    const roles = await injector
      .get(OrganizationMemberRoles)
      .getPaginatedMemberRolesForOrganizationId(organization.id, {
        first: args.first ?? null,
        after: args.after ?? null,
      });
    return roles;
  },
  cleanId: organization => organization.slug,
  viewerCanDelete: async (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'organization:delete',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  viewerCanModifySlug: async (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'organization:modifySlug',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  viewerCanTransferOwnership: async (organization, _arg, { session, injector }) => {
    const owner = await injector
      .get(OrganizationManager)
      .getOrganizationOwner({ organizationId: organization.id });
    const viewer = await session.getViewer();
    return viewer.id === owner.id;
  },
  viewerCanAccessSettings: async (organization, _arg, { session }) => {
    /* If any of these yields true the user should be able to access the settings */
    return Promise.all([
      session.canPerformAction({
        action: 'organization:modifySlug',
        organizationId: organization.id,
        params: {
          organizationId: organization.id,
        },
      }),
      session.canPerformAction({
        action: 'organization:delete',
        organizationId: organization.id,
        params: {
          organizationId: organization.id,
        },
      }),
      session.canPerformAction({
        action: 'oidc:modify',
        organizationId: organization.id,
        params: {
          organizationId: organization.id,
        },
      }),
      session.canPerformAction({
        action: 'gitHubIntegration:modify',
        organizationId: organization.id,
        params: {
          organizationId: organization.id,
        },
      }),
      session.canPerformAction({
        action: 'slackIntegration:modify',
        organizationId: organization.id,
        params: {
          organizationId: organization.id,
        },
      }),
      session.canPerformAction({
        action: 'accessToken:modify',
        organizationId: organization.id,
        params: {
          organizationId: organization.id,
        },
      }),
    ]).then(result => result.some(Boolean));
  },
  viewerCanSeeMembers: async (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'member:describe',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },

  viewerCanManageInvitations: (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'member:modify',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  viewerCanAssignUserRoles: (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'member:modify',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  viewerCanManageRoles: (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'member:modify',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  viewerCanExportAuditLogs: async (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'auditLog:export',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  availableMemberPermissionGroups: (organization, _, { injector }) => {
    return injector.get(OrganizationAccessTokens).getAvailableMemberPermissionGroups(organization);
  },
  availableOrganizationAccessTokenPermissionGroups: async (organization, _, { injector }) => {
    return injector
      .get(OrganizationAccessTokens)
      .getAvailablePermissionGroupsForOrganization(organization);
  },
  accessTokens: async (organization, args, { injector }) => {
    return injector.get(OrganizationAccessTokens).getPaginatedForOrganization(organization, {
      first: args.first ?? null,
      after: args.after ?? null,
      includeOnlyOrganizationScoped: true,
    });
  },
  viewerCanManageAccessTokens: async (organization, _arg, { session }) => {
    return session.canPerformAction({
      organizationId: organization.id,
      action: 'accessToken:modify',
      params: {
        organizationId: organization.id,
      },
    });
  },
  accessToken: async (organization, args, { injector }) => {
    return injector.get(OrganizationAccessTokens).getForOrganization(organization, args.id, true);
  },
  viewerCanManagePersonalAccessTokens: async (organization, _arg, { session }) => {
    return session.canPerformAction({
      organizationId: organization.id,
      action: 'personalAccessToken:modify',
      params: {
        organizationId: organization.id,
      },
    });
  },
  accessTokenById: async (organization, args, { injector }) => {
    return injector.get(OrganizationAccessTokens).getForOrganization(organization, args.id);
  },
  async allAccessTokens(organization, args, { injector }) {
    return injector.get(OrganizationAccessTokens).getPaginatedForOrganization(organization, {
      first: args.first ?? null,
      after: args.after ?? null,
    });
  },
  projectForResourceSelector: async (organization, args, { injector }) => {
    return await injector
      .get(ResourceSelector)
      .getProjectFromOrganizationForResourceSelector(organization, args.projectId, args.intent);
  },
  projectsForResourceSelector: async (organization, args, { injector }) => {
    return await injector
      .get(ResourceSelector)
      .getProjectsFromOrganizationForResourceSelector(organization, args.intent);
  },
};
