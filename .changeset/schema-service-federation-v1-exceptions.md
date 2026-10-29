---
'hive': patch
---

An exception thrown by the Federation v1 composer for an invalid `@key`, `@requires` or `@provides` field set, for example one that contains a fragment spread or a selection set, is now reported as a composition error instead of failing the request with an unexpected error. Any other exception from the composer is reported as an unexpected composition error.
