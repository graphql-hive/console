---
'hive': minor
---

Add configurable data retention TTL for self-hosted Hive instances. Self-hosted users can now configure retention periods via environment variables instead of hardcoded values.

New environment variables:
- `CLICKHOUSE_TTL_TABLES` - Retention for ClickHouse mergetree tables (Default: 1 YEAR)
- `CLICKHOUSE_TTL_DAILY_MV_TABLES` - Retention for daily materialized view tables (Default: 1 YEAR)
- `CLICKHOUSE_TTL_HOURLY_MV_TABLES` - Retention for hourly materialized view tables (Default: 30 DAYS)
- `CLICKHOUSE_TTL_MINUTELY_MV_TABLES` - Retention for minutely materialized view tables (Default: 24 HOURS)

Supports both numeric days (e.g., `365`) and ClickHouse interval syntax (e.g., `"1 YEAR"`, `"30 DAY"`, `"24 HOUR"`).

The retention update runs automatically if any retention environment variable is set.
