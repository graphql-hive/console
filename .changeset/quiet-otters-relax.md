---
'hive': patch
---

Fix several usage-ingestion reliability issues


- Avoid sending empty placeholder messages when splitting oversized usage reports
- Stop needlessly duplicating app deployment usage timestamps across every split chunk
- Correct subscription operations' client version parsing so they can populate app deployment
  "last used" tracking
- Keep the usage service unhealthy until its fallback queue has fully drained after a Kafka
  reconnect
- Correct the raw operation failure metric so it no longer drifts negative or over-counts retries
  (and separately track operations dropped because the fallback queue is full)
- Add visibility (a metric and a logged payload) when the usage ingestor hits a report write
  failure or an unparseable message
- Make an unreachable Kafka error-code branch fail safe (retry via the fallback queue) instead of
  silently dropping operations with no way to recover them if it were ever reached
- Further reduce oversized single operation reports by chunking on subscriptionOperations and
  errors instead of being dropped
