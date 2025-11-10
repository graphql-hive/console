---
'hive-console-sdk-rs': minor
---

- `SupergraphFetcher` now supports async fetching of supergraph SDL (new method: `fetch_supergraph_async`).

Breaking;
- `SupergraphFetcher` now has two parameters;
- - `FetcherMode` to decide if it should fetch the supergraph sync or async.
- - `retry_count` parameter to specify how many times to retry fetching the supergraph in case of failures.
- `PersistedDocumentsManager` new needs `user_agent` parameter to be sent to Hive Console when fetching persisted queries.