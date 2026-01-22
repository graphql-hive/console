import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.01.20T10.00.00.graph-variant-versions.ts',
  run: ({ sql }) => sql`
    CREATE TABLE "graph_variants" (
      "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL
      , "target_id" uuid NOT NULL REFERENCES "targets"("id") ON DELETE CASCADE
      , "name" text NOT NULL
      , "created_at" timestamptz NOT NULL DEFAULT NOW()
      , "retired_at" timestamptz DEFAULT NULL
    );

    CREATE INDEX "idx_graph_variants_target_id"
      ON "graph_variants" ("target_id")
    ;
    CREATE UNIQUE INDEX "uniq_feature_flags_target_id_name"
      ON "graph_variants" ("target_id", "name")
    ;

    CREATE TABLE "graph_variant_versions" (
      "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL
      , "graph_variant_id" uuid REFERENCES "graph_variants"("id") ON DELETE CASCADE
      , "schema_composition_errors" jsonb DEFAULT NULL
      , "compositite_schema_sdl" jsonb DEFAULT NULL
      , "supergraph_sdl" jsonb DEFAULT NULL
      , "schema_changes" jsonb DEFAULT NULL
      , "created_at" timestamptz NOT NULL DEFAULT NOW()
      , "previous_graph_variant_version_id" uuid REFERENCES "graph_variant_versions" ("id") ON DELETE CASCADE
    );

    CREATE INDEX "idx_graph_variant_versions_graph_variant_id"
      ON "graph_variant_versions" ("graph_variant_id")
    ;
    CREATE INDEX "idx_graph_variant_versions_previous_graph_variant_version_id"
      ON "graph_variant_versions" ("id")
    ;
    CREATE INDEX "idx_graph_variant_versions_variant_created_at_id"
      ON "graph_variant_versions" (
        "graph_variant_id",
        "created_at" DESC,
        "id" DESC
      )
    ;

    CREATE TABLE "graph_variants_version_to_log" (
      "graph_variant_version_id" uuid REFERENCES "graph_variant_versions"("id") ON DELETE CASCADE
      , "schema_log_id" uuid REFERENCES "schema_log"("id") ON DELETE CASCADE
      , CONSTRAINT "graph_variants_version_to_log_pkey" PRIMARY KEY ("graph_variant_version_id", "schema_log_id")
    );

    CREATE INDEX "idx_graph_variants_version_to_log_schema_log_id"
      ON graph_variants_version_to_log ("schema_log_id")
    ;

  `,
} satisfies MigrationExecutor;
