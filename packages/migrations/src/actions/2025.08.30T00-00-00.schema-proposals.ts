import { type MigrationExecutor } from '../pg-migrator';

/**
 * This migration establishes the schema proposal tables.
 */
export default {
  name: '2025.05.29T00-00-00.schema-proposals.ts',
  run: ({ sql }) => [
    {
      name: 'create schema_proposal tables',
      query: sql`
        CREATE TYPE
          schema_proposal_stage AS ENUM('DRAFT', 'OPEN', 'APPROVED', 'IMPLEMENTED', 'CLOSED')
        ;
        CREATE TABLE IF NOT EXISTS "schema_proposals"
        (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4 ()
          , created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          , updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          , title VARCHAR(72) NOT NULL
          , description text NOT NULL
          , stage schema_proposal_stage NOT NULL
          , target_id UUID NOT NULL REFERENCES targets (id) ON DELETE CASCADE
          , author text NOT NULL
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposals_list ON schema_proposals (
          target_id
          , created_at DESC
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposals_list_by_stage ON schema_proposals (
          target_id
          , stage
          , created_at DESC
        )
        ;
      `,
    },
    {
      // Associate schema checks with schema proposals
      name: 'Add "schema_checks"."schema_proposal_id" column and index',
      query: sql`
        ALTER TABLE "schema_checks"
          ADD COLUMN IF NOT EXISTS "schema_proposal_id" UUID REFERENCES "schema_proposals" ("id") ON DELETE SET NULL
        ;
        CREATE INDEX IF NOT EXISTS schema_checks_schema_proposal_id ON schema_checks(
          schema_proposal_id, LOWER(service_name)
        )
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
