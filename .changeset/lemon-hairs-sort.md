---
'hive-console-sdk-rs': minor
---

- `SupergraphFetcher` now supports async fetching of supergraph SDL (new method: `fetch_supergraph_async`).
- It now accepts `retry_count` parameter to specify how many times to retry fetching the supergraph in case of failures.

Breaking;
- `SupergraphFetcher` now has another parameter `FetcherMode` to decide if it should fetch the supergraph sync or async.
- `PersistedDocumentsManager` new needs `user_agent` parameter to be sent to Hive Console when fetching persisted queries.