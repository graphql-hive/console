import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.08.11T00-00-00.schema-check-base-sdl.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "schema_checks"
      ADD COLUMN "base_schema_sdl_store_id" text REFERENCES "sdl_store"("id"),
      ADD COLUMN "base_schema_hash" text
    ;

    CREATE INDEX "schema_check_by_base_schema_sdl_store_id"
      ON "schema_checks" ("base_schema_sdl_store_id")
    ;
  `,
} satisfies MigrationExecutor;
