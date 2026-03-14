---
'hive': minor
---

Create new ClickHouse materialized views for faster affected app deployment lookups in schema checks and schema
version.

**Caution**: If you are relying on the app deployments feature for schema checks it is recommended to manually perform the following migration against your ClickHouse database after deploying this version to ensure data consistency.

Substitute `$CLICKHOUSE_DB_USER` and `$CLICKHOUSE_DB_PASSWORD`, with the same credentials that execute these migration.

```sql
CREATE TABLE "tmp_app_deployments_backfill_target_id" (
  "app_deployment_id" String
  , "target_id" LowCardinality(String)
)
ENGINE = Memory
;

INSERT INTO "tmp_app_deployments_backfill_target_id"
SELECT
  "app_deployment_id"
  , "target_id"
FROM
  "app_deployments"
;

CREATE DICTIONARY "tmp_app_deployments_target_dict" (
  "app_deployment_id" String
  , "target_id" String
)
PRIMARY KEY "app_deployment_id"
SOURCE(CLICKHOUSE(
    TABLE "tmp_app_deployments_backfill_target_id"
    USER '$CLICKHOUSE_DB_USER'
    PASSWORD '$CLICKHOUSE_DB_PASSWORD'
))
LAYOUT(HASHED())
LIFETIME(3600)
;

ALTER TABLE
  "app_deployment_documents"
UPDATE 
  "target_id" = dictGetString('tmp_app_deployments_target_dict', 'target_id', "app_deployment_id")
WHERE
  "target_id" = ''
;

INSERT INTO "app_deployment_document_coordinates" (
  "target_id"
  , "coordinate"
  , "app_deployment_id"
  , "document_hash"
  , "operation_name"
)
SELECT
  "target_id"
  , arrayJoin("schema_coordinates") AS "schema_coordinate"
  , "app_deployment_id"
  , "document_hash"
  , "operation_name"
FROM
  "app_deployment_documents"
WHERE
  "target_id" != ""
;

DROP DICTIONARY "tmp_app_deployments_target_dict"
;

DROP TABLE "tmp_app_deployments_backfill_target_id"
;
```
