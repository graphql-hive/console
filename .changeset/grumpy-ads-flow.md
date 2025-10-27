---
'hive': patch
---

Fix issue with native federation public SDL generation around inaccessible interfaces.

**Example supergraph:**

```
schema
  @link(
    url: "https://specs.apollo.dev/federation/v2.3"
    import: ["@inaccessible"]
  ) {
  query: Query
}

type Query {
  user: User
}

interface Node @inaccessible {
  id: ID!
}

type User implements Node {
  id: ID!
}
```

**Public Schema SDL output:**

```diff
  type Query {
    user: User
  }

- type User implements Node {
+ type User {
    id: ID!
  }
```
