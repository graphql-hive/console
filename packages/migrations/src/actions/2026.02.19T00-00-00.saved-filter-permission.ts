import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.02.19T00-00-00.saved-filter-permission.ts',
  run: ({ sql }) => sql`
    UPDATE "organization_member_roles"
    SET "permissions" = array_append("permissions", 'sharedSavedFilter:modify')
    WHERE "permissions" @> ARRAY['project:modifySettings']
      AND NOT ("permissions" @> ARRAY['sharedSavedFilter:modify'])
      AND "locked" = false;
  `,
} satisfies MigrationExecutor;
