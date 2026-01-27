---
'hive': minor
---

Enable automatic retrieval of schema changes by comparing with the latest composable version. This has already been the default for new projects created after April 2024. 

Federation and schema stitching projects can now publish service schemas to the registry even if those schemas would break composition. This has also been the default behavior for new projects created after April 2024.

To ensure every version publishd to the schema registry is composable, we recommend to first check the schema against the registry **before** publishing.
