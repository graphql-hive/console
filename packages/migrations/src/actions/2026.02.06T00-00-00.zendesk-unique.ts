import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.02.06T00-00-00.zendesk-unique.ts',
  run: ({ sql }) => sql`
    ALTER TABLE "users"
    DROP CONSTRAINT IF EXISTS "users_zendesk_user_id_key"
    ;
  `,
} satisfies MigrationExecutor;
