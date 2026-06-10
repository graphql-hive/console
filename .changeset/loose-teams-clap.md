---
'hive': minor
---

Bump recommended clickhouse version for self-hosting to `26.3.12.3`.

Pass `output_format_json_quote_64bit_integers=1` search parameter to clickhouse database queries
expecting `JSON` responses to ensure consistent response output for different cloud providers.

**Note:** Please ensure you are properly backing up your database and follow the Clickhouse changelog before using a newer ClickHouse version.
We use `clickhouse/clickhouse-server` only for local development and integration testing.
For production workloads, we recommend using a managed cloud service or having dedicated staff responsible for operating ClickHouse and planning upgrades.
