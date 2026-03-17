---
'@graphql-hive/cli': minor
---

Support introspection of federated subgraph's schema in the `$ hive introspect` command.

This change allows developers to extract the schema of a subgraph (GraphQL Federation)
from a running service. It is useful if the GraphQL framework used in the subgraph
does not emit the schema as `.graphqls` file during build.

---

The CLI attempts to automatically detect whether the endpoint is a a GraphQL Federation, by checking whether the `_Service` type is accessible via introspection.

If you want to either force Apollo Subgraph or GraphQL introspection you can do that via the `--type` flag.

```sh
# Force GraphQL Introspection
hive introspect --type graphql http://localhost:3000/graphql
```

```sh
# Force GraphQL Federation Introspection
hive introspect --type federation http://localhost:3000/graphql
```

The federation introspection requires the introspected GraphQL API is capable of resolving the following two queries:
- **`{ __type(name: "_Service") { name } }`** for looking up whether the GraphQL service is a Federation subgraph
- **`{ _service { sdl } }`** for retrieving the subgraph SDL
