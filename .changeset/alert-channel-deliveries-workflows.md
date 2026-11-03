---
'hive': minor
---

Webhook deliveries made by the workflows service (schema change notifications to webhook channels, and all metric alert notifications) are now recorded in ClickHouse alongside the ones made by the API, and carry the same identifying headers: `Hive-Request-ID`, `Hive-Event`, `Hive-Target-ID`, `Hive-Schema-ID` (schema changes), `Idempotency-Key` and a `User-Agent` of `Hive-Webhooks/<release>`. Slack metric alert messages carry the same values as message metadata and retry at most 3 times inside the Slack client.

Recording needs the workflows service to reach ClickHouse: set `CLICKHOUSE=1` and the `CLICKHOUSE_*` variables. The community docker-compose now sets them, which also turns on metric alert rule evaluation there.
