import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
} from '@hive/storage';
import { batch } from '../../../shared/helpers';
import {
  Permission,
  PermissionsModel,
  PermissionsPerResourceLevelAssignment,
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

function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const { [key]: _, ...rest } = obj;
  return rest;
}

const MemberRoleModel = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    isLocked: z.boolean(),
    organizationId: z.string(),
    membersCount: z.number(),
    legacyScopes: z
      .array(z.string())
      .nullable()
      .transform(
        value =>
          value as Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope> | null,
      ),
    permissions: z.array(PermissionsModel).nullable(),
    createdAt: z.string(),
  })
  .transform(record => {
    let permissions: PermissionsPerResourceLevelAssignment;

    // Both "Viewer" and "Admin" have pre-defined permissions
    if (record.name === 'Viewer') {
      permissions = predefinedRolesPermissions.viewer;
    } else if (record.name === 'Admin') {
      permissions = predefinedRolesPermissions.admin;
    } else if (record.permissions) {
      permissions = permissionsToPermissionsPerResourceLevelAssignment([
        ...OrganizationMemberPermissions.permissions.default,
        ...record.permissions,
      ]);
    } else {
      permissions = transformOrganizationMemberLegacyScopesIntoPermissionGroup(
        record.legacyScopes ?? [],
      );
    }

    return {
      ...omit(record, 'legacyScopes'),
      permissions,
    };
  });

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

  async getPaginatedMemberRolesForOrganizationId(
    organizationId: string,
    args: {
      first: number | null;
      after: string | null;
    },
  ) {
    let cursor: { id: string; createdAt: string } | null = null;
    if (args.after) {
      cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.after);
    }
    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 50) : 50) : 50;

    const query = sql`
      SELECT
        ${organizationMemberRoleFields}
      FROM
        "organization_member_roles"
      WHERE
        "organization_id" = ${organizationId}
        ${
          cursor
            ? sql`
                AND (
                  (
                    "created_at" = ${cursor.createdAt}
                    AND "id" < ${cursor.id}
                  )
                  OR "created_at" < ${cursor.createdAt}
                )
              `
            : sql``
        }
      ORDER BY
        "created_at" DESC
        , "id" DESC
      LIMIT ${limit + 1}
    `;

    const records = await this.pool.any<unknown>(query);

    let edges = records.map(row => {
      const node = MemberRoleModel.parse(row);

      return {
        node,
        get cursor() {
          return encodeCreatedAtAndUUIDIdBasedCursor(node);
        },
      };
    });

    const hasNextPage = edges.length > limit;
    edges = edges.slice(0, limit);

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        get endCursor() {
          return edges[edges.length - 1]?.cursor ?? '';
        },
        get startCursor() {
          return edges[0]?.cursor ?? '';
        },
      },
    };
  }

  /** Find member roles by their ID */
  async findMemberRolesByIds(roleIds: Array<string>): Promise<Map<string, OrganizationMemberRole>> {
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

  async findRoleByOrganizationIdAndName(
    organizationId: string,
    name: string,
  ): Promise<OrganizationMemberRole | null> {
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

  async findViewerRoleByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationMemberRole | null> {
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
  }): Promise<OrganizationMemberRole> {
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

function transformOrganizationMemberLegacyScopesIntoPermissionGroup(
  scopes: Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope>,
): z.TypeOf<typeof PermissionsPerResourceLevelAssignmentModel> {
  const permissions = new Set<Permission>();
  for (const scope of scopes) {
    switch (scope) {
      case OrganizationAccessScope.READ: {
        permissions.add('support:manageTickets');
        permissions.add('project:describe');
        permissions.add('project:create');
        break;
      }
      case OrganizationAccessScope.SETTINGS: {
        permissions.add('organization:modifySlug');
        permissions.add('schemaLinting:modifyOrganizationRules');
        permissions.add('billing:describe');
        permissions.add('billing:update');
        permissions.add('auditLog:export');
        break;
      }
      case OrganizationAccessScope.DELETE: {
        permissions.add('organization:delete');
        break;
      }
      case OrganizationAccessScope.INTEGRATIONS: {
        permissions.add('oidc:modify');
        permissions.add('gitHubIntegration:modify');
        permissions.add('slackIntegration:modify');
        break;
      }
      case OrganizationAccessScope.MEMBERS: {
        // Note: We do not assign the following permission:
        // - 'member:modify
        // The reason for this is that we changed the behavior of checking the permissions for
        // the logic and it is not safe to translate them to the new permission layer.
        permissions.add('member:describe');
        break;
      }
      case ProjectAccessScope.ALERTS: {
        permissions.add('alert:modify');
        break;
      }
      case ProjectAccessScope.READ: {
        permissions.add('project:describe');
        break;
      }
      case ProjectAccessScope.DELETE: {
        permissions.add('project:delete');
        break;
      }
      case ProjectAccessScope.SETTINGS: {
        permissions.add('project:delete');
        permissions.add('project:modifySettings');
        permissions.add('schemaLinting:modifyProjectRules');
        break;
      }
      case TargetAccessScope.READ: {
        permissions.add('target:create');
        permissions.add('laboratory:describe');
        break;
      }
      case TargetAccessScope.REGISTRY_WRITE: {
        permissions.add('laboratory:modify');
        permissions.add('schemaCheck:approve');
        break;
      }
      case TargetAccessScope.TOKENS_WRITE: {
        permissions.add('targetAccessToken:modify');
        permissions.add('cdnAccessToken:modify');
        break;
      }
      case TargetAccessScope.SETTINGS: {
        permissions.add('target:modifySettings');
        permissions.add('laboratory:modifyPreflightScript');
        break;
      }
      case TargetAccessScope.DELETE: {
        permissions.add('target:delete');
        break;
      }
    }
  }

  return permissionsToPermissionsPerResourceLevelAssignment([
    ...OrganizationMemberPermissions.permissions.default,
    ...permissions,
  ]);
}

const organizationMemberRoleFields = sql`
  "organization_member_roles"."id"
  , "organization_member_roles"."name"
  , "organization_member_roles"."description"
  , "organization_member_roles"."locked" AS "isLocked"
  , "organization_member_roles"."scopes" AS "legacyScopes"
  , "organization_member_roles"."permissions"
  , "organization_member_roles"."organization_id" AS "organizationId"
  , to_json("organization_member_roles"."created_at") AS "createdAt"
  , (
    SELECT COUNT(*)
    FROM "organization_member" AS "om"
    WHERE "om"."role_id" = "organization_member_roles"."id"
  ) AS "membersCount"
`;

const predefinedRolesPermissions = {
  /**
   * Permissions the default admin role is assigned with (aka full access)
   **/
  admin: permissionsToPermissionsPerResourceLevelAssignment([
    ...OrganizationMemberPermissions.permissions.default,
    ...OrganizationMemberPermissions.permissions.assignable,
  ]),
  /**
   * Permissions the viewer role is assigned with (computed from legacy scopes)
   **/
  viewer: permissionsToPermissionsPerResourceLevelAssignment([
    ...OrganizationMemberPermissions.permissions.default,
    'support:manageTickets',
    'project:describe',
    'laboratory:describe',
  ]),
};
