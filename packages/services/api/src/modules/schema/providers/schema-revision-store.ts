import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';
import { batch } from '../../../shared/helpers';

const SchemaRevisionModel = z.object({
  id: z.string(),
  service: z.string().nullable(),
  digest: z.string(),
  version: z.string(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable(),
  sdl: z.string(),
});

export type SchemaRevision = z.TypeOf<typeof SchemaRevisionModel>;

class SchemaVersionConflictError extends Error {
  constructor(
    readonly service: string | null,
    readonly version: string,
    readonly existingDigest: string,
    readonly submittedDigest: string,
  ) {
    super(
      `Version ${service ? `${service}@` : ''}${version} already exists with a different schema.\nExisting digest: ${existingDigest}\nSubmitted digest: ${submittedDigest}`,
    );
  }
}

@Injectable({ scope: Scope.Operation })
export class SchemaRevisionStore {
  constructor(private pg: PostgresDatabasePool) {}

  async push(args: {
    projectId: string;
    service: string | null;
    version: string;
    digest: string;
    sdl: string;
    expiresAt: Date;
  }): Promise<
    | { ok: { schemaRevision: SchemaRevision }; error?: never }
    | { error: { message: string }; ok?: never }
  > {
    return this.pg.transaction('pushSchemaRevision', async trx => {
      const existing = await trx.maybeOne(psql`
        SELECT
          r."id",
          r."service_name" AS "service",
          r."digest",
          r."version",
          r."created_at" AS "createdAt",
          r."expires_at" AS "expiresAt",
          a."sdl"
        FROM "schema_revisions" r
        LEFT JOIN "sdl_artifacts" a ON a."digest" = r."digest"
        WHERE r."project_id" = ${args.projectId}
          AND r."service_name" IS NOT DISTINCT FROM ${args.service}
          AND r."version" = ${args.version}
        FOR UPDATE OF r
      `);

      if (existing) {
        const schemaRevision = SchemaRevisionModel.parse(existing);
        if (schemaRevision.digest !== args.digest) {
          return {
            error: new SchemaVersionConflictError(
              args.service,
              args.version,
              schemaRevision.digest,
              args.digest,
            ),
          };
        }

        return { ok: { schemaRevision } };
      }

      await trx.query(psql`
        INSERT INTO "sdl_artifacts" ("digest", "sdl", "hash_version")
        VALUES (${args.digest}, ${args.sdl}, 1)
        ON CONFLICT ("digest") DO NOTHING
      `);

      const revision = await trx.one(psql`
        INSERT INTO "schema_revisions" (
          "project_id", "service_name", "digest", "version", "expires_at"
        ) VALUES (
          ${args.projectId}, ${args.service}, ${args.digest}, ${args.version}, ${args.expiresAt.toISOString()}
        )
        RETURNING
          "id"
          , "service_name" AS "service"
          , "digest"
          , "version"
          , "created_at" AS "createdAt"
          , "expires_at" AS "expiresAt"
      `);

      return {
        ok: {
          schemaRevision: SchemaRevisionModel.parse(Object.assign({ sdl: args.sdl }, revision)),
        },
      };
    });
  }

  async get(args: {
    projectId: string;
    service: string | null;
    version: string;
  }): Promise<SchemaRevision | null> {
    const row = await this.pg.maybeOne(psql`
      SELECT
        "schema_revisions"."id"
        , "schema_revisions"."service_name" AS "service"
        , "schema_revisions"."digest"
        , "schema_revisions"."version"
        , "schema_revisions"."created_at" AS "createdAt"
        , "schema_revisions"."expires_at" AS "expiresAt"
        , "sdl_artifacts"."sdl"
      FROM
        "schema_revisions"
      JOIN
        "sdl_artifacts"
          ON "sdl_artifacts"."digest" = "schema_revisions"."digest"
      WHERE
        "schema_revisions"."project_id" = ${args.projectId}
        AND "schema_revisions"."service_name" = ${args.service}
        AND "schema_revisions"."version" = ${args.version}
        AND (
          "schema_revisions"."expires_at" IS NULL
          OR "schema_revisions"."expires_at" > now()
        )
    `);
    return row ? SchemaRevisionModel.parse(row) : null;
  }

  async markPublished(id: string): Promise<void> {
    await this.pg.query(psql`
      UPDATE
        "schema_revisions"
      SET
        "first_published_at" = COALESCE("first_published_at", now())
        , "expires_at" = NULL
      WHERE "id" = ${id}
    `);
  }

  getById = batch(async (ids: Array<string>) => {
    const rows = await this.pg.any(psql`
      SELECT
        "schema_revisions"."id"
        , "schema_revisions"."service_name" AS "service"
        , "schema_revisions"."digest"
        , "schema_revisions"."version"
        , "schema_revisions"."created_at" AS "createdAt"
        , "schema_revisions"."expires_at" AS "expiresAt"
        , "sdl_artifacts"."sdl"
      FROM
        "schema_revisions"
      JOIN
        "sdl_artifacts"
          ON sdl_artifacts"."digest" = "schema_revisions"."digest"
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
