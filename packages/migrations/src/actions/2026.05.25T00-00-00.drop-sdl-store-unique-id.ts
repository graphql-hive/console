import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.05.25T00-00-00.drop-sdl-store-unique-id.ts',
  noTransaction: true,
  run: ({ psql }) => psql`
    DROP INDEX CONCURRENTLY IF EXISTS "sdl_store_unique_id"
  `,
} satisfies MigrationExecutor;
