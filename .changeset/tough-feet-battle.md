---
'@graphql-hive/cli': patch
'hive': patch
---

Upgrade composition library to support oneOf directive without requiring composeDirective, and to
fix an edge case where an external field is not flagged as external in the supergraph if another
graph uses that field in the key
