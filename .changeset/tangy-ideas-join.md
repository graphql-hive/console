---
'@graphql-hive/gateway-plugin-console-sdk': patch
'@graphql-hive/core': patch
---

Explicitly supports errors thrown in the gateway. I.e. authentication during execution.

This adds a new field to the usage payload that specifically contains errors thrown within the gateway. This separates gateway errors from subgraph errors. All errors are currently ingested similarly into Clickhouse, but this change supports future improvements to show the source (subgraph name or gateway) of errors.
