import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2024.11.12T00-00-00.supertokens-9.0.ts',
  run: ({ sql }) => sql`
    ALTER TABLE IF EXISTS "supertokens_totp_user_devices"
      ADD COLUMN IF NOT EXISTS "created_at" BIGINT default 0;
    ALTER TABLE IF EXISTS "totp_user_devices"
      ALTER COLUMN "created_at" DROP DEFAULT;
  `,
} satisfies MigrationExecutor;
