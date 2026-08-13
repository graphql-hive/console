import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.08.11T00-00-00.schema-check-base-sdl.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "schema_checks"
      ADD COLUMN "base_schema_hash" text
      , ADD COLUMN "base_schema_sdl_store_id" text REFERENCES "sdl_store"("id")
      , ADD COLUMN "base_supergraph_sdl_store_id" text REFERENCES "sdl_store"("id")
      , ADD COLUMN "base_composite_schema_sdl_store_id" text REFERENCES "sdl_store"("id")
      , ADD COLUMN "base_schema_composition_errors" jsonb
    ;

    ALTER TABLE "contract_checks"
      ADD COLUMN "base_schema_supergraph_sdl_store_id" text REFERENCES "sdl_store"("id")
      , ADD COLUMN "base_composite_schema_sdl_store_id" text REFERENCES "sdl_store"("id")
      , ADD COLUMN "base_schema_composition_errors" jsonb
    ;

    CREATE INDEX "schema_check_by_base_schema_sdl_store_id"
    ON "schema_checks" ("base_schema_sdl_store_id")
    WHERE "base_schema_sdl_store_id" IS NOT NULL
    ;

    CREATE INDEX "schema_check_base_supergraph_sdl_store_id"
    ON "schema_checks" ("base_supergraph_sdl_store_id")
    WHERE "base_supergraph_sdl_store_id" IS NOT NULL
    ;

    CREATE INDEX "schema_check_base_composite_schema_sdl_store_id"
    ON "schema_checks" ("base_composite_schema_sdl_store_id")
    WHERE "base_composite_schema_sdl_store_id" IS NOT NULL
    ;

    CREATE INDEX "contract_checks_base_schema_supergraph_sdl_store_id"
    ON "contract_checks" ("base_schema_supergraph_sdl_store_id")
    WHERE "base_schema_supergraph_sdl_store_id" IS NOT NULL
    ;

    CREATE INDEX "contract_checks_base_composite_schema_sdl_store_id"
    ON "contract_checks" ("base_composite_schema_sdl_store_id")
    WHERE "base_composite_schema_sdl_store_id" IS NOT NULL
    ;
  `,
} satisfies MigrationExecutor;
