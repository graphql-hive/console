---
'hive': patch
---

Track operations dropped by the usage fallback queue. Messages were silently
discarded when they were too large for Kafka or when the queue overflowed its
max size, with only a log line and no metric - add dedicated counters for
each case so both failure modes are visible to monitoring.
