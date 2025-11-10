---
'hive-console-sdk-rs': minor
---

- `SupergraphFetcher` no longer uses `reqwest::blocking::Client` internally, but instead uses `reqwest::Client`.
- It now accepts `retry_count` parameter to specify how many times to retry fetching the supergraph in case of failures.

Breaking;

- `fetch_supergraph` is now `async fn` and needs to be awaited.

