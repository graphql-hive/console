---
'hive': major
---

**BREAKING** The usage ingestor now requires ClickHouse 26.2 or newer. Older versions reject every
insert it sends (`Deduplication in dependent materialized view cannot work together with async
inserts`), so usage ingestion stalls until ClickHouse is upgraded. See the upgrade guide below.

Make usage ingestion durable and deduplicated. The usage ingestor now waits for ClickHouse to
persist each async insert before committing the Kafka offset, so a ClickHouse restart no longer
loses buffered usage data, and every insert carries an `insert_deduplication_token` hashed from the
report ids in the message so retried or replayed messages are not double counted. A message's
offset is committed only once all of its tables have acknowledged the write; an insert that keeps
failing is retried in place with the same token instead of the message being replayed, and a
message delivered again after a consumer rebalance shares the in-flight slot of its first delivery
so the committed offset never moves backwards. A ClickHouse migration enables the deduplication log
on non-replicated (self-hosted) tables, which ClickHouse Cloud already keeps by default.

A Kafka message that cannot be decompressed or parsed is now dropped and counted in
`usage_ingestor_poison_pill_messages` instead of being redelivered forever and restarting the
consumer; its offset is committed so the partition keeps flowing.

`CLICKHOUSE_WAIT_FOR_ASYNC_INSERT` is removed (it is always on). New optional settings:
`CLICKHOUSE_MAX_INFLIGHT_BYTES`, `CLICKHOUSE_MAX_SOCKETS`, `CLICKHOUSE_WRITE_RETRY_BACKOFF_MS`.
New metrics `usage_ingestor_committed_offset_lag` and `usage_ingestor_failing_messages` (messages
with an insert currently being retried), and a "Usage Ingestion" Grafana dashboard.

## Upgrade Guide

Set `services.clickhouse.image` in your `docker-compose.community.yml` to
`clickhouse/clickhouse-server:26.8.11.7-alpine` (the version we test against) or any release from
26.2 on, let ClickHouse finish starting, then roll out this release.

**Note:** Please ensure you are properly backing up your database and follow the ClickHouse
changelog before using a newer ClickHouse version. We use `clickhouse/clickhouse-server` only for
local development and integration testing. For production workloads, we recommend using a managed
cloud service or having dedicated staff responsible for operating ClickHouse and planning upgrades.
