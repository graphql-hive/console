import { Injectable, Scope } from 'graphql-modules';
import * as zod from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
} from '@hive/storage';
import type {
  InsightsFilterData,
  SavedFilter,
  SavedFilterVisibility,
} from '../../../shared/entities';

const SavedFilterModel = zod.object({
  id: zod.string(),
  projectId: zod.string(),
  createdByUserId: zod.string(),
  updatedByUserId: zod.string().nullable(),
  name: zod.string(),
  description: zod.string().nullable(),
  filters: zod.object({
    operationHashes: zod.array(zod.string()),
    clientFilters: zod.array(
      zod.object({
        name: zod.string(),
        versions: zod.array(zod.string()).nullable(),
      }),
    ),
    dateRange: zod
      .object({
        from: zod.string(),
        to: zod.string(),
      })
      .nullable(),
    excludeOperations: zod.boolean().optional().default(false),
    excludeClientFilters: zod.boolean().optional().default(false),
  }),
  visibility: zod.enum(['private', 'shared']),
  viewsCount: zod.number(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

@Injectable({
  scope: Scope.Operation,
})
export class SavedFiltersStorage {
  constructor(private pool: PostgresDatabasePool) {}

  async getSavedFilter(args: { id: string }): Promise<SavedFilter | null> {
    const result = await this.pool.maybeOne(psql`/* getSavedFilter */
      SELECT
        "id"
        , "project_id" as "projectId"
        , "created_by_user_id" as "createdByUserId"
        , "updated_by_user_id" as "updatedByUserId"
        , "name"
        , "description"
        , "filters"
        , "visibility"
        , "views_count" as "viewsCount"
        , to_json("created_at") as "createdAt"
        , to_json("updated_at") as "updatedAt"
      FROM
        "saved_filters"
      WHERE
        "id" = ${args.id}
    `);

    if (result === null) {
      return null;
    }

    return SavedFilterModel.parse(result) as SavedFilter;
  }

  async getPaginatedSavedFiltersForProject(args: {
    projectId: string;
    userId: string;
    visibility: SavedFilterVisibility | null;
    search: string | null;
    first: number;
    cursor: string | null;
  }) {
    let cursor: null | {
      createdAt: string;
      id: string;
    } = null;

    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 50) : 50) : 50;

    if (args.cursor) {
      cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.cursor);
    }

    // Build visibility condition based on requested filter
    // When a specific visibility is requested, we can use a simpler condition
    // that allows better index usage than OR conditions
    const visibilityCondition =
      args.visibility === 'shared'
        ? psql`"visibility" = 'shared'`
        : args.visibility === 'private'
          ? psql`"visibility" = 'private' AND "created_by_user_id" = ${args.userId}`
          : psql`(
              "visibility" = 'shared'
              OR ("visibility" = 'private' AND "created_by_user_id" = ${args.userId})
            )`;

    const result = await this.pool.any(psql`/* getPaginatedSavedFiltersForProject */
      SELECT
        "id"
        , "project_id" as "projectId"
        , "created_by_user_id" as "createdByUserId"
        , "updated_by_user_id" as "updatedByUserId"
        , "name"
        , "description"
        , "filters"
        , "visibility"
        , "views_count" as "viewsCount"
        , to_json("created_at") as "createdAt"
        , to_json("updated_at") as "updatedAt"
      FROM
        "saved_filters"
      WHERE
        "project_id" = ${args.projectId}
        AND ${visibilityCondition}
        ${
          args.search
            ? psql`
              AND (
                "name" ILIKE ${'%' + args.search + '%'}
                OR "description" ILIKE ${'%' + args.search + '%'}
              )
            `
            : psql``
        }
        ${
          cursor
            ? psql`
              AND (
                (
                  "created_at" = ${cursor.createdAt}
                  AND "id" < ${cursor.id}
                )
                OR "created_at" < ${cursor.createdAt}
              )
            `
            : psql``
        }
      ORDER BY
        "project_id" ASC
        , "created_at" DESC
        , "id" DESC
      LIMIT ${limit + 1}
    `);

    let items = result.map(row => {
      const node = SavedFilterModel.parse(row) as SavedFilter;

      return {
        node,
        get cursor() {
          return encodeCreatedAtAndUUIDIdBasedCursor(node);
        },
      };
    });

    const hasNextPage = items.length > limit;

    items = items.slice(0, limit);

    return {
      edges: items,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        get endCursor() {
          return items[items.length - 1]?.cursor ?? '';
        },
        get startCursor() {
          return items[0]?.cursor ?? '';
        },
      },
    };
  }

  async createSavedFilter(args: {
    projectId: string;
    createdByUserId: string;
    name: string;
    description: string | null;
    filters: InsightsFilterData;
    visibility: SavedFilterVisibility;
  }): Promise<SavedFilter> {
    const result = await this.pool.one(psql`/* createSavedFilter */
      INSERT INTO "saved_filters" (
        "project_id"
        , "created_by_user_id"
        , "name"
        , "description"
        , "filters"
        , "visibility"
      )
      VALUES (
        ${args.projectId}
        , ${args.createdByUserId}
        , ${args.name}
        , ${args.description}
        , ${JSON.stringify(args.filters)}
        , ${args.visibility}
      )
      RETURNING
        "id"
        , "project_id" as "projectId"
        , "created_by_user_id" as "createdByUserId"
        , "updated_by_user_id" as "updatedByUserId"
        , "name"
        , "description"
        , "filters"
        , "visibility"
        , "views_count" as "viewsCount"
        , to_json("created_at") as "createdAt"
        , to_json("updated_at") as "updatedAt"
    `);

    return SavedFilterModel.parse(result) as SavedFilter;
  }

  async updateSavedFilter(args: {
    id: string;
    updatedByUserId: string;
    name: string | null;
    description: string | null;
    filters: InsightsFilterData | null;
    visibility: SavedFilterVisibility | null;
  }): Promise<SavedFilter | null> {
    const result = await this.pool.maybeOne(psql`/* updateSavedFilter */
      UPDATE
        "saved_filters"
      SET
        "name" = COALESCE(${args.name}, "name")
        , "description" = COALESCE(${args.description}, "description")
        , "filters" = COALESCE(${args.filters ? JSON.stringify(args.filters) : null}, "filters")
        , "visibility" = COALESCE(${args.visibility}, "visibility")
        , "updated_by_user_id" = ${args.updatedByUserId}
        , "updated_at" = NOW()
      WHERE
        "id" = ${args.id}
      RETURNING
        "id"
        , "project_id" as "projectId"
        , "created_by_user_id" as "createdByUserId"
        , "updated_by_user_id" as "updatedByUserId"
        , "name"
        , "description"
        , "filters"
        , "visibility"
        , "views_count" as "viewsCount"
        , to_json("created_at") as "createdAt"
        , to_json("updated_at") as "updatedAt"
    `);

    if (result === null) {
      return null;
    }

    return SavedFilterModel.parse(result) as SavedFilter;
  }

  async deleteSavedFilter(args: { id: string }): Promise<string | null> {
    const result = await this.pool.maybeOneFirst(psql`/* deleteSavedFilter */
      DELETE
      FROM
        "saved_filters"
      WHERE
        "id" = ${args.id}
      RETURNING
        "id"
    `);

    if (result == null) {
      return null;
    }

    return zod.string().parse(result);
  }

  async incrementSavedFilterViews(args: { id: string }): Promise<void> {
    await this.pool.query(psql`/* incrementSavedFilterViews */
      UPDATE
        "saved_filters"
      SET
        "views_count" = "views_count" + 1
      WHERE
        "id" = ${args.id}
    `);
  }
}
