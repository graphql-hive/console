---
'hive': patch
---

Reduce CPU usage of schema checks and publishes by building lexicographically sorted schemas about 1.7× faster. The schema's AST is sorted before the schema is built once, instead of building the schema and then re-creating every type in sorted order. The resulting schema, including the key order of input object default values, stays the same, so existing schema change approvals keep matching.
