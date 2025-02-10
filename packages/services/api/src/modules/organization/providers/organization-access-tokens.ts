import { Inject, Injectable, Scope } from 'graphql-modules';
import { DatabasePool, sql } from 'slonik';
import { z } from 'zod';
import { Organization } from '@hive/api';
import { PermissionsModel } from '../../auth/lib/authz';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import * as OrganizationAccessKey from '../lib/organization-access-key';
import { AssignedProjectsModel, ResourceAssignmentGroup } from './resource-assignments';

// TODO: specify characters
const TitleInputModel = z
  .string()
  .min(2, 'Minimum length is 2 characters.')
  .max(100, 'Maximum length is 100 characters.');

// TODO: specify characters
const DescriptionInputModel = z
  .string()
  .min(2, 'Minimum length is 2 characters.')
  .max(100, 'Maximum length is 100 characters.')
  .nullable();

const OrganizationAccessTokenModel = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.string(),
  title: z.string(),
  description: z.string(),
  permissions: z.array(PermissionsModel).nullable(),
  assignedResources: AssignedProjectsModel.nullable().transform(
    value => value ?? { mode: '*' as const, projects: [] },
  ),
});

type OrganizationAccessKeyRecord = z.TypeOf<typeof OrganizationAccessTokenModel>;

export class OrganizationAccessTokens {
  constructor(@Inject(PG_POOL_CONFIG) private pool: DatabasePool) {}

  async create(args: {
    organizationId: string;
    title: string;
    description: string;
    permissions: Array<string>;
    assignedResources: ResourceAssignmentGroup;
  }) {
    const titleResult = TitleInputModel.safeParse(args.title.trim());
    const descriptionResult = DescriptionInputModel.safeParse(args.description.trim());

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

    // TODO: validate permissions
    // TODO: validate assigned resources

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
        , ${args.organizationId}
        , ${titleResult.data}
        , ${descriptionResult.data}
        , ${sql.array(args.permissions, 'text')},
        , ${sql.jsonb(args.assignedResources)}
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
    title: string | null;
    permissions: Array<string> | null;
    assignedResources: ResourceAssignmentGroup | null;
  }) {
    const titleResult = TitleInputModel.nullable().safeParse(args.title?.trim());
    const descriptionResult = DescriptionInputModel.nullable().safeParse(args.description?.trim());

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

    const result = await this.pool.maybeOne<unknown>(sql`
      UPDATE
        "organization_access_tokens"
      SET
        "title" = COALESCE(${titleResult.data}, "title")
        , "description" = COALESCE(${descriptionResult.data}, "description")
        , "permissions" = COALESCE(${args.permissions}, "permissions")
        , "assigned_resources" = COALESCE(${sql.jsonb(args.assignedResources)}, "permissions")
      )
      WHERE
        "id" = ${args.organizationAccessTokenId}
      RETURNING
        ${organizationAccessTokenFields}
    `);

    return {
      type: 'success',
      organizationAccessToken: OrganizationAccessTokenModel.parse(result),
    };
  }

  async delete(args: { organizationAccessTokenId: string }) {
    await this.pool.query(sql`
      DELETE
      FROM
        "organization_access_tokens"
      WHERE
        "id" = ${args.organizationAccessTokenId}
    `);

    return {
      type: 'success' as const,
    };
  }
}

const organizationAccessTokenFields = sql`
  "id"
  , "organization_id" AS "organizationId"
  , to_json("created_at") AS "createdAt"
  , "title"
  , "description"
  , "permissions"
  , "assigned_resources" AS "assignedResources"
`;
