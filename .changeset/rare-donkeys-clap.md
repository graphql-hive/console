---
'@graphql-hive/laboratory': minor
---

Union and interface fields are now expandable in the query builder: each abstract field lists its possible types as a `... on Type` row, with `__typename` selected automatically so the operation stays valid. Previously an abstract field was written with no selection set and servers rejected the request. Search now finds fields inside those branches, and a field selected inside a hand-written inline fragment checks the row under its own type rather than the parent's.
