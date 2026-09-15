---
'hive': patch
---

Add visibility (a metric and a logged payload) when the usage ingestor hits a
report write failure - or a genuinely corrupt/unparseable message - that
leaves a message's Kafka offset uncommitted for reprocessing. Previously such
a message retried silently forever with no way for an operator to notice a
stuck partition.
