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
        /**
         * Request patterns include:
         * - Get by ID
         * - List target's proposals by date
         * - List target's proposals by date, filtered by author/user_id and/or stage (for now)
         */
        CREATE TABLE IF NOT EXISTS "schema_proposals"
        (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4 ()
          , created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          , updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          , title VARCHAR(72) NOT NULL
          , description text NOT NULL
          , stage schema_proposal_stage NOT NULL
          , target_id UUID NOT NULL REFERENCES targets (id) ON DELETE CASCADE
          -- ID for the user that opened the proposal @todo
          , user_id UUID REFERENCES users (id) ON DELETE SET NULL
          -- projection of the number of comments on the PR to optimize the list view
          , comments_count INT NOT NULL DEFAULT 0
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposals_list ON schema_proposals (
          target_id
          , created_at DESC
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposals_list_by_user_id ON schema_proposals (
          target_id
          , user_id
          , created_at DESC
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposals_list_by_stage ON schema_proposals (
          target_id
          , stage
          , created_at DESC
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposals_list_by_user_id_stage ON schema_proposals (
          target_id
          , user_id
          , stage
          , created_at DESC
        )
        ;
        -- For performance during user delete
        CREATE INDEX IF NOT EXISTS schema_proposals_diff_user_id on schema_proposals (
          user_id
        )
        ;
        CREATE TABLE IF NOT EXISTS "schema_proposal_reviews"
        (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4 ()
          , created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          -- reviews can also be tied to a stage transition event. If the review only contains comments, then this is null
          , stage_transition schema_proposal_stage NOT NULL
          , user_id UUID REFERENCES users (id) ON DELETE SET NULL
          , schema_proposal_id UUID NOT NULL REFERENCES schema_proposals (id) ON DELETE CASCADE
          -- store the original text of the line that is being reviewed. If the base schema version changes, then this is
          -- used to determine which line this review falls on. If no line matches in the current version, then
          -- show as outdated and attribute to the original line.
          , line_text text
          -- the coordinate closest to the reviewed line. E.g. if a comment is reviewed, then
          -- this is the coordinate that the comment applies to.
          -- note that the line_text must still be stored in case the coordinate can no
          -- longer be found in the latest proposal version. That way a preview of the reviewed
          -- line can be provided.
          , schema_coordinate text
          , resolved_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL
          , service_name TEXT NOT NULL
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposal_reviews_schema_proposal_id ON schema_proposal_reviews(
          schema_proposal_id
          , created_at ASC
        )
        ;
        -- For performance on user delete
        CREATE INDEX IF NOT EXISTS schema_proposal_reviews_user_id ON schema_proposal_reviews(
          user_id
        )
        ;
        -- For performance on user delete
        CREATE INDEX IF NOT EXISTS schema_proposal_reviews_resolved_by_user_id ON schema_proposal_reviews(
          resolved_by_user_id
        )
        ;
        /**
         * Request patterns include:
         * - Get by ID
         * - List a proposal's comments in order of creation, grouped by review.
         */
        CREATE TABLE IF NOT EXISTS "schema_proposal_comments"
        (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4 ()
          , user_id UUID REFERENCES users (id) ON DELETE SET NULL
          , body TEXT NOT NULL
          , created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          , updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          , schema_proposal_review_id UUID REFERENCES schema_proposal_reviews (id) ON DELETE CASCADE
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposal_comments_list ON schema_proposal_comments(
          schema_proposal_review_id
          , created_at ASC
        )
        ;
        -- For performance on user delete
        CREATE INDEX IF NOT EXISTS schema_proposal_comments_user_id ON schema_proposal_comments(
          user_id
        )
        ;
      `,
    },
    {
      // Associate schema checks with schema proposals
      name: 'Add "organization_member_roles"."created_at" column',
      query: sql`
        ALTER TABLE "schema_checks"
          ADD COLUMN IF NOT EXISTS "schema_proposal_id" UUID REFERENCES "schema_proposals" ("id") ON DELETE SET NULL
        ;
        CREATE INDEX IF NOT EXISTS schema_checks_schema_proposal_id ON schema_checks(
          schema_proposal_id, lower(service_name)
        )
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
