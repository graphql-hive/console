---
'hive-console-sdk-rs': patch
---

- `SupergraphFetcher` now supports async fetching of supergraph SDL (new method: `fetch_supergraph_async`).
- It now accepts `retry_count` parameter to specify how many times to retry fetching the supergraph in case of failures.
