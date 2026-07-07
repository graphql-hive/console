---
'hive': patch
---

Write s3 schema artifacts in parallel on schema publish. Previously, the subgraph SDL would be written first and then the supergraph would be written.
