---
'hive-console-sdk-rs': minor
---
Breaking;
- `SupergraphFetcher` now has two different modes: async and sync. You can choose between `SupergraphFetcherAsyncClient` and `SupergraphFetcherSyncClient` based on your needs. See the examples at the bottom.
- `SupergraphFetcher` now has a new `retry_count` parameter to specify how many times to retry fetching the supergraph in case of failures.
- `PersistedDocumentsManager` new needs `user_agent` parameter to be sent to Hive Console when fetching persisted queries.
- `UsageAgent::new` is now `UsageAgent::try_new` and it returns a `Result` with `Arc`, so you can freely clone it across threads. This change was made to handle potential errors during the creation of the HTTP client. Make sure to handle the `Result` when creating a `UsageAgent`.

```rust
// Sync Mode
let fetcher = SupergraphFetcher::<SupergraphFetcherSyncClient>::try_new(/* params */)
.map_err(|e| anyhow!("Failed to create SupergraphFetcher: {}", e))?;

// Use the fetcher to fetch the supergraph (Sync)
let supergraph = fetcher
    .fetch_supergraph()
    .map_err(|e| anyhow!("Failed to fetch supergraph: {}", e))?;

// Async Mode

let fetcher = SupergraphFetcher::<SupergraphFetcherAsyncClient>::try_new(/* params */)
.map_err(|e| anyhow!("Failed to create SupergraphFetcher: {}", e))?;

// Use the fetcher to fetch the supergraph (Async)
let supergraph = fetcher
    .fetch_supergraph()
    .await
    .map_err(|e| anyhow!("Failed to fetch supergraph: {}", e))?;
```