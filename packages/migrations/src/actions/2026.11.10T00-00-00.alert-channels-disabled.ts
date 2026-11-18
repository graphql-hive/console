import { type MigrationExecutor } from '../pg-migrator';

/**
 * A disabled channel carries `disabled_at` and the member who disabled it; `disabled_by_user_id`
 * is null when Hive disabled it for failing (user rows are never deleted, so the FK's SET NULL
 * is only a safeguard). `enabled_at` is when it was created or last enabled, the point its
 * delivery health is counted from.
 */
export default {
  name: '2026.11.10T00-00-00.alert-channels-disabled.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "alert_channels"
      ADD COLUMN "disabled_at" TIMESTAMP WITH TIME ZONE
      , ADD COLUMN "disabled_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL
      , ADD COLUMN "enabled_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    ;

    UPDATE "alert_channels" SET "enabled_at" = "created_at";
  `,
} satisfies MigrationExecutor;
