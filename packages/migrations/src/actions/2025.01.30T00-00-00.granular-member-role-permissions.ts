import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025-01-30T00-00-00.granular-member-role-permissions.ts',
  run: ({ sql }) => sql`
    ALTER TABLE "organization_member_roles"
      ALTER "scopes" DROP NOT NULL
      , ADD COLUMN "permissions" text[]
    ;
  `,
} satisfies MigrationExecutor;
