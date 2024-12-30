import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import { Organization } from '../../../shared/entities';
import { batchBy } from '../../../shared/helpers';
import { isUUID } from '../../../shared/is-uuid';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import {
  PermissionsModel,
  PermissionsPerResourceLevelAssignment,
  PermissionsPerResourceLevelAssignmentModel,
  permissionsToPermissionsPerResourceLevelAssignment,
} from '../lib/authz';
import { OrganizationAccessScope, ProjectAccessScope, TargetAccessScope } from './scopes';

const RawOrganizationMembershipModel = z.object({
  userId: z.string(),
  /** Legacy scopes on membership, way of assigning permissions before the introduction of roles */
  legacyScopes: z
    .array(z.string())
    .transform(
      value => value as Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope>,
    )
    .nullable(),
  /** Legacy role id, way of assigning permissions via a role before the introduction of assigning multiple roles */
  legacyRoleId: z.string().nullable(),
});

const RawMemberRoleModel = z.intersection(
  z.object({
    id: z.string(),
    description: z.string(),
    isLocked: z.boolean(),
  }),
  z.union([
    z.object({
      legacyScopes: z
        .array(z.string())
        .transform(
          value => value as Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope>,
        ),
      permissions: z.null(),
    }),
    z.object({
      legacyScopes: z.null(),
      permissions: z
        .array(PermissionsModel)
        .transform(permissions => permissionsToPermissionsPerResourceLevelAssignment(permissions)),
    }),
  ]),
);

const UUIDResourceAssignmentModel = z.union([z.literal('*'), z.array(z.string().uuid())]);

/**
 * String in the form `targetId/serviceName`
 * Example: `f81ce726-2abf-4653-bf4c-d8436cde255a/users`
 */
const ServiceResourceAssignmentStringModel = z
  .string()
  .refine(value => {
    const [targetId, serviceName = ''] = value.split('/');
    if (isUUID(targetId) === false || serviceName === '') {
      return false;
    }
    return true;
  }, 'Invalid service resource assignment')
  .transform(value => value.split('/') as [targetId: string, serviceName: string]);

const ServiceResourceAssignmentModel = z.union([
  z.literal('*'),
  z.array(ServiceResourceAssignmentStringModel),
]);

const ResourceAssignmentGroupModel = z.object({
  /** Resources assigned to a 'projects' permission group */
  project: UUIDResourceAssignmentModel,
  /** Resources assigned to a 'targets' permission group */
  target: UUIDResourceAssignmentModel,
  /** Resources assigned to a 'service' permission group */
  service: ServiceResourceAssignmentModel,
  /** Resources assigned to a 'appDeployment' permission group */
  appDeployment: ServiceResourceAssignmentModel,
});

/**
 * Resource assignments as stored within the database.
 */
type ResourceAssignmentGroup = z.TypeOf<typeof ResourceAssignmentGroupModel>;

type MemberRoleType = {
  id: string;
  description: string;
  isLocked: boolean;
  permissions: PermissionsPerResourceLevelAssignment;
};

export type OrganizationMembershipRoleAssignment = {
  role: MemberRoleType;
  /**
   * Resource assignments as stored within the database.
   */
  resources: ResourceAssignmentGroup;
  /**
   * Actual resolved resource groups
   */
  resolvedResources: ResolvedResourceAssignments;
};

type OrganizationMembership = {
  organizationId: string;
  isAdmin: boolean;
  userId: string;
  assignedRoles: Array<OrganizationMembershipRoleAssignment>;
  /**
   * legacy role assigned to this membership.
   * Note: The role is already resolved to a "OrganizationMembershipRoleAssignment" within the assignedRoles property.
   **/
  legacyRoleId: string | null;
  /**
   * Legacy scope assigned to this membership.
   * Note: They are already resolved to a "OrganizationMembershipRoleAssignment" within the assignedRoles property.
   **/
  legacyScopes: Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope> | null;
};

@Injectable({
  scope: Scope.Operation,
})
export class OrganizationMembers {
  private logger: Logger;

  constructor(
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    logger: Logger,
  ) {
    this.logger = logger.child({
      source: 'OrganizationMembers',
    });
  }

  private async findOrganizationMembersById(organizationId: string, userIds: Array<string>) {
    const query = sql`
    SELECT
      "om"."user_id" AS "userId"
      , "om"."role_id" AS "legacyRoleId"
      , "om"."scopes" AS "legacyScopes"
    FROM
      "organization_member" AS "om"
    WHERE
      "om"."organization_id" = ${organizationId}
      AND "om"."user_id" = ANY(${sql.array(userIds, 'uuid')})
  `;

    const result = await this.pool.any<unknown>(query);
    return result.map(row => RawOrganizationMembershipModel.parse(row));
  }

  /** Find member roles by their ID */
  private async findMemberRolesByIds(roleIds: Array<string>) {
    this.logger.debug('Find organization membership roles. (roleIds=%o)', roleIds);

    const query = sql`
      SELECT
        "id"
        , "name"
        , "description"
        , "locked" AS "isLocked"
        , "scopes" AS "legacyScopes"
        , "permissions"
      FROM
        "organization_member_roles"
      WHERE
        "id" = ANY(${sql.array(roleIds, 'uuid')})
    `;

    const result = await this.pool.any<unknown>(query);

    const rowsById = new Map<string, MemberRoleType>();

    for (const row of result) {
      const record = RawMemberRoleModel.parse(row);

      rowsById.set(record.id, {
        id: record.id,
        isLocked: record.isLocked,
        description: record.description,
        permissions:
          record.permissions ??
          transformOrganizationMemberLegacyScopesIntoPermissionGroup(record.legacyScopes),
      });
    }
    return rowsById;
  }

  /**
   * Batched loader function for a organization membership.
   *
   * Handles legacy scopes and role assignments and automatically transforms
   * them into resource based role assignments.
   */
  findOrganizationMembership = batchBy(
    (args: { organization: Organization; userId: string }) => args.organization.id,
    async args => {
      const organization = args[0].organization;
      const userIds = args.map(arg => arg.userId);

      this.logger.debug(
        'Find organization membership for users. (organizationId=%s, userIds=%o)',
        organization.id,
        userIds,
      );

      const organizationMembers = await this.findOrganizationMembersById(organization.id, userIds);
      const mapping = new Map<string, OrganizationMembership>();

      // Roles that are assigned using the legacy "single role" way
      const pendingLegacyRoleLookups = new Set<string>();
      const pendingLegacyRoleMembershipAssignments: Array<{
        legacyRoleId: string;
        assignedRoles: OrganizationMembership['assignedRoles'];
      }> = [];

      // Users whose role assignments need to be loaded as they are not using any legacy roles
      // const pendingRoleRoleAssignmentLookupUsersIds = new Set<OrganizationMembership>();

      for (const record of organizationMembers) {
        const organizationMembership: OrganizationMembership = {
          organizationId: organization.id,
          userId: record.userId,
          isAdmin: organization.ownerId === record.userId,
          assignedRoles: [],
          legacyRoleId: record.legacyRoleId,
          legacyScopes: record.legacyScopes,
        };
        mapping.set(record.userId, organizationMembership);

        if (record.legacyRoleId) {
          // legacy "single assigned role"
          pendingLegacyRoleLookups.add(record.legacyRoleId);
          pendingLegacyRoleMembershipAssignments.push({
            legacyRoleId: record.legacyRoleId,
            assignedRoles: organizationMembership.assignedRoles,
          });
        } else if (record.legacyScopes !== null) {
          // legacy "scopes" on organization member -> migration wizard has not been used

          // In this case we translate the legacy scopes to a single permission group on the "organization"
          // resource typ. Then assign the users organization to the group, so it has the same behavior as previously.
          const resources: ResourceAssignmentGroup = {
            project: '*',
            target: '*',
            service: '*',
            appDeployment: '*',
          };

          organizationMembership.assignedRoles.push({
            role: {
              id: 'legacy-scope-role',
              description: 'This role has been automatically generated from the assigned scopes.',
              isLocked: true,
              permissions: transformOrganizationMemberLegacyScopesIntoPermissionGroup(
                record.legacyScopes,
              ),
            },
            // allow all permissions for all resources within the organization.
            resources,
            resolvedResources: resolveResourceAssignment({
              organizationId: organization.id,
              groups: resources,
            }),
          });
        }
        // else {
        //   // normal role assignment lookup
        //   pendingRoleRoleAssignmentLookupUsersIds.add(organizationMembership);
        // }
      }

      if (pendingLegacyRoleLookups.size) {
        // This handles the legacy "single" role assignments
        // We load the roles and then attach them to the already loaded membership role
        const roleIds = Array.from(pendingLegacyRoleLookups);

        this.logger.debug('Lookup legacy role assignments. (roleIds=%o)', roleIds);

        const memberRolesById = await this.findMemberRolesByIds(roleIds);

        for (const record of pendingLegacyRoleMembershipAssignments) {
          const membershipRole = memberRolesById.get(record.legacyRoleId);
          if (!membershipRole) {
            continue;
          }
          const resources: ResourceAssignmentGroup = {
            project: '*',
            target: '*',
            service: '*',
            appDeployment: '*',
          };
          record.assignedRoles.push({
            resources,
            resolvedResources: resolveResourceAssignment({
              organizationId: organization.id,
              groups: resources,
            }),
            role: membershipRole,
          });
        }
      }

      //   if (pendingRoleRoleAssignmentLookupUsersIds.size) {
      //     const usersIds = Array.from(pendingRoleRoleAssignmentLookupUsersIds).map(
      //       membership => membership.userId,
      //     );
      //     this.logger.debug(
      //       'Lookup role assignments within organization for users. (organizationId=%s, userIds=%o)',
      //       organization.id,
      //       usersIds,
      //     );

      //     const roleAssignments = await this.findRoleAssignmentsForUsersInOrganization(
      //       organization.id,
      //       usersIds,
      //     );

      //     for (const membership of pendingRoleRoleAssignmentLookupUsersIds) {
      //       membership.assignedRoles.push(...(roleAssignments.get(membership.userId) ?? []));
      //     }
      //   }

      return userIds.map(async userId => mapping.get(userId) ?? null);
    },
  );
}

function transformOrganizationMemberLegacyScopesIntoPermissionGroup(
  scopes: Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope>,
): z.TypeOf<typeof PermissionsPerResourceLevelAssignmentModel> {
  const permissions: z.TypeOf<typeof PermissionsPerResourceLevelAssignmentModel> = {
    organization: new Set(),
    project: new Set(),
    target: new Set(),
    service: new Set(),
    appDeployment: new Set(),
  };
  for (const scope of scopes) {
    switch (scope) {
      case OrganizationAccessScope.READ: {
        permissions.organization.add('organization:describe');
        permissions.organization.add('support:manageTickets');
        permissions.organization.add('project:create');
        permissions.project.add('project:describe');
        break;
      }
      case OrganizationAccessScope.SETTINGS: {
        permissions.organization.add('organization:modifySlug');
        permissions.organization.add('schemaLinting:modifyOrganizationRules');
        permissions.organization.add('billing:describe');
        permissions.organization.add('billing:update');
        permissions.organization.add('auditLog:export');
        break;
      }
      case OrganizationAccessScope.DELETE: {
        permissions.organization.add('organization:delete');
        break;
      }
      case OrganizationAccessScope.INTEGRATIONS: {
        permissions.organization.add('oidc:modify');
        permissions.organization.add('gitHubIntegration:modify');
        permissions.organization.add('slackIntegration:modify');

        break;
      }
      case OrganizationAccessScope.MEMBERS: {
        permissions.organization.add('member:manageInvites');
        permissions.organization.add('member:removeMember');
        permissions.organization.add('member:assignRole');
        permissions.organization.add('member:modifyRole');
        permissions.organization.add('member:describe');
        break;
      }
      case ProjectAccessScope.ALERTS: {
        permissions.project.add('alert:modify');
        break;
      }
      case ProjectAccessScope.READ: {
        permissions.project.add('project:describe');
        break;
      }
      case ProjectAccessScope.DELETE: {
        permissions.project.add('project:delete');
        break;
      }
      case ProjectAccessScope.SETTINGS: {
        permissions.project.add('project:delete');
        permissions.project.add('project:modifySettings');
        permissions.project.add('schemaLinting:modifyProjectRules');
        break;
      }
      case TargetAccessScope.READ: {
        permissions.project.add('target:create');
        permissions.target.add('appDeployment:describe');
        permissions.target.add('laboratory:describe');
        break;
      }
      case TargetAccessScope.REGISTRY_WRITE: {
        permissions.target.add('laboratory:modify');
        permissions.service.add('schemaCheck:approve');
        break;
      }
      case TargetAccessScope.TOKENS_WRITE: {
        permissions.target.add('targetAccessToken:modify');
        permissions.target.add('cdnAccessToken:modify');
        break;
      }
      case TargetAccessScope.SETTINGS: {
        permissions.target.add('target:modifySettings');
        permissions.target.add('laboratory:modifyPreflightScript');
        break;
      }
      case TargetAccessScope.DELETE: {
        permissions.target.add('target:delete');
        break;
      }
    }
  }

  return permissions;
}

type OrganizationAssignment = {
  type: 'organization';
  organizationId: string;
};

type ProjectAssignment = {
  type: 'project';
  projectId: string;
};

type TargetAssignment = {
  type: 'target';
  targetId: string;
};

type ServiceAssignment = {
  type: 'service';
  targetId: string;
  serviceName: string;
};

type AppDeploymentAssignment = {
  type: 'appDeployment';
  targetId: string;
  appDeploymentName: string;
};

export type ResourceAssignment =
  | OrganizationAssignment
  | ProjectAssignment
  | TargetAssignment
  | ServiceAssignment
  | AppDeploymentAssignment;

type ResolvedResourceAssignments = {
  organization: OrganizationAssignment;
  project: OrganizationAssignment | Array<ProjectAssignment>;
  target: OrganizationAssignment | Array<ProjectAssignment> | Array<TargetAssignment>;
  service:
    | OrganizationAssignment
    | Array<ProjectAssignment>
    | Array<TargetAssignment>
    | Array<ServiceAssignment>;
  appDeployment:
    | OrganizationAssignment
    | Array<ProjectAssignment>
    | Array<TargetAssignment>
    | Array<AppDeploymentAssignment>;
};

/**
 * This function resolves the "stored-in-database", user configuration to the actual resolved structure
 * Currently, we have the following hierarchy
 *
 *        organization
 *             v
 *           project
 *             v
 *           target
 *          v      v
 * app deployment  service
 *
 * If one level specifies "*", it needs to inherit the resources defined on the next upper level.
 */
function resolveResourceAssignment(args: {
  organizationId: string;
  groups: ResourceAssignmentGroup;
}): ResolvedResourceAssignments {
  const organization: OrganizationAssignment = {
    type: 'organization',
    organizationId: args.organizationId,
  };

  let project: ResolvedResourceAssignments['project'] = organization;

  if (args.groups.project !== '*') {
    project = args.groups.project.map(projectId => ({
      type: 'project',
      projectId,
    }));
  }

  let target: ResolvedResourceAssignments['target'] = project;

  if (args.groups.target !== '*') {
    target = args.groups.target.map(targetId => ({
      type: 'target',
      targetId,
    }));
  }

  let service: ResolvedResourceAssignments['service'] = target;

  if (args.groups.service !== '*') {
    service = args.groups.service.map(([targetId, serviceName]) => ({
      type: 'service',
      targetId,
      serviceName,
    }));
  }

  let appDeployment: ResolvedResourceAssignments['appDeployment'] = target;

  if (args.groups.service !== '*') {
    appDeployment = args.groups.service.map(([targetId, appDeploymentName]) => ({
      type: 'appDeployment',
      targetId,
      appDeploymentName,
    }));
  }

  return {
    organization,
    project,
    target,
    service,
    appDeployment,
  };
}
