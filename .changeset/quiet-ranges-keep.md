---
'hive': minor
---

The date range lives in the URL and stays inside the organization's usage retention: presets past it are greyed out, a link outside it resets with a toast, and the API rejects usage reads that start before it (`PERIOD_OUTSIDE_RETENTION`).

Self-hosted instances: retention is now enforced. An instance that never configured it stores 7 days per organization; set `CLICKHOUSE_TTL_TABLES` (for example `1 YEAR`) to raise it, as described under "Data Retention" in the [self-hosting guide](https://the-guild.dev/graphql/hive/docs/schema-registry/self-hosting/get-started).

Metric alert rules: a `% change vs. previous` rule reads twice its window, so the form greys out windows past half the organization's retention and the API rejects them. A 3d window preset is added.
