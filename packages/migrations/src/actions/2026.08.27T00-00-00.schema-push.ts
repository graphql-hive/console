import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.08.27T00-00-00.schema-push.ts',
  run: ({ psql }) => psql`
    CREATE TABLE "sdl_artifacts" (
      "digest" text PRIMARY KEY,
      "sdl" text NOT NULL,
      "hash_version" integer NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE "schema_revisions" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
      "service_name" text,
      "digest" text NOT NULL REFERENCES "sdl_artifacts"("digest"),
      "revision" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "expires_at" timestamptz,
      "first_published_at" timestamptz
    );

    CREATE UNIQUE INDEX "schema_revisions_revision_unique"
      ON "schema_revisions" ("project_id", "service_name", "revision") NULLS NOT DISTINCT;

    CREATE INDEX "schema_revisions_digest_idx"
      ON "schema_revisions" ("digest");

    CREATE INDEX "schema_revisions_expiry_idx"
      ON "schema_revisions" ("expires_at")
      WHERE "first_published_at" IS NULL AND "expires_at" IS NOT NULL;

    ALTER TABLE "schema_log"
      ADD COLUMN "schema_revision_id" uuid REFERENCES "schema_revisions"("id") ON DELETE SET NULL;

    CREATE INDEX "schema_log_schema_revision_id_idx"
      ON "schema_log" ("schema_revision_id")
      WHERE "schema_revision_id" IS NOT NULL;
  `,
} satisfies MigrationExecutor;
