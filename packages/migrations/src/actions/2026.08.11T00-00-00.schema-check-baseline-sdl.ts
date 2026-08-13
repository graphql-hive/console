import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.08.11T00-00-00.schema-check-baseline-sdl.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "schema_checks"
      ADD COLUMN "baseline_schema_hash" text
      , ADD COLUMN "baseline_schema_sdl_store_id" text REFERENCES "sdl_store"("id")
      , ADD COLUMN "baseline_supergraph_sdl_store_id" text REFERENCES "sdl_store"("id")
      , ADD COLUMN "baseline_composite_schema_sdl_store_id" text REFERENCES "sdl_store"("id")
      , ADD COLUMN "baseline_schema_composition_errors" jsonb
    ;

    ALTER TABLE "contract_checks"
      ADD COLUMN "baseline_supergraph_sdl_store_id" text REFERENCES "sdl_store"("id")
      , ADD COLUMN "baseline_composite_schema_sdl_store_id" text REFERENCES "sdl_store"("id")
      , ADD COLUMN "baseline_schema_composition_errors" jsonb
    ;

    CREATE INDEX "schema_check_by_baseline_schema_sdl_store_id"
    ON "schema_checks" ("baseline_schema_sdl_store_id")
    WHERE "baseline_schema_sdl_store_id" IS NOT NULL
    ;

    CREATE INDEX "schema_check_baseline_supergraph_sdl_store_id"
    ON "schema_checks" ("baseline_supergraph_sdl_store_id")
    WHERE "baseline_supergraph_sdl_store_id" IS NOT NULL
    ;

    CREATE INDEX "schema_check_baseline_composite_schema_sdl_store_id"
    ON "schema_checks" ("baseline_composite_schema_sdl_store_id")
    WHERE "baseline_composite_schema_sdl_store_id" IS NOT NULL
    ;

    CREATE INDEX "contract_checks_baseline_supergraph_sdl_store_id"
    ON "contract_checks" ("baseline_supergraph_sdl_store_id")
    WHERE "baseline_supergraph_sdl_store_id" IS NOT NULL
    ;

    CREATE INDEX "contract_checks_baseline_composite_schema_sdl_store_id"
    ON "contract_checks" ("baseline_composite_schema_sdl_store_id")
    WHERE "baseline_composite_schema_sdl_store_id" IS NOT NULL
    ;
  `,
} satisfies MigrationExecutor;
