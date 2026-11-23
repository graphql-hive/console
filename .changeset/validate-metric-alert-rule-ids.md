---
'hive': patch
---

Return "not found" instead of an unexpected database error when a metric alert rule, notification
channel, or saved filter id that is not a valid UUID is provided.
