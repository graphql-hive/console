---
'hive': patch
---

Reduce CPU usage of schema checks and publishes by parsing and hashing each SDL once instead of repeatedly during a single check or publish.
