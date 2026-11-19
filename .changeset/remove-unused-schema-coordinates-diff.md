---
'hive': patch
---

Reduce CPU usage of schema checks, publishes and deletes by no longer computing a schema coordinates diff whose result was never used.
