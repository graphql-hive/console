import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2024.11.12T00-00-00.supertokens-9.2.ts',
  run: ({ sql }) => sql`
    DO $$
    BEGIN
      IF (SELECT to_regclass('supertokens_user_last_active') IS NOT null)
      THEN
        CREATE INDEX IF NOT EXISTS "supertokens_user_last_active_last_active_time_index"
          ON "supertokens_user_last_active" ("last_active_time" DESC, "app_id" DESC);
      END IF;
    END $$;
  `,
} satisfies MigrationExecutor;
