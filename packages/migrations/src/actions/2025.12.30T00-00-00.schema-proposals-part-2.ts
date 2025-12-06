import { type MigrationExecutor } from '../pg-migrator';

/**
 * This migration establishes the schema proposal tables.
 */
export default {
  name: '2025.12.30T00-00-00.schema-proposals-part-2.ts',
  run: ({ sql }) => [
    {
      name: 'create schema proposal reviews and comments tables',
      query: sql`
        CREATE TABLE IF NOT EXISTS "schema_proposal_reviews"
        (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4 ()
          , created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          -- reviews can also be tied to a stage transition event. If the review only contains comments, then this is null
          , stage_transition schema_proposal_stage NOT NULL
          , author text NOT NULLL
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
          , service_name TEXT NOT NULL
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposal_reviews_schema_proposal_id ON schema_proposal_reviews(
          schema_proposal_id
          , created_at ASC
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
          , author text NOT NULL
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
        ALTER TABLE schema_proposals
        ADD COLUMN IF NOT EXISTS
          -- projection of the number of comments on the PR to optimize the list view
          comments_count INT NOT NULL DEFAULT 0
        ;
      `,
    },
  ],
} satisfies MigrationExecutor;
