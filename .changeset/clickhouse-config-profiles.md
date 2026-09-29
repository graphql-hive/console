---
'hive': patch
---

Fix the local development and integration-test ClickHouse container failing to start on ClickHouse
26.8 with `UNKNOWN_ELEMENT_IN_CONFIG`. The settings in
`docker/configs/clickhouse/memory-optimizations.xml` were wrapped in a bare `<default>` element
that server configs do not accept (older ClickHouse versions silently ignored it, so the settings
never took effect). The per-query settings now sit under `<profiles><default>` and the server-level
settings at the root.
