import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type CommonQueryMethods, type DatabasePool } from 'slonik';
import z from 'zod';
import { cache } from '@hive/api/shared/helpers';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
} from '@hive/storage';
import * as GraphQLSchema from '../../../__generated__/types';
import { isUUID } from '../../../shared/is-uuid';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import {
  InsufficientPermissionError,
  Permission,
  PermissionsModel,
  permissionsToPermissionsPerResourceLevelAssignment,
  Session,
} from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { Storage } from '../../shared/providers/storage';
import * as PersonalAccessKey from '../lib/personal-access-key';
import {
  intersectResourceAssignments,
  ResourceAssignmentModel,
} from '../lib/resource-assignment-model';
import { DescriptionInputModel, TitleInputModel } from './organization-access-tokens';
import { OrganizationMembers, OrganizationMembership } from './organization-members';
import { PersonalAccessTokensCache } from './personal-access-tokens-cache';
import {
  resolveResourceAssignment,
  ResourceAssignments,
  translateResolvedResourcesToAuthorizationPolicyStatements,
} from './resource-assignments';

@Injectable({
  scope: Scope.Operation,
})
export class PersonalAccessTokens {
  logger: Logger;

  constructor(
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    private cache: PersonalAccessTokensCache,
    private resourceAssignments: ResourceAssignments,
    private idTranslator: IdTranslator,
    private session: Session,
    private auditLogs: AuditLogRecorder,
    private storage: Storage,
    private organizationMembers: OrganizationMembers,
    logger: Logger,
  ) {
    this.logger = logger.child({
      source: 'OrganizationAccessTokens',
    });
  }

  async create(args: {
    organization: GraphQLSchema.OrganizationReferenceInput;
    title: string;
    description: string | null;
    permissions: ReadonlyArray<string> | null;
    assignedResources: GraphQLSchema.ResourceAssignmentInput | null;
  }) {
    const titleResult = TitleInputModel.safeParse(args.title.trim());
    const descriptionResult = DescriptionInputModel.safeParse(args.description);

    if (titleResult.error || descriptionResult.error) {
      return {
        type: 'error' as const,
        message: 'Invalid input provided.',
        details: {
          title: titleResult.error?.issues.at(0)?.message ?? null,
          description: descriptionResult.error?.issues.at(0)?.message ?? null,
        },
      };
    }

    const viewer = await this.session.getViewer();
    const { organizationId } = await this.idTranslator.resolveOrganizationReference({
      reference: args.organization,
      onError() {
        throw new InsufficientPermissionError('personalAccessToken:modify');
      },
    });

    await this.session.assertPerformAction({
      organizationId,
      params: { organizationId },
      action: 'personalAccessToken:modify',
    });

    const organization = await this.storage.getOrganization({ organizationId });

    const membership = await this.organizationMembers.findOrganizationMembership({
      organization,
      userId: viewer.id,
    });

    if (!membership) {
      throw new Error('Impossible if we got this far.');
    }

    // We resolve the input to a resource assignment
    let assignedResources =
      await this.resourceAssignments.transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
        organizationId,
        args.assignedResources ?? { mode: 'ALL' },
      );

    // Filter down resource assignment based on the viewers role
    // Technically we could also raise an exception/error here, but this does it for now.
    assignedResources = intersectResourceAssignments(
      membership.assignedRole.resources,
      assignedResources,
    );

    // Filter permissions based on viewers current permissions
    const allPermissions = membership.assignedRole.role.allPermissions;
    const permissions =
      args.permissions !== null
        ? Array.from(
            new Set(
              args.permissions.filter(permission => allPermissions.has(permission as Permission)),
            ),
          )
        : null;

    const id = crypto.randomUUID();
    const accessKey = await PersonalAccessKey.create(id);

    const result = await this.pool.maybeOne<unknown>(sql`
      INSERT INTO "personal_access_tokens" (
        "id"
        , "organization_id"
        , "user_id"
        , "title"
        , "description"
        , "permissions"
        , "assigned_resources"
        , "hash"
        , "first_characters"
      )
      VALUES (
        ${id}
        , ${organizationId}
        , ${viewer.id}
        , ${titleResult.data}
        , ${descriptionResult.data}
        , ${permissions == null ? null : sql.array(permissions, 'text')}
        , ${sql.jsonb(assignedResources)}
        , ${accessKey.hash}
        , ${accessKey.firstCharacters}
      )
      RETURNING
        ${personalAccessTokenFields}
    `);

    const personalAccessToken = PersonalAccessTokenModel.parse(result);

    await this.cache.add(personalAccessToken, membership);

    await this.auditLogs.record({
      organizationId,
      eventType: 'PERSONAL_ACCESS_TOKEN_CREATED',
      metadata: {
        organizationAccessTokenId: personalAccessToken.id,
        userId: viewer.id,
        permissions: personalAccessToken.permissions,
        assignedResources: personalAccessToken.assignedResources,
      },
    });

    return {
      type: 'success' as const,
      personalAccessToken: personalAccessToken,
      privateAccessKey: accessKey.privateAccessToken,
    };
  }

  async delete(args: { personalAccessTokenId: string }) {
    const viewer = await this.session.getViewer();

    const record = await PersonalAccessTokens.findById({
      pool: this.pool,
      logger: this.logger,
    })(args.personalAccessTokenId);

    if (!record) {
      return null;
    }

    await this.session.assertPerformAction({
      organizationId: record.organizationId,
      params: { organizationId: record.organizationId },
      action: 'personalAccessToken:modify',
    });

    if (record.userId !== viewer.id) {
      return null;
    }

    await this.pool.query(sql`
      DELETE
      FROM
        "personal_access_tokens"
      WHERE
        "id" = ${args.personalAccessTokenId}
    `);

    await this.cache.delete(record);

    await this.auditLogs.record({
      organizationId: record.organizationId,
      eventType: 'PERSONAL_ACCESS_TOKEN_DELETED',
      metadata: {
        organizationAccessTokenId: record.id,
        userId: viewer.id,
      },
    });

    return {
      type: 'success' as const,
      personalAccessTokenId: args.personalAccessTokenId,
    };
  }

  async getPaginatedForMembership(
    membership: OrganizationMembership,
    args: { first: number | null; after: string | null },
  ) {
    await this.session.assertPerformAction({
      organizationId: membership.organizationId,
      params: { organizationId: membership.organizationId },
      action: 'personalAccessToken:modify',
    });

    let cursor: null | {
      createdAt: string;
      id: string;
    } = null;

    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

    if (args.after) {
      cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.after);
    }

    const result = await this.pool.any<unknown>(sql` /* PersonalAccessTokens.getPaginated */
      SELECT
        ${personalAccessTokenFields}
      FROM
        "personal_access_tokens"
      WHERE
        "organization_id" = ${membership.organizationId}
        AND "user_id" = ${membership.userId}
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
        "organization_id" ASC
        , "user_id" ASC
        , "created_at" DESC
        , "id" DESC
      LIMIT ${limit + 1}
    `);

    let edges = result.map(row => {
      const node = PersonalAccessTokenModel.parse(row);

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

  async findByIdForMembership(membership: OrganizationMembership, accessTokenId: string) {
    await this.session.assertPerformAction({
      organizationId: membership.organizationId,
      params: { organizationId: membership.organizationId },
      action: 'personalAccessToken:modify',
    });

    const accessToken = await PersonalAccessTokens.findById({
      logger: this.logger,
      pool: this.pool,
    })(accessTokenId);

    if (!accessToken) {
      return null;
    }

    return accessToken;
  }

  /**
   * Implementation for finding a personal access token from the PG database.
   * It is a static function, so we can use it for the personal access tokens cache.
   */
  static findById(deps: { pool: CommonQueryMethods; logger: Logger }) {
    return async function findByIdImplementation(personalAccessTokenId: string) {
      deps.logger.debug(
        'Resolve organization access token by id. (personalAccessTokenId=%s)',
        personalAccessTokenId,
      );

      if (isUUID(personalAccessTokenId) === false) {
        deps.logger.debug(
          'Invalid UUID provided. (personalAccessTokenId=%s)',
          personalAccessTokenId,
        );
        return null;
      }

      const data = await deps.pool.maybeOne<unknown>(sql`
        SELECT
          ${personalAccessTokenFields}
        FROM
          "personal_access_tokens"
        WHERE
          "id" = ${personalAccessTokenId}
        LIMIT 1
      `);

      if (data === null) {
        deps.logger.debug(
          'Personal access token not found. (organizationAccessTokenId=%s)',
          personalAccessTokenId,
        );
        return null;
      }

      const result = PersonalAccessTokenModel.parse(data);

      deps.logger.debug(
        'Personal access token found. (organizationAccessTokenId=%s)',
        personalAccessTokenId,
      );

      return result;
    };
  }

  static computeResources(
    personalAccessToken: PersonalAccessToken,
    membership: OrganizationMembership,
  ) {
    const legitAssignedResources = intersectResourceAssignments(
      membership.assignedRole.resources,
      personalAccessToken.assignedResources,
    );

    return legitAssignedResources;
  }

  static computePermissions(
    personalAccessToken: PersonalAccessToken,
    membership: OrganizationMembership,
  ) {
    // If the access token specifies no permissions, we use the permissions of the member role
    if (personalAccessToken.permissions === null) {
      return membership.assignedRole.role.allPermissions;
    }

    // The roles permission could have been updated.
    // Because of that we always need to filter this list based on the role.
    return intersection(
      new Set(personalAccessToken.permissions),
      membership.assignedRole.role.allPermissions,
    );
  }

  static computeAuthorizationStatements(
    personalAccessToken: PersonalAccessToken,
    membership: OrganizationMembership,
  ) {
    const permissions = PersonalAccessTokens.computePermissions(personalAccessToken, membership);
    const resources = PersonalAccessTokens.computeResources(personalAccessToken, membership);

    const permissionsPerLevel = permissionsToPermissionsPerResourceLevelAssignment(permissions);
    const resolvedResources = resolveResourceAssignment({
      organizationId: personalAccessToken.organizationId,
      projects: resources,
    });

    return translateResolvedResourcesToAuthorizationPolicyStatements(
      personalAccessToken.organizationId,
      permissionsPerLevel,
      resolvedResources,
    );
  }

  @cache(
    (args: { organizationId: string; userId: string }) => args.organizationId + '|' + args.userId,
  )
  async getMembership(args: { organizationId: string; userId: string }) {
    const organization = await this.storage.getOrganization({
      organizationId: args.organizationId,
    });
    const membership = await this.organizationMembers.findOrganizationMembership({
      organization,
      userId: args.userId,
    });

    if (!membership) {
      throw new Error('Should be able to find membership.');
    }

    return membership;
  }

  async getResourcesForPersonalAccessToken(personalAccessToken: PersonalAccessToken) {
    const membership = await this.getMembership({
      organizationId: personalAccessToken.organizationId,
      userId: personalAccessToken.userId,
    });

    return PersonalAccessTokens.computeResources(personalAccessToken, membership);
  }

  async getPermissionsForPersonalAccessToken(personalAccessToken: PersonalAccessToken) {
    const membership = await this.getMembership({
      organizationId: personalAccessToken.organizationId,
      userId: personalAccessToken.userId,
    });

    return PersonalAccessTokens.computePermissions(personalAccessToken, membership);
  }
}

const personalAccessTokenFields = sql`
  "id"
  , "organization_id" AS "organizationId"
  , "user_id" AS "userId"
  , to_json("created_at") AS "createdAt"
  , "title"
  , "description"
  , "permissions"
  , "assigned_resources" AS "assignedResources"
  , "first_characters" AS "firstCharacters"
  , "hash"
`;

const PersonalAccessTokenModel = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.string(),
  title: z.string(),
  description: z.string(),
  permissions: z.array(PermissionsModel).nullable(),
  assignedResources: ResourceAssignmentModel.nullable().transform(
    value => value ?? { mode: '*' as const, projects: [] },
  ),
  firstCharacters: z.string(),
  hash: z.string(),
});

export type PersonalAccessToken = z.TypeOf<typeof PersonalAccessTokenModel>;

function intersection<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  const result = new Set<T>();
  for (const item of setA) {
    if (setB.has(item)) {
      result.add(item);
    }
  }
  return result;
}
