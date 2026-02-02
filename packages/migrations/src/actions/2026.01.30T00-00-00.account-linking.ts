import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.01.30T00-00-00.account-linking.ts',
  run: ({ sql }) => [
    {
      name: 'create `users_linked_identities` table',
      query: sql`
        CREATE TABLE IF NOT EXISTS "users_linked_identities" (
          "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE
          , "identity_id" uuid NOT NULL
          , "created_at" timestamptz NOT NULL DEFAULT now()
          , UNIQUE ("user_id", "identity_id")
        );
      `,
    },
  ],
} satisfies MigrationExecutor;
