import { type MigrationExecutor } from '../pg-migrator';

// The checks list filtered by service walks (target_id, created_at DESC, id DESC) and would
// otherwise scan every check of the target to find the few that match a service.
export default {
  name: '2026.10.07T00-00-00.schema-checks-service-filter-index.ts',
  noTransaction: true,
  run: ({ psql }) => [
    {
      name: 'create schema_checks_connection_pagination_by_service index',
      query: psql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "schema_checks_connection_pagination_by_service" ON "schema_checks" (
          "target_id" ASC
          , "service_name" ASC
          , "created_at" DESC
          , "id" DESC
        )
        WHERE
          "service_name" IS NOT NULL
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
