import { Inject, Injectable, Scope } from 'graphql-modules';
import { DatabasePool, sql } from 'slonik';
import { z } from 'zod';
import * as GraphQLSchema from '../../../__generated__/types';
import { isUUID } from '../../../shared/is-uuid';
import { InsufficientPermissionError, PermissionsModel, Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import * as OrganizationAccessKey from '../lib/organization-access-key';
import {
  AssignedProjectsModel,
  ResourceAssignmentGroup,
  ResourceAssignments,
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

const OrganizationAccessTokenModel = z.object({
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
});

export type OrganizationAccessToken = z.TypeOf<typeof OrganizationAccessTokenModel>;

@Injectable({
  scope: Scope.Operation,
})
export class OrganizationAccessTokens {
  logger: Logger;

  private findById: ReturnType<typeof findById>;

  constructor(
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    private resourceAssignments: ResourceAssignments,
    private idTranslator: IdTranslator,
    private session: Session,
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
        , ${sql.array(args.permissions, 'text')},
        , ${sql.jsonb(assignedResources)}
        , ${accessKey.hash}
        , ${accessKey.firstCharacters}
      )
      RETURNING
        ${organizationAccessTokenFields}
    `);

    const organizationAccessToken = OrganizationAccessTokenModel.parse(result);

    return {
      type: 'success' as const,
      organizationAccessToken,
      privateAccessKey: accessKey.privateAccessToken,
    };
  }

  async update(args: {
    organizationAccessTokenId: string;
    data: {
      title: string | null;
      description: string | null;
      permissions: Array<string> | null;
      assignedResources: GraphQLSchema.ResourceAssignmentInput | null;
    };
  }) {
    const record = await this.findById(args.organizationAccessTokenId);
    if (record === null) {
      throw new InsufficientPermissionError('accessToken:modify');
    }

    await this.session.assertPerformAction({
      action: 'accessToken:modify',
      organizationId: record.organizationId,
      params: { organizationId: record.organizationId },
    });

    const titleResult = TitleInputModel.nullable().safeParse(args.data.title);
    const descriptionResult = DescriptionInputModel.nullable().safeParse(args.data.description);

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

    let assignedResources: ResourceAssignmentGroup | null = null;

    if (args.data.assignedResources) {
      assignedResources =
        await this.resourceAssignments.transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
          record.organizationId,
          args.data.assignedResources,
        );
    }

    let permissions: Array<string> | null = null;
    if (args.data.permissions) {
      // TODO: validate permissions
      permissions = args.data.permissions;
    }

    const result = await this.pool.maybeOne<unknown>(sql`
      UPDATE
        "organization_access_tokens"
      SET
        "title" = COALESCE(${titleResult.data}, "title")
        , "description" = COALESCE(${descriptionResult.data}, "description")
        , "permissions" = COALESCE(${permissions}, "permissions")
        , "assigned_resources" = COALESCE(${sql.jsonb(assignedResources)}, "permissions")
      )
      WHERE
        "id" = ${args.organizationAccessTokenId}
      RETURNING
        ${organizationAccessTokenFields}
    `);

    return {
      type: 'success' as const,
      organizationAccessToken: OrganizationAccessTokenModel.parse(result),
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

    return {
      type: 'success' as const,
      organizationAccessTokenId: args.organizationAccessTokenId,
    };
  }
}

export function findById(deps: { pool: DatabasePool; logger: Logger }) {
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
