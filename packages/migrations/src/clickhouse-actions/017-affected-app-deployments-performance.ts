import type { Action } from '../clickhouse';

export const action: Action = async exec => {
  await exec(`
    ALTER TABLE app_deployment_documents
    ADD COLUMN IF NOT EXISTS target_id LowCardinality(String)
    ;
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS "app_deployment_document_coordinates" (
      "target_id" LowCardinality(String)
      , "coordinate" LowCardinality(String)
      , "app_deployment_id" LowCardinality(String)
      , "document_hash" String
      , "operation_name" String
    )
    ENGINE = ReplacingMergeTree
    ORDER BY ("target_id", "coordinate", "app_deployment_id", "document_hash")
    ;
  `);

  await exec(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_documents_by_coordinate"
    TO "app_deployment_document_coordinates"
    AS
    SELECT
      "target_id"
      , arrayJoin("schema_coordinates") AS "coordinate"
      , "app_deployment_id"
      , "document_hash"
      , "operation_name"
    FROM "app_deployment_documents"
    ;
  `);
};
