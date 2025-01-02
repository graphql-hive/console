import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2024.11.11T00-00-00.supertokens-8.0.ts',
  run: ({ sql }) => sql`
    ALTER TABLE IF EXISTS "supertokens_user_roles"
      DROP CONSTRAINT IF EXISTS "supertokens_user_roles_role_fkey";
  `,
} satisfies MigrationExecutor;
