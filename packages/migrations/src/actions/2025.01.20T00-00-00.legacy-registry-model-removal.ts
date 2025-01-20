import { type MigrationExecutor } from '../pg-migrator';

// Deletes the legacy registry model column
// https://github.com/graphql-hive/console/pull/6259

export default {
  name: '2025.01.20T00-00-00.legacy-registry-model-removal.ts',
  
  run: ({ sql }) => sql`
    ALTER TABLE projects DELETE COLUMN legacy_registry_model;
  `,
} satisfies MigrationExecutor;
