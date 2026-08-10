import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.08.06T00-00-00.scim-provisioning-status.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "users"
      ADD COLUMN "provisioning_status" TEXT NULL
    ;

    UPDATE
      "users"
    SET
      "provisioning_status" = 'active'
    WHERE
      "provisioned_by_organization_id" IS NOT NULL
    ;
  `,
} satisfies MigrationExecutor;
