---
'hive': major
---

**BREAKING** The usage ingestor now requires ClickHouse 26.1 or newer (26.1.1.912 or later). Older
versions reject every insert it sends (`Deduplication in dependent materialized view cannot work
together with async inserts`), so usage ingestion stalls until ClickHouse is upgraded. See the
upgrade guide below.

Make usage ingestion durable and deduplicated. The usage ingestor now waits for ClickHouse to
persist each async insert before committing the Kafka offset, so a ClickHouse restart no longer
loses buffered usage data, and every insert carries an `insert_deduplication_token` hashed from the
report ids in the message so retried or replayed messages are not double counted. A message's
offset is committed only once all of its tables have acknowledged the write; an insert that keeps
failing is retried in place with the same token instead of the message being replayed, and a
message delivered again after a consumer rebalance is written again and deduplicated by ClickHouse,
with offsets committed strictly in order per partition. A ClickHouse migration enables the
deduplication log on non-replicated (self-hosted) tables, which ClickHouse Cloud already keeps by
default.

Retries stay unbounded while a failure is systemic (a ClickHouse outage, a schema lagging a
deploy), so no data is dropped during an outage. A message whose insert keeps failing for longer
than `CLICKHOUSE_WRITE_GIVE_UP_AFTER_MS` (default 2 minutes) while other inserts to the same table
succeed is given up on instead of blocking its partition: its offset is committed, it is counted in
`usage_ingestor_given_up_messages`, and its payload, deduplication token and outcome per table are
logged at error level.

A Kafka message that cannot be decompressed or parsed is now dropped and counted in
`usage_ingestor_poison_pill_messages` instead of being redelivered forever and restarting the
consumer; its offset is committed so the partition keeps flowing.

`CLICKHOUSE_WAIT_FOR_ASYNC_INSERT` is removed (it is always on). New optional settings:
`CLICKHOUSE_MAX_INFLIGHT_BYTES`, `CLICKHOUSE_MAX_SOCKETS`, `CLICKHOUSE_WRITE_RETRY_BACKOFF_MS`,
`CLICKHOUSE_WRITE_GIVE_UP_AFTER_MS`. New metrics `usage_ingestor_committed_offset_lag`,
`usage_ingestor_failing_messages` (messages with an insert currently being retried),
`usage_ingestor_given_up_messages`, `usage_ingestor_inflight_bytes` and
`usage_ingestor_inflight_messages`, plus a "Usage Ingestion" Grafana dashboard and alert rules for
failing and dropped messages.

## Upgrade Guide

Set `services.clickhouse.image` in your `docker-compose.community.yml` to
`clickhouse/clickhouse-server:26.8.11.7-alpine` (the version we test against) or any release from
26.1 on, let ClickHouse finish starting, then roll out this release.

**Note:** Please ensure you are properly backing up your database and follow the ClickHouse
changelog before using a newer ClickHouse version. We use `clickhouse/clickhouse-server` only for
local development and integration testing. For production workloads, we recommend using a managed
cloud service or having dedicated staff responsible for operating ClickHouse and planning upgrades.
