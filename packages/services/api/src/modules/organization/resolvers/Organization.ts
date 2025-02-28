import { Session } from '../../auth/lib/authz';
import * as OrganizationAccessTokensPermissions from '../lib/organization-access-token-permissions';
import * as OrganizationMemberPermissions from '../lib/organization-member-permissions';
import { OrganizationAccessTokens } from '../providers/organization-access-tokens';
import { OrganizationManager } from '../providers/organization-manager';
import { OrganizationMemberRoles } from '../providers/organization-member-roles';
import { OrganizationMembers } from '../providers/organization-members';
import type { OrganizationResolvers } from './../../../__generated__/types';

export const Organization: Pick<
  OrganizationResolvers,
  | 'accessTokens'
  | 'availableMemberPermissionGroups'
  | 'availableOrganizationPermissionGroups'
  | 'cleanId'
  | 'getStarted'
  | 'id'
  | 'invitations'
  | 'me'
  | 'memberRoles'
  | 'members'
  | 'name'
  | 'owner'
  | 'slug'
  | 'viewerCanAccessSettings'
  | 'viewerCanAssignUserRoles'
  | 'viewerCanDelete'
  | 'viewerCanExportAuditLogs'
  | 'viewerCanManageInvitations'
  | 'viewerCanManageRoles'
  | 'viewerCanModifySlug'
  | 'viewerCanSeeMembers'
  | 'viewerCanTransferOwnership'
  | '__isTypeOf'
> = {
  __isTypeOf: organization => {
    return !!organization.id;
  },
  owner: async (organization, _, { injector }) => {
    const owner = await injector.get(OrganizationMembers).findOrganizationOwner(organization);
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

    if (!member) {
      throw new Error('Could not find member.');
    }

    return member;
  },
  members: (organization, _, { injector }) => {
    return injector.get(OrganizationMembers).findOrganizationMembersForOrganization(organization);
  },
  invitations: async (organization, _, { injector }) => {
    const invitations = await injector.get(OrganizationManager).getInvitations({
      organizationId: organization.id,
    });

    if (invitations === null) {
      return null;
    }

    return {
      total: invitations.length,
      nodes: invitations,
    };
  },
  memberRoles: (organization, _, { injector }) => {
    return injector.get(OrganizationMemberRoles).getMemberRolesForOrganizationId(organization.id);
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
  availableMemberPermissionGroups: () => {
    return OrganizationMemberPermissions.permissionGroups;
  },
  availableOrganizationPermissionGroups: () => {
    return OrganizationAccessTokensPermissions.permissionGroups;
  },
  accessTokens: async (organization, args, { injector }) => {
    return injector.get(OrganizationAccessTokens).getPaginated({
      organizationId: organization.id,
      first: args.first ?? null,
      after: args.after ?? null,
    });
  },
};
