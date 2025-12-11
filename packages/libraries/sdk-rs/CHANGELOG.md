# hive-console-sdk-rs

## 0.2.2

### Patch Changes

- [#7405](https://github.com/graphql-hive/console/pull/7405)
  [`24c0998`](https://github.com/graphql-hive/console/commit/24c099818e4dfec43feea7775e8189d0f305a10c)
  Thanks [@ardatan](https://github.com/ardatan)! - Use the JSON Schema specification of the usage
  reports directly to generate Rust structs as a source of truth instead of manually written types

## 0.2.1

### Patch Changes

- [#7364](https://github.com/graphql-hive/console/pull/7364)
  [`69e2f74`](https://github.com/graphql-hive/console/commit/69e2f74ab867ee5e97bbcfcf6a1b69bb23ccc7b2)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix the bug where reports were not being sent
  correctly due to missing headers

## 0.2.0

### Minor Changes

- [#7246](https://github.com/graphql-hive/console/pull/7246)
  [`cc6cd28`](https://github.com/graphql-hive/console/commit/cc6cd28eb52d774683c088ce456812d3541d977d)
  Thanks [@ardatan](https://github.com/ardatan)! - Breaking;

  - `SupergraphFetcher` now has two different modes: async and sync. You can choose between
    `SupergraphFetcherAsyncClient` and `SupergraphFetcherSyncClient` based on your needs. See the
    examples at the bottom.
  - `SupergraphFetcher` now has a new `retry_count` parameter to specify how many times to retry
    fetching the supergraph in case of failures.
  - `PersistedDocumentsManager` new needs `user_agent` parameter to be sent to Hive Console when
    fetching persisted queries.
  - `UsageAgent::new` is now `UsageAgent::try_new` and it returns a `Result` with `Arc`, so you can
    freely clone it across threads. This change was made to handle potential errors during the
    creation of the HTTP client. Make sure to handle the `Result` when creating a `UsageAgent`.

  ```rust
  // Sync Mode
  let fetcher = SupergraphFetcher::try_new_sync(/* params */)
  .map_err(|e| anyhow!("Failed to create SupergraphFetcher: {}", e))?;

  // Use the fetcher to fetch the supergraph (Sync)
  let supergraph = fetcher
      .fetch_supergraph()
      .map_err(|e| anyhow!("Failed to fetch supergraph: {}", e))?;

  // Async Mode

  let fetcher = SupergraphFetcher::try_new_async(/* params */)
  .map_err(|e| anyhow!("Failed to create SupergraphFetcher: {}", e))?;

  // Use the fetcher to fetch the supergraph (Async)
  let supergraph = fetcher
      .fetch_supergraph()
      .await
      .map_err(|e| anyhow!("Failed to fetch supergraph: {}", e))?;
  ```

## 0.1.1

### Patch Changes

- [#7248](https://github.com/graphql-hive/console/pull/7248)
  [`d8f6e25`](https://github.com/graphql-hive/console/commit/d8f6e252ee3cd22948eb0d64b9d25c9b04dba47c)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Support project and personal access tokens (`hvp1/`
  and `hvu1/`).

## 0.1.0

### Minor Changes

- [#7196](https://github.com/graphql-hive/console/pull/7196)
  [`7878736`](https://github.com/graphql-hive/console/commit/7878736643578ab23d95412b893c091e32691e60)
  Thanks [@ardatan](https://github.com/ardatan)! - Breaking;

  - `UsageAgent` now accepts `Duration` for `connect_timeout` and `request_timeout` instead of
    `u64`.
  - `SupergraphFetcher` now accepts `Duration` for `connect_timeout` and `request_timeout` instead
    of `u64`.
  - `PersistedDocumentsManager` now accepts `Duration` for `connect_timeout` and `request_timeout`
    instead of `u64`.
  - Use original `graphql-parser` and `graphql-tools` crates instead of forked versions.

## 0.0.1

### Patch Changes

- [#7143](https://github.com/graphql-hive/console/pull/7143)
  [`b80e896`](https://github.com/graphql-hive/console/commit/b80e8960f492e3bcfe1012caab294d9066d86fe3)
  Thanks [@ardatan](https://github.com/ardatan)! - Extract Hive Console integration implementation
  into a new package `hive-console-sdk` which can be used by any Rust library for Hive Console
  integration

  It also includes a refactor to use less Mutexes like replacing `lru` + `Mutex` with the
  thread-safe `moka` package. Only one place that handles queueing uses `Mutex` now.
