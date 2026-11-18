---
'hive': patch
---

Release a lock that is acquired after its request was aborted, before any work started. Before, such a lock was left in Redis until it expired, blocking other requests for the same resource for up to 10 seconds.
