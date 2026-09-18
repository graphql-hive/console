import { type MigrationExecutor } from '../pg-migrator';

// type graphs__config = {
//   type: 'contract';
//   includeTags: Array<string>;
//   excludeTargs: Array<string>;
//   removeUnreachableTypesFromPublicApiSchema: boolean;
//   isDisabled: boolean;
// };

// type schema_versions__graph_metadata = {
//   type: 'contract';
//   graphId: string;
//   graphName: string;
// };

export default {
  name: '2026.09.18T00-00-00.graphs.ts',
  run: ({ psql }) => psql`
    CREATE TABLE "graphs" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4()
      , "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE
      , "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE
      , "target_id" uuid NOT NULL REFERENCES "targets"("id") ON DELETE CASCADE
      , "name" text NOT NULL
      , "config" jsonb NOT NULL
      , "source_graph_id" uuid REFERENCES "graphs"("id") ON DELETE CASCADE
      , "created_at" timestamptz NOT NULL DEFAULT now()
      , PRIMARY KEY ("id")
    );

    CREATE INDEX "graphs_organization_id" ON "graphs" ("organization_id");
    CREATE INDEX "graphs_project_id" ON "graphs" ("project_id");
    CREATE INDEX "graphs_target_id" ON "graphs" ("target_id");
    CREATE INDEX "graphs_source_graph_id" ON "graphs" ("source_graph_id");

    ALTER TABLE "schema_versions"
      ADD COLUMN "graph_id" uuid REFERENCES "graphs"("id") ON DELETE SET NULL
      , ADD COLUMN "graph_metadata" jsonb
      , ADD COLUMN "source_schema_version_id" uuid REFERENCES "schema_versions"."id"
    ;
  `,
} satisfies MigrationExecutor;
