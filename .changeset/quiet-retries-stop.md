---
'@graphql-hive/core': patch
---

Stop retrying HTTP requests after a 4xx response or an abort by the caller. The client called `bail()` and then threw, and `async-retry` keeps retrying when a throw follows `bail()` ([vercel/async-retry#69](https://github.com/vercel/async-retry/issues/69)). A 4xx response therefore sent `retries + 1` requests (6 with the default settings). `async-retry` is replaced with `@tendjs/async-retry`, a drop-in replacement that stops after `bail()`.
