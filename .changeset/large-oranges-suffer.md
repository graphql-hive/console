---
'@graphql-hive/cli': minor
---

Support introspection of federated subgraph's schema in the `$ hive introspect` command.

This change allows developers to extract the schema of a subgraph (GraphQL Federation)
from a running service. It is useful if the GraphQL framework used in the subgraph
does not expose the schema as `.graphql` file.

---

To switch to subgraph introspection, add the argument `--subgraph` to `$ hive introspect` command.
`$ hive introspect --subgraph` requires the introspected GraphQL API is capable of resolving query
Federation's `{ _service { sdl } }` query.
