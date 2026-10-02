---
'hive': patch
---

Add a partial index on `schema_versions` records without a `graph_id`, so that listing the schema versions of a graph that was backfilled from a target does not scan every newer record of that target.
