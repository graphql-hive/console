import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.03.28T00-00-00.proposal-change-tracking.ts',
  run: ({ psql }) => psql`
    CREATE TABLE IF NOT EXISTS "proposal_approved_changes" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),

      -- hash of the metadata. Because this is a hash, it has a slim
      -- chance of conflicting. This is why we need the "change" to perform a more
      -- exact match using the "@graphql-inspector/compare-changes" package
      "hash" TEXT NOT NULL,

      -- this is the exact change
      "change" JSONB NOT NULL,

      "proposal_id" UUID NOT NULL
          REFERENCES "schema_proposals"("id"),

      -- This is the version in which the approved change has been implemented.
      -- It is for linking the change to the schema history
      "schema_version_id" UUID
          REFERENCES "schema_versions"("id"),

      "service" TEXT,
      "target_id" UUID NOT NULL
          REFERENCES "targets"("id")
          ON DELETE CASCADE
    );

    -- partial index used on publish to look up if a change is approved and not implemented
    CREATE INDEX "target_change_not_implemented" ON "proposal_approved_changes" ("target_id", "hash")
      WHERE "schema_version_id" IS NULL;

    -- look up on a proposal, which changes have been implemented
    -- and where they were implemented
    CREATE INDEX "proposal_change_implemented" ON "proposal_approved_changes" ("target_id", "proposal_id")
      WHERE "schema_version_id" IS NOT NULL;

    -- look up on the schema history page, which proposal the change belonged to
    CREATE INDEX "schema_implements_changes" ON "proposal_approved_changes" ("target_id", "schema_version_id");
  `,
} satisfies MigrationExecutor;
