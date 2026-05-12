import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.05.07T00-00-00.schema-version-promotion.ts',
  run: ({ psql }) => psql`
    CREATE TYPE "hive_subgraph_log_type" AS ENUM (
      'added'
      , 'removed'
      , 'changed'
      , 'unchanged'
    );

    ALTER TABLE "schema_version_to_log"
      ADD COLUMN IF NOT EXISTS type hive_subgraph_log_type DEFAULT NULL
      , ADD COLUMN IF NOT EXISTS "previous_action_id" UUID DEFAULT NULL REFERENCES "schema_log"("id") ON DELETE CASCADE
      , ADD COLUMN IF NOT EXISTS "schema_changes" JSONB DEFAULT NULL
      , ADD COLUMN IF NOT EXISTS "subgraph_name" TEXT NULL
    ;

    CREATE INDEX IF NOT EXISTS "idx_schema_version_to_log_previous_action_id"
      ON schema_version_to_log ("previous_action_id")
    ;

    ALTER TABLE "schema_versions"
      ALTER COLUMN "action_id" DROP NOT NULL
      , ADD COLUMN IF NOT EXISTS "origin" jsonb NULL
      , ADD COLUMN IF NOT EXISTS "supergraph_changes" jsonb NULL
    ;
  `,
} satisfies MigrationExecutor;
