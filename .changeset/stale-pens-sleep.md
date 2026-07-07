---
'hive': patch
---

Write s3 schema artifacts in parallel on schema publish. Previously, the subgraph SDLs would be written first and then the composite schema SDL would be written.
