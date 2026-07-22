---
'hive': patch
---

Support composing directive argument default values within the native composition.

```graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.5", import: ["@key", "@composeDirective"])
  @link(url: "https://myspecs.dev/access/v1.0", import: ["@access"])
  @composeDirective(name: "@access")

directive @access(scope: Scope! = PUBLIC) on FIELD_DEFINITION
enum Scope {
  PUBLIC
  PRIVATE
}

type Query {
  hello: String @access
}
```

Previously, the `PUBLIC` default value in the above example would not be set in the composed result.
