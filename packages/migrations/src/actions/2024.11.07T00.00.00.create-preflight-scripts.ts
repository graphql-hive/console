import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2024.11.07T00.00.00.create-preflight-scripts.sql',
  run: ({ sql }) => sql`
CREATE TABLE "document_preflight_scripts" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "source_code" text NOT NULL,
  "target_id" uuid NOT NULL UNIQUE REFERENCES "targets"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

ALTER TABLE "document_preflight_scripts"
ADD CONSTRAINT "unique_target_id" UNIQUE ("target_id");

CREATE INDEX "document_preflight_scripts_target" ON "document_preflight_scripts" (
  "target_id" ASC
);
`,
} satisfies MigrationExecutor;
