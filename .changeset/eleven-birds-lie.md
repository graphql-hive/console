---
'hive-console-sdk-rs': minor
'hive-apollo-router-plugin': patch
---

Breaking;

- `UsageAgent` now accepts `Duration` for `connect_timeout` and `request_timeout` instead of `u64`.
- `SupergraphFetcher` now accepts `Duration` for `connect_timeout` and `request_timeout` instead of `u64`.
- `PersistedDocumentsManager` now accepts `Duration` for `connect_timeout` and `request_timeout` instead of `u64`.
- Use original `graphql-parser` and `graphql-tools` crates instead of forked versions. 