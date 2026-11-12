---
'hive': minor
---

Store the `graphId` and `graphVersionId` reported with operations in ClickHouse, so usage data can later be scoped to a graph and graph version. A new ClickHouse migration adds `graph_id` and `graph_version_id` columns to the `operations`, `subscription_operations`, `operation_errors` and `operation_collection` tables. Operations reported without a graph store empty values.

Also fixes the usage service rejecting every usage report (format version 2) that contains `graph` metadata, as the `uuid` string format was not registered for validation.
