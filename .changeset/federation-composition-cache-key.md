---
'hive': patch
---

Fix the schema service cache for federation compositions. The request id was part of the cache key, so identical compositions of different schema checks and publishes were never reused.
