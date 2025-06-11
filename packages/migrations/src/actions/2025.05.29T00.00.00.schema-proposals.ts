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
          , stage schema_proposal_stage NOT NULL
          , target_id UUID NOT NULL REFERENCES targets (id) ON DELETE CASCADE
          -- ID for the user that opened the proposal
          , user_id UUID REFERENCES users (id) ON DELETE SET NULL
          -- schema version that is used to calculate the diff. In case the version is deleted,
          -- set this to null to avoid completely erasing the change... This should never happen.
          , diff_schema_version_id UUID NOT NULL REFERENCES schema_versions (id) ON DELETE SET NULL
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
        -- For performance during schema_version delete
        CREATE INDEX IF NOT EXISTS schema_proposals_diff_schema_version_id on schema_proposals (
          diff_schema_version_id
        )
        ;
        -- For performance during user delete
        CREATE INDEX IF NOT EXISTS schema_proposals_diff_user_id on schema_proposals (
          user_id
        )
        ;
        /**
         * Request patterns include:
         * - Get by ID
         * - List proposal's latest versions for each service
         * - List all proposal's versions ordered by date
         */
        CREATE TABLE IF NOT EXISTS "schema_proposal_versions"
        (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4 ()
          , user_id UUID REFERENCES users (id) ON DELETE SET NULL
          , created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          , schema_proposal_id UUID NOT NULL REFERENCES schema_proposals (id) ON DELETE CASCADE
          , service_name text
          , schema_sdl text NOT NULL
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposal_versions_list_latest_by_distinct_service ON schema_proposal_versions(
          schema_proposal_id
          , service_name
          , created_at DESC
        )
        ;
        CREATE INDEX IF NOT EXISTS schema_proposal_versions_schema_proposal_id_created_at ON schema_proposal_versions(
          schema_proposal_id
          , created_at DESC
        )
        ;
        /**
         * Request patterns include:
         * - Get by ID
         * - List proposal's latest versions for each service
         * - List all proposal's versions ordered by date
         */
         /**
          SELECT * FROM schema_proposal_comments as c JOIN schema_proposal_reviews as r
            ON r.schema_proposal_review_id = c.id
            WHERE schema_proposal_id = $1
            ORDER BY created_at
            LIMIT 10
            ;
          */
        CREATE TABLE IF NOT EXISTS "schema_proposal_reviews"
        (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4 ()
          , created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          -- null if just a comment
          , stage_transition schema_proposal_stage NOT NULL
          , user_id UUID REFERENCES users (id) ON DELETE SET NULL
          , schema_proposal_id UUID NOT NULL REFERENCES schema_proposals (id) ON DELETE CASCADE
          -- store the originally proposed version to be able to reference back as outdated if unable to attribute
          -- the review to another version.
          , original_schema_proposal_version_id UUID NOT NULL REFERENCES schema_proposal_versions (id) ON DELETE SET NULL
          -- store the original text of the line that is being reviewed. If the base schema version changes, then this is
          -- used to determine which line this review falls on. If no line matches in the current version, then
          -- show as outdated and attribute to the original line.
          , line_text text
          -- used in combination with the line_text to determine what line in the current version this review is attributed to
          , original_line_num INT
          -- the coordinate closest to the reviewed line. E.g. if a comment is reviewed, then
          -- this is the coordinate that the comment applies to.
          -- note that the line_text must still be stored in case the coordinate can no
          -- longer be found in the latest proposal version. That way a preview of the reviewed
          -- line can be provided.
          , schema_coordinate text
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
        -- For performance on schema_proposal_versions delete
        CREATE INDEX IF NOT EXISTS schema_proposal_reviews_original_schema_proposal_version_id ON schema_proposal_reviews(
          original_schema_proposal_version_id
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
  ],
} satisfies MigrationExecutor;
