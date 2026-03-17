---
'@graphql-hive/cli': minor
'hive': minor
---

Improve federation composition

- Support `file:` protocol and non-RFC 3986 in imported `link` url arguments
- Fix supergraph `@join__field` emission for Federation v1 `@external` fields and improve `override`/`requires` edge-case handling.
  - Drop Federation v1 `@join__field(external: true)` fields based on key usage in the subgraph instead of aggregated field key usage across subgraphs.
  - Avoid emitting redundant `@join__field(external: true)` metadata when a field is only required through overridden paths.
  - Tighten `@join__field` emission around @override and interface type fields.
