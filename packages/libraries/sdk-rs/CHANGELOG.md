# hive-console-sdk-rs

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
