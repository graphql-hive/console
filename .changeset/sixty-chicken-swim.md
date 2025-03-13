---
'hive': major
---

Restructure the environment variables used for the Hive Cloud hosting. While this is techincally a breaking change it will not really affect people self-hosting Hive.

**Breaking**: Remove unused environment variable options `HIVE_REPORTING`, `HIVE_REPORTING_ENDPOINT` and `HIVE_USAGE_DATA_RETENTION_PURGE_INTERVAL_MINUTES` from the `server` service.

These environment variables are obsolete since the Hive GraphQL schema is reported via the Hive CLI instead.

**Breaking**: Replace the environment variable option `HIVE` with `HIVE_USAGE`, rename environment variable option `HIVE_API_TOKEN` to `HIVE_USAGE_ACCESS_TOKEN` for the `server` service. Require providing the `HIVE_USAGE_ACCESS_TOKEN` environment variable if `HIVE_USAGE` is set to `1`.
