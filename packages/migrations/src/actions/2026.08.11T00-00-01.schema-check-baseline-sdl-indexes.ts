import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.08.11T00-00-01.schema-check-baseline-sdl-indexes.ts',
  noTransaction: true,
  run: ({ psql }) => [
    {
      name: 'create schema_check_by_baseline_schema_sdl_store_id index',
      query: psql`
        CREATE INDEX CONCURRENTLY "schema_check_by_baseline_schema_sdl_store_id"
        ON "schema_checks" ("baseline_schema_sdl_store_id")
        WHERE "baseline_schema_sdl_store_id" IS NOT NULL
      `,
    },
    {
      name: 'create schema_check_baseline_supergraph_sdl_store_id index',
      query: psql`
        CREATE INDEX CONCURRENTLY "schema_check_baseline_supergraph_sdl_store_id"
        ON "schema_checks" ("baseline_supergraph_sdl_store_id")
        WHERE "baseline_supergraph_sdl_store_id" IS NOT NULL
      `,
    },
    {
      name: 'create schema_check_baseline_composite_schema_sdl_store_id index',
      query: psql`
        CREATE INDEX CONCURRENTLY "schema_check_baseline_composite_schema_sdl_store_id"
        ON "schema_checks" ("baseline_composite_schema_sdl_store_id")
        WHERE "baseline_composite_schema_sdl_store_id" IS NOT NULL
      `,
    },
    {
      name: 'create contract_checks_baseline_supergraph_sdl_store_id index',
      query: psql`
        CREATE INDEX CONCURRENTLY "contract_checks_baseline_supergraph_sdl_store_id"
        ON "contract_checks" ("baseline_supergraph_sdl_store_id")
        WHERE "baseline_supergraph_sdl_store_id" IS NOT NULL
      `,
    },
    {
      name: 'create contract_checks_baseline_composite_schema_sdl_store_id index',
      query: psql`
        CREATE INDEX CONCURRENTLY "contract_checks_baseline_composite_schema_sdl_store_id"
        ON "contract_checks" ("baseline_composite_schema_sdl_store_id")
        WHERE "baseline_composite_schema_sdl_store_id" IS NOT NULL
      `,
    },
  ],
} satisfies MigrationExecutor;
