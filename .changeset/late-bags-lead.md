---
'hive': patch
---

Adjust usage service liveness and startup probe logic. Fix usage service being sent traffic before the kafka producer is connected and ready to start sending messages. Track usage fallback client state as a separate variable to avoid a race condition that could leave it unhealthy.
