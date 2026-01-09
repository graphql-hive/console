---
'hive-apollo-router-plugin': major
---

- Multiple endpoints support for `HiveRegistry` and `PersistedOperationsPlugin`

Breaking Changes:
- Now there is no `endpoint` field in the configuration, it has been replaced with `endpoints`, which is an array of strings. You are not affected if you use environment variables to set the endpoint.

```diff
HiveRegistry::new(
    Some(
        HiveRegistryConfig {
-            endpoint: String::from("CDN_ENDPOINT"),
+            endpoints: vec![String::from("CDN_ENDPOINT1"), String::from("CDN_ENDPOINT2")],
    )
)
