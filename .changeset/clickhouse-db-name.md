---
'hive': minor
---

Add the `CLICKHOUSE_DB` environment variable to choose which ClickHouse database Hive Console uses, so one ClickHouse server can host other databases alongside it. Every service sends it as the `database` request setting; the database must already exist. Unset, it is `default`, which is where Hive Console has always put its tables.

Resolves https://github.com/graphql-hive/console/issues/8634
