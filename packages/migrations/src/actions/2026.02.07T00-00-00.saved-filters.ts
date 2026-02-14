import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.02.07T00-00-00.saved-filters.ts',
  run: ({ sql }) => sql`
CREATE TYPE "saved_filter_type" AS ENUM ('INSIGHTS');
CREATE TYPE "saved_filter_visibility" AS ENUM ('private', 'shared');

CREATE TABLE "saved_filters" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "type" "saved_filter_type" NOT NULL,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "updated_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "description" text,
  "filters" jsonb NOT NULL,
  "visibility" "saved_filter_visibility" NOT NULL,
  "views_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE INDEX "saved_filters_project_type_visibility_pagination" ON "saved_filters" (
  "project_id" ASC,
  "type" ASC,
  "visibility" ASC,
  "created_at" DESC,
  "id" DESC
);

CREATE INDEX "saved_filters_user_project" ON "saved_filters" (
  "created_by_user_id" ASC,
  "project_id" ASC
);

CREATE INDEX "saved_filters_project_type_views" ON "saved_filters" (
  "project_id" ASC,
  "type" ASC,
  "views_count" DESC
);
`,
} satisfies MigrationExecutor;
