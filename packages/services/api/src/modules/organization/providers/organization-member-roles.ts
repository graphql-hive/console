import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import { batch } from '../../../shared/helpers';
import {
  Permission,
  PermissionsModel,
  PermissionsPerResourceLevelAssignmentModel,
  permissionsToPermissionsPerResourceLevelAssignment,
} from '../../auth/lib/authz';
import {
  OrganizationAccessScope,
  ProjectAccessScope,
  TargetAccessScope,
} from '../../auth/providers/scopes';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import * as OrganizationMemberPermissions from '../lib/organization-member-permissions';

// function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
//   const { [key]: _, ...rest } = obj;
//   return rest;
// }

const MemberRoleModel = z
  .intersection(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      isLocked: z.boolean(),
      organizationId: z.string(),
      membersCount: z.number(),
    }),
    z.union([
      z.object({
        legacyScopes: z
          .array(z.string())
          .transform(
            value =>
              value as Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope>,
          ),
        permissions: z.null(),
      }),
      z.object({
        legacyScopes: z.null(),
        permissions: z.array(PermissionsModel),
      }),
    ]),
  )
  .transform(record => ({
    // TODO: omit "legacyScopes" property
    ...record,
    permissions: record.permissions
      ? permissionsToPermissionsPerResourceLevelAssignment([
          ...OrganizationMemberPermissions.permissions.default,
          ...record.permissions,
        ])
      : transformOrganizationMemberLegacyScopesIntoPermissionGroup(record.legacyScopes),
  }));

export type OrganizationMemberRole = z.TypeOf<typeof MemberRoleModel>;

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class OrganizationMemberRoles {
  private logger: Logger;

  constructor(
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    logger: Logger,
  ) {
    this.logger = logger.child({
      source: 'OrganizationMemberRoles',
    });
  }

  async getMemberRolesForOrganizationId(organizationId: string) {
    const query = sql`
      SELECT
        ${organizationMemberRoleFields}
      FROM
        "organization_member_roles"
      WHERE
        "organization_id" = ${organizationId}
    `;

    const records = await this.pool.any<unknown>(query);

    return records.map(row => MemberRoleModel.parse(row));
  }

  /** Find member roles by their ID */
  async findMemberRolesByIds(roleIds: Array<string>) {
    this.logger.debug('Find organization membership roles. (roleIds=%o)', roleIds);

    const query = sql`
      SELECT
        ${organizationMemberRoleFields}
      FROM
        "organization_member_roles"
      WHERE
        "id" = ANY(${sql.array(roleIds, 'uuid')})
    `;

    const result = await this.pool.any<unknown>(query);

    const rowsById = new Map<string, OrganizationMemberRole>();

    for (const row of result) {
      const record = MemberRoleModel.parse(row);

      rowsById.set(record.id, record);
    }
    return rowsById;
  }

  findMemberRoleById = batch<string, OrganizationMemberRole | null>(async roleIds => {
    const roles = await this.findMemberRolesByIds(roleIds);
    return roleIds.map(async roleId => roles.get(roleId) ?? null);
  });

  async findRoleByOrganizationIdAndName(organizationId: string, name: string) {
    const result = await this.pool.maybeOne<unknown>(sql`/* findViewerRoleForOrganizationId */
      SELECT
        ${organizationMemberRoleFields}
      FROM
        "organization_member_roles"
      WHERE
        "organization_id" = ${organizationId}
        AND "name" = ${name}
      LIMIT 1
    `);

    if (result === null) {
      return null;
    }

    return MemberRoleModel.parse(result);
  }

  async findViewerRoleByOrganizationId(organizationId: string) {
    return this.findRoleByOrganizationIdAndName(organizationId, 'Viewer');
  }

  async createOrganizationMemberRole(args: {
    organizationId: string;
    name: string;
    description: string;
    permissions: ReadonlyArray<string>;
  }): Promise<OrganizationMemberRole> {
    const permissions = args.permissions.filter(permission =>
      OrganizationMemberPermissions.permissions.assignable.has(permission as Permission),
    );
    const role = await this.pool.one(
      sql`/* createOrganizationMemberRole */
        INSERT INTO "organization_member_roles" (
          "organization_id"
          , "name"
          , "description"
          , "scopes"
          , "permissions"
        )
        VALUES (
          ${args.organizationId}
          , ${args.name}
          , ${args.description}
          , NULL
          , ${sql.array(permissions, 'text')}
        )
        RETURNING
          ${organizationMemberRoleFields}
      `,
    );

    return MemberRoleModel.parse(role);
  }

  async updateOrganizationMemberRole(args: {
    organizationId: string;
    roleId: string;
    name: string;
    permissions: ReadonlyArray<string>;
    description: string;
  }) {
    const permissions = args.permissions.filter(permission =>
      OrganizationMemberPermissions.permissions.assignable.has(permission as Permission),
    );

    const role = await this.pool.one(
      sql`/* updateOrganizationMemberRole */
        UPDATE
          "organization_member_roles"
        SET
          "name" = ${args.name}
          , "description" = ${args.description}
          , "scopes" = NULL
          , "permissions" = ${sql.array(permissions, 'text')}
        WHERE
          "organization_id" = ${args.organizationId} AND id = ${args.roleId}
        RETURNING
          ${organizationMemberRoleFields}
      `,
    );

    return MemberRoleModel.parse(role);
  }
}

export function transformOrganizationMemberLegacyScopesIntoPermissionGroup(
  scopes: Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope>,
): z.TypeOf<typeof PermissionsPerResourceLevelAssignmentModel> {
  const permissions = permissionsToPermissionsPerResourceLevelAssignment([
    ...OrganizationMemberPermissions.permissions.default,
  ]);
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

const organizationMemberRoleFields = sql`
  "organization_member_roles"."id"
  , "organization_member_roles"."name"
  , "organization_member_roles"."description"
  , "organization_member_roles"."locked" AS "isLocked"
  , "organization_member_roles"."scopes" AS "legacyScopes"
  , "organization_member_roles"."permissions"
  , "organization_member_roles"."organization_id" AS "organizationId"
  , (
    SELECT COUNT(*)
    FROM "organization_member" AS "om"
    WHERE "om"."role_id" = "organization_member_roles"."id"
  ) AS "membersCount"
`;
