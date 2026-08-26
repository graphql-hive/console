---
'hive': minor
---

Improve performance of insights queries by introducing new tables for `operation` aggregations using [`quantilesTDigest`](https://clickhouse.com/docs/reference/functions/aggregate-functions/quantileTDigest) instead of [`quantiles`](https://clickhouse.com/docs/reference/functions/aggregate-functions/quantiles).

To reduce operational overhead and the need of reingesting data, the application logic is adjusted to use either the new or old tables based on whether the provided time range can be satisfied.

Set the `CLICKHOUSE_TDIGEST_ROLLUPS_START` environment variable on the `server` container to an ISO timestamp after you successfully ran the latest clickhouse database migration in order to gradually start using the new tables.

**NOTE**: In the future we will gradually introduce migrations that remove the old tables. To prevent data loss, avoid reingestion, and prevent delays to future upgrades, **we recommend upgrading to this release as soon as possible**.

A follow up breaking change release that will contain a database migration for dropping the tables `operations_minutely`, `operations_hourly`, `clients_minutely` and `clients_hourly` can be expected to land roughly 30 days after this version is released. By then the new tables can satisfy all the date ranges for queries executed against those tables.

A follow up breaking change release that will contain a database migration for dropping the tables `operations_daily` and `clients_daily` can be expected to land  roughly 1 year (equal to our enterprise plan retention of Hive Console Cloud) after this version is released. By then the new tables can satisfy all the date ranges for queries executed against those tables.
