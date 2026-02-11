import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.01.30T10-00-00.oidc-require-invitation.ts',
  run: ({ sql }) => [
    {
      name: 'add `require_invitation` column to `oidc_integrations` table',
      query: sql`
        ALTER TABLE IF EXISTS "oidc_integrations"
          ADD COLUMN IF NOT EXISTS "require_invitation" boolean NOT NULL DEFAULT false
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
