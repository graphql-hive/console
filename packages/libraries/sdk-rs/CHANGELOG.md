# hive-console-sdk-rs

## 0.0.1

### Patch Changes

- [#7143](https://github.com/graphql-hive/console/pull/7143)
  [`b80e896`](https://github.com/graphql-hive/console/commit/b80e8960f492e3bcfe1012caab294d9066d86fe3)
  Thanks [@ardatan](https://github.com/ardatan)! - Extract Hive Console integration implementation
  into a new package `hive-console-sdk` which can be used by any Rust library for Hive Console
  integration

  It also includes a refactor to use less Mutexes like replacing `lru` + `Mutex` with the
  thread-safe `moka` package. Only one place that handles queueing uses `Mutex` now.
