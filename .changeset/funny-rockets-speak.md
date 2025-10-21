---
'hive-console-sdk-rs': patch
'hive-apollo-router-plugin': minor
---

Extract Hive Console integration implementation into a new package `hive-console-sdk` which can
be used by any Rust library for Hive Console integration

It also includes a refactor to use less Mutexes like replacing `lru` + `Mutex` with the thread-safe `moka` package.
Only one place that handles queueing uses `Mutex` now.
