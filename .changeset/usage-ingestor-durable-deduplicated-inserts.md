---
'hive': patch
---

Make usage ingestion durable and deduplicated. The usage ingestor now waits for ClickHouse
to persist each async insert before committing the Kafka offset, so a ClickHouse restart no
longer loses buffered usage data, and every insert carries an `insert_deduplication_token`
derived from the Kafka message bytes so retried or replayed messages are not double counted.
A message's offset is committed only once all of its tables have acknowledged the write; an
insert that keeps failing is retried in place with the same token instead of the message
being replayed. A ClickHouse migration enables the deduplication log on non-replicated
(self-hosted) tables, which ClickHouse Cloud already keeps by default.

`CLICKHOUSE_WAIT_FOR_ASYNC_INSERT` is removed (it is always on). New optional settings:
`CLICKHOUSE_MAX_INFLIGHT_BYTES`, `CLICKHOUSE_MAX_SOCKETS`, `CLICKHOUSE_WRITE_RETRY_BACKOFF_MS`.
New metric `usage_ingestor_committed_offset_lag` and a "Usage Ingestion" Grafana dashboard.
