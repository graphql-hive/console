---
'@graphql-hive/cli': minor
---

Support introspection of subgraph's schema in the `$ hive introspect` command.

This change allows developers to extract the schema of a subgraph (GraphQL Federation) from a running service.
It is useful if the GraphQL framework used in the subgraph does not expose the schema as `.graphql` file.

---

This change slightly changes the previous behavior of the `$ hive introspect` command. If the introspected GraphQL API is capable of resolving `{ _service { sdl } }` query, the command will use it to fetch the schema. Otherwise, it will use the regular introspection query.

This change is backward-compatible for most, if not all users and should not affect the existing workflows.

In case it does, you can use the `$ hive introspect --ignore-federation` flag to revert to the previous behavior.
