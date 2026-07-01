import { Injectable, Scope } from 'graphql-modules';
import { PostgresDatabasePool, type CommonQueryMethods } from '@hive/postgres';
import * as GraphQLSchema from '../../../__generated__/types';
import { isUUID } from '../../../shared/is-uuid';
import { AuthorizationPolicyStatement, Session } from '../../auth/lib/authz';
import { Logger } from '../../shared/providers/logger';
import { GroupMemberStore } from './group-member-store';
import { GroupRoleAssignmentStore } from './group-role-assignment-store';
import { GroupStore, type Group } from './group-store';
import { OrganizationMemberRoles } from './organization-member-roles';
import type { OrganizationMembership } from './organization-members';
import {
  resolveResourceAssignment,
  ResourceAssignments,
  translateResolvedResourcesToAuthorizationPolicyStatements,
} from './resource-assignments';

@Injectable({
  scope: Scope.Operation,
})
export class Groups {
  private logger: Logger;
  constructor(
    logger: Logger,
    private pool: PostgresDatabasePool,
    private session: Session,
    private groupStore: GroupStore,
    private memberRoles: OrganizationMemberRoles,
    private resourceAssignment: ResourceAssignments,
    private groupAssignmentStore: GroupRoleAssignmentStore,
  ) {
    this.logger = logger.child({
      source: 'Groups',
    });
  }

  async getGroupByIdForOrganizationId(
    organizationId: string,
    groupId: string,
  ): Promise<Group | null> {
    this.logger.debug(
      'lookup group for organization by id (organizationId=%s, groupId=%s)',
      organizationId,
      groupId,
    );

    const group = await this.groupStore.getGroupById(groupId);

    if (!group) {
      this.logger.debug('group not found. (groupId=%s)', groupId);
      return null;
    }

    if (group.organizationId !== organizationId) {
      this.logger.debug('group organization id mismatch (groupId=%s)', groupId);
      return null;
    }

    this.logger.debug(
      'group for organization found (organizationId=%s, groupId=%s)',
      organizationId,
      groupId,
    );

    return group;
  }

  async addGroupMappingToGroup(args: {
    groupId: string;
    roleId: string;
    assignedResources: GraphQLSchema.ResourceAssignmentInput | null;
  }) {
    this.logger.debug(
      'add group mapping to group (groupId=%s, roleId=%s)',
      args.groupId,
      args.roleId,
    );

    const [group, role] = await Promise.all([
      this.groupStore.getGroupById(args.groupId),
      this.memberRoles.findMemberRoleById(args.roleId),
    ]);

    if (!group) {
      this.logger.debug('could not find group (groupId=%s)', args.groupId);
      return {
        type: 'error' as const,
        message: 'Group not found.',
      };
    }

    await this.session.assertPerformAction({
      action: 'member:modify',
      organizationId: group.organizationId,
      params: {
        organizationId: group.organizationId,
      },
    });

    if (!role) {
      this.logger.debug('could not find role (roleId=%s)', args.roleId);
      return {
        type: 'error' as const,
        message: 'Role not found.',
      };
    }

    if (role.organizationId !== group.organizationId) {
      this.logger.debug(
        'group and role have organization id mismatch (groupId=%s, roleId=%s)',
        args.groupId,
        args.roleId,
      );

      return {
        type: 'error' as const,
        message: 'Role not found.',
      };
    }

    const resourceAssignment = args.assignedResources
      ? await this.resourceAssignment.transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
          role.organizationId,
          args.assignedResources,
        )
      : {
          mode: '*' as const,
        };

    await this.groupAssignmentStore.createGroupMapping({
      organizationId: group.organizationId,
      groupId: group.id,
      resourceAssignment,
      roleId: role.id,
    });

    return {
      type: 'success' as const,
      group,
    };
  }

  async updateGroupMapping(args: {
    groupMappingId: string;
    newRoleId: string | null;
    newAssignedResources: GraphQLSchema.ResourceAssignmentInput | null;
  }) {
    this.logger.debug(
      'update group mapping (groupMappingId=%s, newRoleId=%s)',
      args.groupMappingId,
      args.newRoleId,
    );

    const groupMapping = await this.groupAssignmentStore.getGroupMappingById(args.groupMappingId);

    if (!groupMapping) {
      return {
        type: 'error' as const,
        message: 'Could not find group mapping.',
      };
    }

    if (
      !(await this.session.canPerformAction({
        action: 'member:modify',
        organizationId: groupMapping.organizationId,
        params: { organizationId: groupMapping.organizationId },
      }))
    ) {
      return {
        type: 'error' as const,
        message: 'Could not find group mapping.',
      };
    }

    const group = await this.groupStore.getGroupById(groupMapping.groupId);

    if (!group) {
      return {
        type: 'error' as const,
        message: 'Could not find group.',
      };
    }

    if (args.newRoleId) {
      const role = await this.memberRoles.findMemberRoleById(args.newRoleId);
      if (!role) {
        return {
          type: 'error' as const,
          message: 'Could not find role.',
        };
      }
    }

    await this.groupAssignmentStore.updateGroupMapping({
      groupMappingId: groupMapping.id,
      newRoleId: args.newRoleId,
      newResourceAssignment: args.newAssignedResources
        ? await this.resourceAssignment.transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
            groupMapping.organizationId,
            args.newAssignedResources,
          )
        : null,
    });

    return {
      type: 'success' as const,
      group,
    };
  }

  async removeGroupMapping(args: { groupMappingId: string }) {
    this.logger.debug('remove group mapping (groupMappingId=%s)', args.groupMappingId);

    if (!isUUID(args.groupMappingId)) {
      this.logger.debug('invalid uuid provided (groupMappingId=%s)', args.groupMappingId);
      return {
        type: 'error' as const,
        message: 'Group mapping not found.',
      };
    }

    this.logger.debug('lookup group mapping (groupMappingId=%s)', args.groupMappingId);

    const groupMapping = await this.groupAssignmentStore.getGroupMappingById(args.groupMappingId);
    if (!groupMapping) {
      this.logger.debug('group mapping not found (groupMappingId=%s)', args.groupMappingId);
      return {
        type: 'error' as const,
        message: 'Group mapping not found.',
      };
    }

    this.logger.debug('group mapping found (groupMappingId=%s)', args.groupMappingId);

    if (
      !(await this.session.canPerformAction({
        action: 'member:modify',
        organizationId: groupMapping.organizationId,
        params: {
          organizationId: groupMapping.organizationId,
        },
      }))
    ) {
      return {
        type: 'error' as const,
        message: 'Group mapping not found.',
      };
    }

    this.logger.debug('lookup group (groupMappingId=%s)', args.groupMappingId);

    const group = await this.groupStore.getGroupById(groupMapping.groupId);

    if (!group) {
      this.logger.debug('group not found (groupMappingId=%s)', args.groupMappingId);
      return {
        type: 'error' as const,
        message: 'Group mapping not found.',
      };
    }

    this.logger.debug(
      'delete group mapping record (groupMappingId=%s, groupId=%s)',
      args.groupMappingId,
      group.id,
    );

    await this.groupAssignmentStore.deleteGroupMapping(groupMapping.id);

    this.logger.debug(
      'group mapping deleted successfully (groupMappingId=%s, groupId=%s)',
      args.groupMappingId,
      group.id,
    );

    return {
      type: 'success' as const,
      group,
    };
  }

  static async getGroupsForOrganizationMembership(
    pool: CommonQueryMethods,
    membership: OrganizationMembership,
  ): Promise<Array<Group>> {
    const groupMembers = await GroupMemberStore.getGroupMemberForOrganizationIdAndUserId(
      pool,
      membership.organizationId,
      membership.userId,
    );
    const groups = await GroupStore.getGroupsByIds(
      pool,
      groupMembers.map(groupMember => groupMember.groupId),
    );

    return groups.filter(isNonNull);
  }

  public getGroupsForOrganizationMembership(membership: OrganizationMembership) {
    return Groups.getGroupsForOrganizationMembership(this.pool, membership);
  }

  /**
   * Returns null if the user is not a member of any group.
   * If the user is a member of groups within the origanization this returns a
   * computed list of the policy statements based on all the group memberships role assignments.
   */
  static async getAllAuthorizationPolicyStatementFromGroupMembershipsPolicyStatementsForOrganizationMembership(
    logger: Logger,
    pool: CommonQueryMethods,
    membership: OrganizationMembership,
  ): Promise<null | Array<AuthorizationPolicyStatement>> {
    logger.debug(
      'resolve group policy statements for organization membership (organizationId=%s, userId=%s)',
      membership.organizationId,
      membership.userId,
    );

    const groupMemberships = await Groups.getGroupsForOrganizationMembership(pool, membership);
    if (groupMemberships.length === null) {
      logger.debug(
        'no memberships found (organizationId=%s, userId=%s)',
        membership.organizationId,
        membership.userId,
      );
      return null;
    }
    logger.debug(
      'memberships found. resolve groups. (organizationId=%s, userId=%s)',
      membership.organizationId,
      membership.userId,
    );
    const groupMappings = await GroupRoleAssignmentStore.getGroupRoleAssignmentsForGroupIds(
      pool,
      groupMemberships.map(membership => membership.id),
    );

    logger.debug(
      'groups found. resolve roles. (organizationId=%s, userId=%s)',
      membership.organizationId,
      membership.userId,
    );

    const roles = await OrganizationMemberRoles.findMemberRolesByIds(
      pool,
      groupMappings.map(m => m.roleId),
    );

    logger.debug(
      'compute policy statements. (organizationId=%s, userId=%s)',
      membership.organizationId,
      membership.userId,
    );

    const policyStatements: Array<AuthorizationPolicyStatement> = [];
    for (const groupMapping of groupMappings) {
      const role = roles.get(groupMapping.roleId);
      if (!role) {
        // if the role no longer exists for whatever reason we just skip the group
        continue;
      }

      const resolvedResources = resolveResourceAssignment({
        organizationId: membership.organizationId,
        projects: groupMapping.assignedResources,
      });

      const statements = translateResolvedResourcesToAuthorizationPolicyStatements(
        membership.organizationId,
        role.permissions,
        resolvedResources,
      );
      policyStatements.push(...statements);
    }

    return policyStatements;
  }
}

function isNonNull<T>(value: T | null | undefined): value is T {
  return value != null;
}
