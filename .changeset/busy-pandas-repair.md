---
'hive': patch
---

Fix Federation composition rule `REQUIRED_INACCESSIBLE` reporting a composition error if `@inaccessible` is applied on a non-nullable field with a default value.

In the following example schema the `Query.ping(message:)` argument no longer raises `REQUIRED_INACCESSIBLE`, as a default value for the argument is provided. The same behaviour applies for input type fields.

```graphql
extend schema
  @link(
    url: "https://specs.apollo.dev/federation/v2.9"
    import: ["@inaccessible"]
  )

type Query {
  ping(message: String! = "pong" @inaccessible): String!
}
```
