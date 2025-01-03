import { type MigrationExecutor } from '../pg-migrator';

// https://github.com/graphql-hive/console/issues/6249
export default {
  name: '2025.01.03T00-00-00.improve-targets-index.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: `create "targets"."idx_targets_project_id_id" lookup index`,
      query: sql`CREATE INDEX IF NOT EXISTS CONCURRENTLY idx_targets_project_id_id ON targets(project_id, id);`,
    },
  ],
} satisfies MigrationExecutor;
