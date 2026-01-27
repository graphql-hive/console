---
'hive': minor
---

Enable automatic retrieval of schema changes by comparing with the latest composable version. This has already been the default for new projects created after April 2024. 

The previous behavior was preserved only for legacy compatibility.

To ensure every version publishd to the schema registry is composable, we recommend to first check the schema against the registry before publishing.
