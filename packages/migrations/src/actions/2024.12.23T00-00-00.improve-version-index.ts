import { type MigrationExecutor } from '../pg-migrator';

// See https://github.com/graphql-hive/console/pull/6154
export default {
  name: '2024.12.23T00-00-00.improve-version-index.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: `create "schema_log"."action" with "created_at" sort index`,
      query: sql`CREATE INDEX CONCURRENTLY idx_schema_log_action_created ON schema_log(action, created_at DESC);`,
    },
    {
      name: `create "schema_log"."action" + "service_name" index`,
      query: sql`CREATE INDEX CONCURRENTLY idx_schema_log_action_service ON schema_log(action, lower(service_name));`,
    },
  ],
} satisfies MigrationExecutor;
