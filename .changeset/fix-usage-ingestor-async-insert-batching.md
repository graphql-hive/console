---
'hive': patch
---

Fix usage-ingestor async inserts being written to ClickHouse one Kafka message at a
time instead of batched. ClickHouse enables an adaptive async-insert busy timeout by
default; it starts at 50ms and only grows when inserts arrive within 50ms of each
other, so at the ingestor's insert rate the configured
`CLICKHOUSE_ASYNC_INSERT_BUSY_TIMEOUT_MS` was never reached and every INSERT was
flushed on its own, creating one part per Kafka message per replica in `operations`
and in every rollup fed from it. The adaptive timeout is now disabled so the
configured busy timeout is a fixed flush interval. Expect roughly one part per busy
timeout per replica per rollup instead of one per message; usage data is buffered in
ClickHouse memory for up to that timeout before it is written.
