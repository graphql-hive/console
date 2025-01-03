---
'@graphql-hive/apollo': patch
'@graphql-hive/core': patch
'@graphql-hive/yoga': patch
---

Remove internal `_testing_` option to replace the underlying `fetch` implementation,
and add `fetch` option to do the same as part of the public API.
