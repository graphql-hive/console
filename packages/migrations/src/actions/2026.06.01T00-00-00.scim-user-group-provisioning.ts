import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.05.18T00-00-00.scim-group-provisioning.ts',
  run: ({ psql }) => psql`
    CREATE TABLE IF NOT EXISTS "groups" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4()
      , "organization_id" UUID REFERENCES "organizations"("id") ON DELETE CASCADE
      , "display_name" text
      , "created_at" timestamptz DEFAULT NOW()
      , "disabled_at" timestamptz DEFAULT NULL
      , "external_id" text
    );

    CREATE INDEX IF NOT EXISTS "idx_groups_organization_id"
      ON "groups" ("organization_id")
    ;

    CREATE UNIQUE INDEX IF NOT EXISTS "uniq_groups_external_id"
      ON "groups" ("organization_id", "external_id")
      WHERE
        "external_id" IS NOT NULL
    ;

    CREATE UNIQUE INDEX IF NOT EXISTS "uniq_groups_display_name"
      ON "groups" ("organization_id", "display_name")
    ;

    CREATE TABLE IF NOT EXISTS "group_role_assignments" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4()
      , "organization_id" UUID REFERENCES "organizations"("id") ON DELETE CASCADE
      , "group_id" UUID REFERENCES "groups"("id") ON DELETE CASCADE
      , "role_id" UUID REFERENCES "organization_member_roles" ("id") ON DELETE CASCADE
      , "assigned_resources" JSONB
      , "created_at" timestamptz DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_group_role_assignments_org_id"
      ON "group_role_assignments" ("organization_id");

    CREATE INDEX IF NOT EXISTS "idx_group_role_assignments_group_id"
      ON group_role_assignments ("group_id")
    ;

    CREATE INDEX IF NOT EXISTS "idx_group_role_assignments_role_id"
      ON "group_role_assignments" ("role_id");

    CREATE TABLE IF NOT EXISTS "group_members" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4()
      , "organization_id" UUID REFERENCES "organizations"("id") ON DELETE CASCADE
      , "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE
      , "group_id" UUID REFERENCES "groups"("id") ON DELETE CASCADE
      , "created_at" timestamptz DEFAULT NOW()
      , CONSTRAINT "group_members_org_user_group_unique"
        UNIQUE ("organization_id", "user_id", "group_id")
    );

    CREATE INDEX IF NOT EXISTS "idx_group_members_user_id"
      ON "group_members" ("user_id");

    CREATE INDEX IF NOT EXISTS "idx_group_members_group_id"
      ON group_members ("group_id");

    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "provisioned_by_organization_id" UUID NULL
        REFERENCES "organizations"("id") ON DELETE CASCADE
      , ADD COLUMN IF NOT EXISTS "external_id" TEXT NULL
      , ADD COLUMN IF NOT EXISTS "deactivated_at" TIMESTAMPTZ NULL
    ;
  `,
} satisfies MigrationExecutor;
