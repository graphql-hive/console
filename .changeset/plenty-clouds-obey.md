---
'@graphql-hive/cli': patch
'hive': patch
---

Update `@theguild/federation-composition` to `0.19.0`

Increases federation composition compatibility.
- Fix errors raised by `@requires` with union field selection set
- Fix incorrectly raised `IMPLEMENTED_BY_INACCESSIBLE` error for inaccessible object fields where the object type is inaccessible.
- Add support for `@provides` fragment selection sets on union type fields.
- Fix issue where the satisfiability check raised an exception for fields that share different object type and interface definitions across subgraphs.
- Fix issue where scalar type marked with `@inaccessible` does not fail the composition if all usages are not marked with `@inaccessible`.
- Support composing executable directives from subgraphs into the supergraph
