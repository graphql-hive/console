import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { CommonQueryMethods, PostgresDatabasePool, psql } from '@hive/postgres';
import { batch } from '../../../shared/helpers';

const SchemaRevisionModel = z.object({
  id: z.string(),
  service: z.string().nullable(),
  digest: z.string(),
  revision: z.string(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable(),
  sdl: z.string(),
});

export type SchemaRevision = z.TypeOf<typeof SchemaRevisionModel>;

/** Thrown when a schema revision expired and was deleted before the publish that uses it was stored. */
export class SchemaRevisionUnavailableError extends Error {
  constructor() {
    super('The schema revision expired while it was being published.');
    this.name = 'SchemaRevisionUnavailableError';
  }
}

@Injectable({ scope: Scope.Operation })
export class SchemaRevisionStore {
  constructor(private pg: PostgresDatabasePool) {}

  async push(args: {
    projectId: string;
    service: string | null;
    revision: string;
    digest: string;
    sdl: string;
    expiresAt: Date;
  }): Promise<
    | { ok: { schemaRevision: SchemaRevision; isSkipped: boolean }; error?: never }
    | { error: { message: string }; ok?: never }
  > {
    return this.pg.transaction('pushSchemaRevision', async trx => {
      // An expired revision can no longer be published, so a new push with the same name replaces it.
      const expiredRevisions = await trx.any(psql`
        DELETE FROM "schema_revisions"
        WHERE "project_id" = ${args.projectId}
          AND "service_name" IS NOT DISTINCT FROM ${args.service}
          AND "revision" = ${args.revision}
          AND "first_published_at" IS NULL
          AND "expires_at" IS NOT NULL
          AND "expires_at" <= now()
        RETURNING "digest"
      `);
      const expiredDigests = z
        .array(z.object({ digest: z.string() }))
        .parse(expiredRevisions)
        .map(row => row.digest)
        .filter(digest => digest !== args.digest);

      if (expiredDigests.length) {
        await trx.query(psql`
          DELETE FROM "sdl_artifacts"
          WHERE "digest" = ANY(${psql.array(expiredDigests, 'text')})
            AND NOT EXISTS (
              SELECT 1
              FROM "schema_revisions"
              WHERE "schema_revisions"."digest" = "sdl_artifacts"."digest"
            )
        `);
      }

      const existing = await this.findForPush(trx, args);
      if (existing) {
        return this.toExistingRevisionResult(existing, args);
      }

      await trx.query(psql`
        INSERT INTO "sdl_artifacts" ("digest", "sdl", "hash_version")
        VALUES (${args.digest}, ${args.sdl}, 1)
        ON CONFLICT ("digest") DO NOTHING
      `);

      const revision = await trx.maybeOne(psql`
        INSERT INTO "schema_revisions" (
          "project_id", "service_name", "digest", "revision", "expires_at"
        ) VALUES (
          ${args.projectId}, ${args.service}, ${args.digest}, ${args.revision}, ${args.expiresAt.toISOString()}
        )
        ON CONFLICT DO NOTHING
        RETURNING
          "id"
          , "service_name" AS "service"
          , "digest"
          , "revision"
          , "created_at" AS "createdAt"
          , "expires_at" AS "expiresAt"
      `);

      if (!revision) {
        // A concurrent push created the same revision first.
        const concurrent = await this.findForPush(trx, args);
        if (!concurrent) {
          throw new Error('Schema revision conflict could not be resolved.');
        }
        return this.toExistingRevisionResult(concurrent, args);
      }

      return {
        ok: {
          schemaRevision: SchemaRevisionModel.parse(Object.assign({ sdl: args.sdl }, revision)),
          isSkipped: false,
        },
      };
    });
  }

  private async findForPush(
    trx: CommonQueryMethods,
    args: { projectId: string; service: string | null; revision: string },
  ): Promise<SchemaRevision | null> {
    const row = await trx.maybeOne(psql`
      SELECT
        r."id",
        r."service_name" AS "service",
        r."digest",
        r."revision",
        r."created_at" AS "createdAt",
        r."expires_at" AS "expiresAt",
        a."sdl"
      FROM "schema_revisions" r
      LEFT JOIN "sdl_artifacts" a ON a."digest" = r."digest"
      WHERE r."project_id" = ${args.projectId}
        AND r."service_name" IS NOT DISTINCT FROM ${args.service}
        AND r."revision" = ${args.revision}
      FOR UPDATE OF r
    `);
    return row ? SchemaRevisionModel.parse(row) : null;
  }

  private toExistingRevisionResult(
    schemaRevision: SchemaRevision,
    args: { service: string | null; revision: string; digest: string },
  ) {
    if (schemaRevision.digest !== args.digest) {
      return {
        error: {
          message: `Revision '${args.service ? `${args.service}@` : ''}${args.revision}' already exists with a different schema.\nExisting digest: ${schemaRevision.digest}\nSubmitted digest: ${args.digest}`,
        },
      };
    }

    return { ok: { schemaRevision, isSkipped: true } };
  }

  async getByRevision(args: {
    projectId: string;
    service: string | null;
    revision: string;
  }): Promise<SchemaRevision | null> {
    const row = await this.pg.maybeOne(psql`
      SELECT
        "schema_revisions"."id" AS "id"
        , "schema_revisions"."service_name" AS "service"
        , "schema_revisions"."digest" AS "digest"
        , "schema_revisions"."revision" AS "revision"
        , "schema_revisions"."created_at" AS "createdAt"
        , "schema_revisions"."expires_at" AS "expiresAt"
        , "sdl_artifacts"."sdl" AS "sdl"
      FROM
        "schema_revisions"
      JOIN
        "sdl_artifacts"
          ON "sdl_artifacts"."digest" = "schema_revisions"."digest"
      WHERE
        "schema_revisions"."project_id" = ${args.projectId}
        AND "schema_revisions"."service_name" IS NOT DISTINCT FROM ${args.service}
        AND "schema_revisions"."revision" = ${args.revision}
        AND (
          "schema_revisions"."expires_at" IS NULL
          OR "schema_revisions"."expires_at" > now()
        )
    `);
    return row ? SchemaRevisionModel.parse(row) : null;
  }

  /** Returns `false` when the revision no longer exists. */
  static async markPublished(id: string, trx: CommonQueryMethods): Promise<boolean> {
    const row = await trx.maybeOne(psql`
      UPDATE
        "schema_revisions"
      SET
        "first_published_at" = COALESCE("first_published_at", now())
        , "expires_at" = NULL
      WHERE "id" = ${id}
      RETURNING "id"
    `);
    return row !== null;
  }

  getById = batch(async (ids: Array<string>) => {
    const rows = await this.pg.any(psql`
      SELECT
        "schema_revisions"."id" AS "id"
        , "schema_revisions"."service_name" AS "service"
        , "schema_revisions"."digest" AS "digest"
        , "schema_revisions"."revision" AS "revision"
        , "schema_revisions"."created_at" AS "createdAt"
        , "schema_revisions"."expires_at" AS "expiresAt"
        , "sdl_artifacts"."sdl" AS "sdl"
      FROM
        "schema_revisions"
      JOIN
        "sdl_artifacts"
          ON "sdl_artifacts"."digest" = "schema_revisions"."digest"
      WHERE
        "schema_revisions"."id" = ANY(${psql.array(ids, 'uuid')})
    `);

    const items = new Map<string, SchemaRevision>();
    for (const row of rows) {
      const record = SchemaRevisionModel.parse(row);
      items.set(record.id, record);
    }

    return ids.map(id => Promise.resolve(items.get(id) ?? null));
  });
}
