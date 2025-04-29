import type { MigrationExecutor } from '../pg-migrator';

const date = new Date();

const year = date.getFullYear();
const month = date.getMonth() + 1;
const day = date.getDate();

const createdAt = `'${year}-${month}-${day}'`;

export default {
  name: '2025.04.29T00-00-00.organization-member-pagination.ts',
  noTransaction: true,
  // Adds a default role to OIDC integration and set index on "oidc_integrations"."default_role_id"
  run: ({ sql }) => [
    {
      name: 'Add "organization_member"."created_at" column',
      query: sql`
        ALTER TABLE "organization_member"
          ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT ${sql.literalValue(createdAt)}::timestamp
        ;
      `,
    },
    {
      name: 'Create pagination index ',
      query: sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "organization_member_pagination_idx"
        ON "organization_member" (
          "organization_id" DESC
          , "user_id" DESC
          , "created_at" DESC
        )
      `,
    },
  ],
} satisfies MigrationExecutor;
