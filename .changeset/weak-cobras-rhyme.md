---
'hive': major
---

Add fields for querying usage datato the public api schema.
- `Target.schemaCoordinateStats`
- `Target.clientStats`
- `Target.operationsStats`

**BREAKING CHANGE**: This renames and changes the types for existing types within the private GraphQL schema.
