import { createHash } from 'node:crypto';
import { Session } from '../../auth/lib/authz';
import {
  isOrganizationScope,
  OrganizationAccessScope,
} from '../../auth/providers/organization-access';
import { isProjectScope, ProjectAccessScope } from '../../auth/providers/project-access';
import { isTargetScope, TargetAccessScope } from '../../auth/providers/target-access';
import { OrganizationManager } from '../providers/organization-manager';
import type { OrganizationResolvers } from './../../../__generated__/types';

export const Organization: Pick<
  OrganizationResolvers,
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
  | 'unassignedMembersToMigrate'
  | 'viewerCanAccessSettings'
  | 'viewerCanAssignUserRoles'
  | 'viewerCanDelete'
  | 'viewerCanExportAuditLogs'
  | 'viewerCanManageInvitations'
  | 'viewerCanManageRoles'
  | 'viewerCanMigrateLegacyMemberRoles'
  | 'viewerCanModifySlug'
  | 'viewerCanSeeMembers'
  | 'viewerCanTransferOwnership'
  | '__isTypeOf'
> = {
  __isTypeOf: organization => {
    return !!organization.id;
  },
  owner: (organization, _, { injector }) => {
    return injector
      .get(OrganizationManager)
      .getOrganizationOwner({ organizationId: organization.id });
  },
  me: async (organization, _, { injector }) => {
    const me = await injector.get(Session).getViewer();
    const members = await injector
      .get(OrganizationManager)
      .getOrganizationMembers({ organizationId: organization.id });

    return members.find(m => m.id === me.id)!;
  },
  members: (organization, _, { injector }) => {
    return injector
      .get(OrganizationManager)
      .getOrganizationMembers({ organizationId: organization.id });
  },
  invitations: async (organization, _, { injector }) => {
    const invitations = await injector.get(OrganizationManager).getInvitations({
      organizationId: organization.id,
    });

    return {
      total: invitations.length,
      nodes: invitations,
    };
  },
  memberRoles: (organization, _, { injector }) => {
    return injector.get(OrganizationManager).getMemberRoles({
      organizationId: organization.id,
    });
  },
  unassignedMembersToMigrate: async (organization, _, { injector }) => {
    const members = await injector.get(OrganizationManager).getMembersWithoutRole({
      organizationId: organization.id,
    });

    if (members.length === 0) {
      return [];
    }

    const groupedByAccessScope: {
      [accessHash: string]: {
        organizationScopes: OrganizationAccessScope[];
        projectScopes: ProjectAccessScope[];
        targetScopes: TargetAccessScope[];
        members: Array<(typeof members)[number]>;
      };
    } = {};

    for (const member of members) {
      const hasher = createHash('md5');
      hasher.update([...member.scopes].sort().join(','));
      const accessHash = hasher.digest('hex');

      if (!groupedByAccessScope[accessHash]) {
        groupedByAccessScope[accessHash] = {
          organizationScopes: member.scopes.filter(isOrganizationScope),
          projectScopes: member.scopes.filter(isProjectScope),
          targetScopes: member.scopes.filter(isTargetScope),
          members: [],
        };
      }

      groupedByAccessScope[accessHash].members.push(member);
    }

    return (
      Object.entries(groupedByAccessScope)
        .map(([accessHash, group]) => ({
          id: accessHash,
          organizationScopes: group.organizationScopes,
          projectScopes: group.projectScopes,
          targetScopes: group.targetScopes,
          members: group.members,
        }))
        // Sort by the number of members in the group in descending order
        .sort((a, b) => b.members.length - a.members.length)
    );
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
      action: 'member:manageInvites',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  viewerCanAssignUserRoles: (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'member:assignRole',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  viewerCanManageRoles: (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'member:modifyRole',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  viewerCanMigrateLegacyMemberRoles: async (organization, _arg, { injector, session }) => {
    const owner = await injector
      .get(OrganizationManager)
      .getOrganizationOwner({ organizationId: organization.id });
    const viewer = await session.getViewer();
    return viewer.id === owner.id;
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
};
