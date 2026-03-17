# OTEL Trace Stress Test

The purpose of this script is to see how our infrastructure responds to high loads and cardinality.

The affected components are:

- otel trace collector
- clickhouse (cloud)

## Running the script

The following environment variabels are required

```
OTEL_ENDPOINT
HIVE_ORGANIZATION_ACCESS_TOKEN
HIVE_TARGET_REF
```

**Example:**

```sh
OTEL_ENDPOINT=https://api.hiveready.dev/otel/v1/traces \
  HIVE_ORGANIZATION_ACCESS_TOKEN="<REPLACE ME>" \
  HIVE_TARGET_REF="the-guild/hive/dev" \
  k6 run load-tests/otel-traces/test.ts
```
