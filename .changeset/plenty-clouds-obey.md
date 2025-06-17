---
'@graphql-hive/cli': patch
'hive': patch
---

Update `@theguild/federation-composition` to `0.18.4`

Increases federation composition compatibility.
- Fix errors raised by `@requires` with union field selection set
- Fix incorrectly raised `IMPLEMENTED_BY_INACCESSIBLE` error for inaccessible object fields where the object type is inaccessible.
- Add support for `@provides` fragment selection sets on union type fields.
