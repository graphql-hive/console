---
'hive': patch
---

Fix three related correctness bugs in the usage service's Kafka
producer/fallback path: keep the usage service unhealthy until its fallback
queue has fully drained after a Kafka reconnect (instead of coming back
Ready while messages are still undelivered), correct the raw operation
failure metric so a successful fallback-queue retry no longer over-counts by
skipping its matching decrement, and make an unreachable Kafka error-code
branch fail safe (retry via the fallback queue) instead of silently dropping
operations with no way to recover them if it were ever reached.
