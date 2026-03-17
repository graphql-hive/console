import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.12.12T00-00-00.workflows-deduplication.ts',
  run: ({ sql }) => sql`
      CREATE TABLE "graphile_worker_deduplication" (
          "task_name"   text        NOT NULL,
          "dedupe_key"  text        NOT NULL,
          "expires_at"  timestamptz NOT NULL,
          CONSTRAINT "dedupe_pk" PRIMARY KEY ("task_name", "dedupe_key")
      );

      CREATE INDEX "graphile_worker_deduplication_expires_at_idx"
        ON "graphile_worker_deduplication" ("expires_at")
      ;
  `,
} satisfies MigrationExecutor;
