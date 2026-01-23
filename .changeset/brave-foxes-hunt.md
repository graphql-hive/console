---
'@graphql-hive/core': patch
---

Clear persisted documents caches on dispose to prevent memory leaks. The `dispose()` function now clears `persistedDocumentsCache` and `fetchCache` to allow proper garbage collection.
