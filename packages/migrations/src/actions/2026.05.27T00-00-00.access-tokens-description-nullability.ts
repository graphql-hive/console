import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.05.27T00-00-00.access-tokens-description-nullability.ts',
  run: ({ psql }) => psql`
    ALTER TABLE IF EXISTS organization_access_tokens
      ALTER COLUMN "description" DROP NOT NULL
    ;
  `,
} satisfies MigrationExecutor;
