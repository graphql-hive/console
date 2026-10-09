---
'hive': patch
---

Fix the schema service composition scheduler leaving a terminated worker in the pool after a handled composition error. The next composition assigned to that worker was silently dropped and timed out after 60 seconds. Workers are now kept alive after handled errors, and any worker that exits is replaced immediately.
