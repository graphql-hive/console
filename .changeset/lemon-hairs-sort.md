---
'hive-console-sdk-rs': minor
---
Breaking;
- `SupergraphFetcher` now has two different modes: async and sync. You can choose between `SupergraphFetcherAsyncClient` and `SupergraphFetcherSyncClient` based on your needs. See the examples at the bottom.
- `SupergraphFetcher` now has a new `retry_count` parameter to specify how many times to retry fetching the supergraph in case of failures.
- `PersistedDocumentsManager` new needs `user_agent` parameter to be sent to Hive Console when fetching persisted queries.

```rust
// Sync Mode
let fetcher = SupergraphFetcher::<SupergraphFetcherSyncClient>::try_new(
    endpoint,
    &key,
    format!("hive-apollo-router/{}", PLUGIN_VERSION),
    Duration::from_secs(5),
    Duration::from_secs(60),
    accept_invalid_certs,
    3,
)
.map_err(|e| anyhow!("Failed to create SupergraphFetcher: {}", e))?;

// Use the fetcher to fetch the supergraph (Sync)
let supergraph = fetcher
    .fetch_supergraph()
    .map_err(|e| anyhow!("Failed to fetch supergraph: {}", e))?;

// Async Mode

let fetcher = SupergraphFetcher::<SupergraphFetcherAsyncClient>::try_new(
    endpoint,
    &key,
    format!("hive-apollo-router/{}", PLUGIN_VERSION),
    Duration::from_secs(5),
    Duration::from_secs(60),
    accept_invalid_certs,
    3,
)
.map_err(|e| anyhow!("Failed to create SupergraphFetcher: {}", e))?;

// Use the fetcher to fetch the supergraph (Async)
let supergraph = fetcher
    .fetch_supergraph()
    .await
    .map_err(|e| anyhow!("Failed to fetch supergraph: {}", e))?;
```