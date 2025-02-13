import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type CommonQueryMethods, type DatabasePool } from 'slonik';
import { z } from 'zod';
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
import * as OrganizationAccessKey from '../lib/organization-access-key';
import { assignablePermissions } from '../lib/organization-access-token-permissions';
import { OrganizationAccessTokensCache } from './organization-access-tokens-cache';
import {
  AssignedProjectsModel,
  resolveResourceAssignment,
  ResourceAssignments,
  translateResolvedResourcesToAuthorizationPolicyStatements,
} from './resource-assignments';

const TitleInputModel = z
  .string()
  .trim()
  .regex(/^[ a-zA-Z0-9_-]+$/, `Can only contain letters, numbers, " ", '_', and '-'.`)
  .min(2, 'Minimum length is 2 characters.')
  .max(100, 'Maximum length is 100 characters.');

const DescriptionInputModel = z
  .string()
  .trim()
  .max(248, 'Maximum length is 248 characters.')
  .nullable();

const OrganizationAccessTokenModel = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    createdAt: z.string(),
    title: z.string(),
    description: z.string(),
    permissions: z.array(PermissionsModel),
    assignedResources: AssignedProjectsModel.nullable().transform(
      value => value ?? { mode: '*' as const, projects: [] },
    ),
    firstCharacters: z.string(),
    hash: z.string(),
  })
  .transform(record => ({
    ...record,
    // We have these as a getter statement as they are
    // only used in the context of authorization, we do not need
    // to compute when querying a list of organization access tokens via the GraphQL API.
    get authorizationPolicyStatements() {
      const permissions = permissionsToPermissionsPerResourceLevelAssignment(record.permissions);
      const resolvedResources = resolveResourceAssignment({
        organizationId: record.organizationId,
        projects: record.assignedResources,
      });

      return translateResolvedResourcesToAuthorizationPolicyStatements(
        record.organizationId,
        permissions,
        resolvedResources,
      );
    },
  }));

export type OrganizationAccessToken = z.TypeOf<typeof OrganizationAccessTokenModel>;

@Injectable({
  scope: Scope.Operation,
})
export class OrganizationAccessTokens {
  logger: Logger;

  private findById: ReturnType<typeof findById>;

  constructor(
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    private cache: OrganizationAccessTokensCache,
    private resourceAssignments: ResourceAssignments,
    private idTranslator: IdTranslator,
    private session: Session,
    private auditLogs: AuditLogRecorder,
    logger: Logger,
  ) {
    this.logger = logger.child({
      source: 'OrganizationAccessTokens',
    });
    this.findById = findById({ logger: this.logger, pool });
  }

  async create(args: {
    organization: GraphQLSchema.OrganizationReferenceInput;
    title: string;
    description: string | null;
    permissions: Array<string>;
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

    const { organizationId } = await this.idTranslator.resolveOrganizationReference({
      reference: args.organization,
      onError() {
        throw new InsufficientPermissionError('accessToken:modify');
      },
    });

    await this.session.assertPerformAction({
      organizationId,
      params: { organizationId },
      action: 'accessToken:modify',
    });

    const assignedResources =
      await this.resourceAssignments.transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
        organizationId,
        args.assignedResources ?? { mode: 'granular' },
      );

    const permissions = Array.from(
      new Set(
        args.permissions.filter(permission => assignablePermissions.has(permission as Permission)),
      ),
    );

    const id = crypto.randomUUID();
    const accessKey = await OrganizationAccessKey.create(id);

    const result = await this.pool.maybeOne<unknown>(sql`
      INSERT INTO "organization_access_tokens" (
        "id"
        , "organization_id"
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
        , ${titleResult.data}
        , ${descriptionResult.data}
        , ${sql.array(permissions, 'text')}
        , ${sql.jsonb(assignedResources)}
        , ${accessKey.hash}
        , ${accessKey.firstCharacters}
      )
      RETURNING
        ${organizationAccessTokenFields}
    `);

    const organizationAccessToken = OrganizationAccessTokenModel.parse(result);

    await this.cache.add(organizationAccessToken);

    await this.auditLogs.record({
      organizationId,
      eventType: 'ORGANIZATION_ACCESS_TOKEN_CREATED',
      metadata: {
        organizationAccessTokenId: organizationAccessToken.id,
      },
    });

    return {
      type: 'success' as const,
      organizationAccessToken,
      privateAccessKey: accessKey.privateAccessToken,
    };
  }

  async delete(args: { organizationAccessTokenId: string }) {
    const record = await this.findById(args.organizationAccessTokenId);
    if (record === null) {
      throw new InsufficientPermissionError('accessToken:modify');
    }

    await this.session.assertPerformAction({
      action: 'accessToken:modify',
      organizationId: record.organizationId,
      params: { organizationId: record.organizationId },
    });

    await this.pool.query(sql`
      DELETE
      FROM
        "organization_access_tokens"
      WHERE
        "id" = ${args.organizationAccessTokenId}
    `);

    await this.cache.purge(record);

    await this.auditLogs.record({
      organizationId: record.organizationId,
      eventType: 'ORGANIZATION_ACCESS_TOKEN_DELETED',
      metadata: {
        organizationAccessTokenId: record.id,
      },
    });

    return {
      type: 'success' as const,
      organizationAccessTokenId: args.organizationAccessTokenId,
    };
  }

  async getPaginated(args: { organizationId: string; first: number | null; after: string | null }) {
    await this.session.assertPerformAction({
      organizationId: args.organizationId,
      params: { organizationId: args.organizationId },
      action: 'accessToken:modify',
    });

    let cursor: null | {
      createdAt: string;
      id: string;
    } = null;

    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

    if (args.after) {
      cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.after);
    }

    const result = await this.pool.any<unknown>(sql` /* OrganizationAccessTokens.getPaginated */
      SELECT
        ${organizationAccessTokenFields}
      FROM
        "organization_access_tokens"
      WHERE
        "organization_id" = ${args.organizationId}
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
        , "created_at" DESC
        , "id" DESC
      LIMIT ${limit + 1}
    `);

    let edges = result.map(row => {
      const node = OrganizationAccessTokenModel.parse(row);

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
}

/**
 * Implementation for finding a organization access token from the PG database.
 * It is a function, so we can use it for the organization access tokens cache.
 */
export function findById(deps: { pool: CommonQueryMethods; logger: Logger }) {
  return async function findByIdImplementation(organizationAccessTokenId: string) {
    deps.logger.debug(
      'Resolve organization access token by id. (organizationAccessTokenId=%s)',
      organizationAccessTokenId,
    );

    if (isUUID(organizationAccessTokenId) === false) {
      deps.logger.debug(
        'Invalid UUID provided. (organizationAccessTokenId=%s)',
        organizationAccessTokenId,
      );
      return null;
    }

    const data = await deps.pool.maybeOne<unknown>(sql`
      SELECT
        ${organizationAccessTokenFields}
      FROM
        "organization_access_tokens"
      WHERE
        "id" = ${organizationAccessTokenId}
      LIMIT 1
    `);

    if (data === null) {
      deps.logger.debug(
        'Organization access token not found. (organizationAccessTokenId=%s)',
        organizationAccessTokenId,
      );
      return null;
    }

    const result = OrganizationAccessTokenModel.parse(data);

    deps.logger.debug(
      'Organization access token found. (organizationAccessTokenId=%s)',
      organizationAccessTokenId,
    );

    return result;
  };
}

const organizationAccessTokenFields = sql`
  "id"
  , "organization_id" AS "organizationId"
  , to_json("created_at") AS "createdAt"
  , "title"
  , "description"
  , "permissions"
  , "assigned_resources" AS "assignedResources"
  , "first_characters" AS "firstCharacters"
  , "hash"
`;
