---
'@graphql-hive/apollo': minor
'@graphql-hive/core': minor
'@graphql-hive/yoga': minor
---

The persisted documents feature is now stable. Please use the `persistedDocuments` configuration option instead of `experimental__persistedDocuments`.

```diff
  useHive({
-   experimental__persistedDocuments: {
+   persistedDocuments: {
      cdn: {
        endpoint: 'https://cdn.graphql-hive.com/artifacts/v1/<target_id>',
        accessToken: '<cdn_access_token>'
      },
    },
  })
```
