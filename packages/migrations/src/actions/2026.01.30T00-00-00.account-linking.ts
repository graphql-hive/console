import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.01.30T00-00-00.account-linking.ts',
  run: ({ sql }) => [
    {
      name: 'add `linked_identity_ids` column to `users` table',
      query: sql`
        ALTER TABLE IF EXISTS "users"
          ADD COLUMN IF NOT EXISTS "linked_identity_ids" varchar(300)[]
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
