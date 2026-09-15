---
'hive': patch
---

Add a metric and a logged payload when the usage ingestor hits a
corrupt/unparseable usage report. Previously, the message retried
silently forever with no way for an operator to notice a stuck
partition.
