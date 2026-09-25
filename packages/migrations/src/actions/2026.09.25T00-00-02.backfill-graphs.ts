import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.09.25T00-00-02.backfill-graphs.ts',
  run: ({ psql }) => psql`
    INSERT INTO "graphs" (
      "organization_id"
      , "project_id"
      , "target_id"
      , "type"
      , "name"
      , "config"
      , "source_graph_id"
      , "is_backfilled"
    )
    SELECT
      "projects"."org_id"
      , "targets"."project_id"
      , "targets"."id"
      , 'BASE'
      , 'default'
      , NULL
      , NULL
      , true
    FROM "targets"
    INNER JOIN "projects" ON "projects"."id" = "targets"."project_id"
    ON CONFLICT ON CONSTRAINT "graphs_target_id_name_key" DO NOTHING;

    INSERT INTO "graphs" (
      "organization_id"
      , "project_id"
      , "target_id"
      , "type"
      , "name"
      , "config"
      , "source_graph_id"
      , "is_backfilled"
    )
    SELECT
      "default_graphs"."organization_id"
      , "default_graphs"."project_id"
      , "contracts"."target_id"
      , 'CONTRACT'
      , 'default/' || "contracts"."contract_name"
      , jsonb_build_object(
        'includeTags', "contracts"."include_tags"
        , 'excludeTags', "contracts"."exclude_tags"
        , 'removeUnreachableTypesFromPublicApiSchema', "contracts"."remove_unreachable_types_from_public_api_schema"
        , 'isDisabled', false
      )
      , "default_graphs"."id"
      , true
    FROM "contracts"
    INNER JOIN "graphs" AS "default_graphs"
      ON "default_graphs"."target_id" = "contracts"."target_id"
      AND "default_graphs"."name" = 'default'
    WHERE
      "contracts"."is_disabled" = false
    ON CONFLICT ON CONSTRAINT "graphs_target_id_name_key" DO NOTHING;
  `,
} satisfies MigrationExecutor;
