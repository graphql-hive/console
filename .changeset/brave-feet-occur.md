---
'@graphql-hive/cli': patch
---

Correct fallback behavior for subgraph introspection. If subgraph introspection using graphql's standard introspection query fails, then it will fall back to Federation's Query._service query.
