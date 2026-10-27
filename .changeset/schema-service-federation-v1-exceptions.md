---
'hive': patch
---

An exception thrown by the Federation v1 composer, for example for a `@key` field set that contains a fragment spread or a selection set, is now reported as a composition error instead of failing the request with an unexpected error.
