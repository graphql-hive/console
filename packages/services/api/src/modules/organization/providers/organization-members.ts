import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
} from '@hive/storage';
import { type Organization } from '../../../shared/entities';
import { batchBy } from '../../../shared/helpers';
import { AuthorizationPolicyStatement } from '../../auth/lib/authz';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import {
  ResourceAssignmentModel,
  type ResourceAssignmentGroup,
} from '../lib/resource-assignment-model';
import { OrganizationMemberRoles, type OrganizationMemberRole } from './organization-member-roles';
import {
  resolveResourceAssignment,
  translateResolvedResourcesToAuthorizationPolicyStatements,
} from './resource-assignments';

const RawOrganizationMembershipModel = z.object({
  userId: z.string(),
  roleId: z.string(),
  connectedToZendesk: z
    .boolean()
    .nullable()
    .transform(value => value ?? false),
  /**
   * Resources that are assigned to the membership
   * If no resources are defined the permissions of the role are applied to all resources within the organization.
   */
  assignedResources: ResourceAssignmentModel.nullable().transform(
    value => value ?? { mode: '*' as const, projects: [] },
  ),
  createdAt: z.string(),
});

export type OrganizationMembershipRoleAssignment = {
  role: OrganizationMemberRole;
  /**
   * Resource assignments as stored within the database.
   * They are used for displaying the selection UI on the frontend.
   */
  resources: ResourceAssignmentGroup;
  /**
   * Resolved policy statements
   */
  authorizationPolicyStatements: AuthorizationPolicyStatement[];
};

export type OrganizationMembership = {
  organizationId: string;
  isOwner: boolean;
  userId: string;
  assignedRole: OrganizationMembershipRoleAssignment;
  connectedToZendesk: boolean;
  createdAt: string;
};

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class OrganizationMembers {
  private logger: Logger;

  constructor(
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    private organizationMemberRoles: OrganizationMemberRoles,
    logger: Logger,
  ) {
    this.logger = logger.child({
      source: 'OrganizationMembers',
    });
  }

  private async findOrganizationMembers(
    organizationId: string,
    userIds: Array<string> | null = null,
  ) {
    const query = sql`
      SELECT
        ${organizationMemberFields(sql`"om"`)}
      FROM
        "organization_member" AS "om"
      WHERE
        "om"."organization_id" = ${organizationId}
        ${userIds ? sql`AND "om"."user_id" = ANY(${sql.array(userIds, 'uuid')})` : sql``}
    `;

    const result = await this.pool.any<unknown>(query);
    return result.map(row => RawOrganizationMembershipModel.parse(row));
  }

  /**
   * Handles legacy scopes and role assignments and automatically transforms
   * them into resource based role assignments.
   */
  private async resolveMemberships(
    organization: Organization,
    organizationMembers: Array<z.TypeOf<typeof RawOrganizationMembershipModel>>,
  ) {
    const organizationMembershipByUserId = new Map</* userId */ string, OrganizationMembership>();

    // Roles that are assigned using the legacy "single role" way
    const roleLookups = new Set<string>();

    for (const record of organizationMembers) {
      roleLookups.add(record.roleId);
    }

    if (roleLookups.size) {
      // This handles the legacy "single" role assignments
      // We load the roles and then attach them to the already loaded membership role
      const roleIds = Array.from(roleLookups);

      this.logger.debug('Lookup role assignments. (roleIds=%o)', roleIds);

      const memberRolesById = await this.organizationMemberRoles.findMemberRolesByIds(roleIds);

      for (const record of organizationMembers) {
        const membershipRole = memberRolesById.get(record.roleId);
        if (!membershipRole) {
          throw new Error('Could not resolve role.');
        }

        const resources: ResourceAssignmentGroup = record.assignedResources ?? {
          mode: '*',
          projects: [],
        };

        organizationMembershipByUserId.set(record.userId, {
          organizationId: organization.id,
          userId: record.userId,
          isOwner: organization.ownerId === record.userId,
          connectedToZendesk: record.connectedToZendesk,
          assignedRole: {
            role: membershipRole,
            resources,
            // We have these as a getter statement as they are
            // only used in the context of authorization, we do not need
            // to compute when querying a list of organization mambers via the GraphQL API.
            get authorizationPolicyStatements() {
              const resolvedResources = resolveResourceAssignment({
                organizationId: organization.id,
                projects: resources,
              });

              return translateResolvedResourcesToAuthorizationPolicyStatements(
                organization.id,
                membershipRole.permissions,
                resolvedResources,
              );
            },
          },
          createdAt: record.createdAt,
        });
      }
    }

    return organizationMembershipByUserId;
  }

  async getPaginatedOrganizationMembersForOrganization(
    organization: Organization,
    args: { first: number | null; after: string | null },
  ) {
    this.logger.debug(
      'Find paginated organization members for organization. (organizationId=%s)',
      organization.id,
    );

    const first = args.first ?? 200;
    const cursor = args.after ? decodeCreatedAtAndUUIDIdBasedCursor(args.after) : null;

    const query = sql`
      SELECT
        ${organizationMemberFields(sql`"om"`)}
      FROM
        "organization_member" AS "om"
      WHERE
        "om"."organization_id" = ${organization.id}
        ${
          cursor
            ? sql`
                AND (
                  "om"."created_at" < ${cursor.createdAt}
                  OR (
                    "om"."created_at" = ${cursor.createdAt}
                    AND "om"."user_id" < ${cursor.id}
                  )
                )
              `
            : sql``
        }
      ORDER BY
        "om"."organization_id" DESC
        , "om"."user_id" DESC
        , "om"."user_id" DESC
      LIMIT ${first + 1}
    `;

    const result = await this.pool.any<unknown>(query);
    const hasNextPage = result.length > first;

    const organizationMembers = result
      .slice(0, first)
      .map(row => RawOrganizationMembershipModel.parse(row));
    const mapping = await this.resolveMemberships(organization, organizationMembers);

    const edges = organizationMembers.map(record => {
      const node = mapping.get(record.userId);
      if (!node) {
        throw new Error('Could not find member.');
      }
      return {
        node,
        get cursor() {
          return encodeCreatedAtAndUUIDIdBasedCursor({
            createdAt: node.createdAt,
            id: node.userId,
          });
        },
      };
    });

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!cursor,
        get endCursor() {
          return edges.at(-1)?.cursor ?? '';
        },
        get startCursor() {
          return edges.at(0)?.cursor ?? '';
        },
      },
    };
  }

  /**
   * Batched loader function for a organization membership.
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

      const organizationMembers = await this.findOrganizationMembers(organization.id, userIds);
      const mapping = await this.resolveMemberships(organization, organizationMembers);

      return userIds.map(async userId => mapping.get(userId) ?? null);
    },
  );

  findOrganizationOwner(organization: Organization): Promise<OrganizationMembership | null> {
    return this.findOrganizationMembership({
      organization,
      userId: organization.ownerId,
    });
  }

  async findOrganizationMembershipByEmail(
    organization: Organization,
    email: string,
  ): Promise<OrganizationMembership | null> {
    this.logger.debug(
      'Find organization membership by email. (organizationId=%s, email=%s)',
      organization.id,
      email,
    );
    const query = sql`
      SELECT
        ${organizationMemberFields(sql`"om"`)}
      FROM
        "organization_member" AS "om"
        INNER JOIN "users" AS "u"
          ON "u"."id" = "om"."user_id"
      WHERE
        "om"."organization_id" = ${organization.id}
        AND lower("u"."email") = lower(${email})
      LIMIT 1
    `;

    const result = await this.pool.maybeOne<unknown>(query);
    if (result === null) {
      return null;
    }

    const membership = RawOrganizationMembershipModel.parse(result);
    const mapping = await this.resolveMemberships(organization, [membership]);
    return mapping.get(membership.userId) ?? null;
  }

  async assignOrganizationMemberRole(args: {
    organizationId: string;
    roleId: string;
    userId: string;
    resourceAssignmentGroup: ResourceAssignmentGroup;
  }) {
    await this.pool.query(
      sql`/* assignOrganizationMemberRole */
        UPDATE
          "organization_member"
        SET
          "role_id" = ${args.roleId}
          , "assigned_resources" = ${JSON.stringify(
            /** we parse it to avoid additional properties being stored within the database. */
            ResourceAssignmentModel.parse(args.resourceAssignmentGroup),
          )}
        WHERE
          "organization_id" = ${args.organizationId}
          AND "user_id" = ${args.userId}
      `,
    );
  }
}

const organizationMemberFields = (prefix = sql`"organization_member"`) => sql`
  ${prefix}."user_id" AS "userId"
  , ${prefix}."role_id" AS "roleId"
  , ${prefix}."connected_to_zendesk" AS "connectedToZendesk"
  , ${prefix}."assigned_resources" AS "assignedResources"
  , to_json(${prefix}."created_at") AS "createdAt"
`;
