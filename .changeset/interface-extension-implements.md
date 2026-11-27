---
'hive': patch
---

Fix single schema projects dropping the `implements` clause of an interface that is extended with
`extend interface` later in the SDL. Since 15.7.0, a schema such as

```graphql
interface Node {
  id: ID!
}
interface FinancialEntity implements Node {
  id: ID!
}
extend interface FinancialEntity {
  name: String
}
```

was stored as `interface FinancialEntity { id: ID! name: String }`. Schema checks against a version
published before 15.7.0 reported phantom breaking changes such as
`FinancialEntity object type no longer implements Node interface`, even though the schema contained
none of them.

A schema version that was published while affected keeps the missing `implements` clause until a
new version is published. Publishing an unchanged schema is skipped, so publish the schema with a
small change to store it correctly again.
