---
'hive-console-sdk-rs': minor
---

Circuit Breaker Implementation and Multiple Endpoints Support

Implementation of Circuit Breakers in Hive Console Rust SDK, you can learn more [here](https://the-guild.dev/graphql/hive/product-updates/2025-12-04-cdn-mirror-and-circuit-breaker)

Breaking Changes:

Now `endpoint` configuration accepts multiple endpoints as an array for `SupergraphFetcherBuilder` and `PersistedDocumentsManager`.

```diff
SupergraphFetcherBuilder::default()
-    .endpoint(endpoint)
+    .add_endpoint(endpoint1)
+    .add_endpoint(endpoint2)
```

This change requires updating the configuration structure to accommodate multiple endpoints.
