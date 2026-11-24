---
'@graphql-hive/core': minor
'@graphql-hive/yoga': minor
'@graphql-hive/apollo': minor
'@graphql-hive/envelop': minor
'@graphql-hive/gateway-plugin-console-sdk': minor
'@graphql-hive/external-composition': minor
---

**BREAKING:** Support `graphql@17` and drop support for `graphql@0.13`, `graphql@14` and `graphql@15`. The `graphql` peer dependency is now `^16.0.0 || ^17.0.0`.

The keys of the operation map in usage reports are derived from the document AST, which `graphql@17` serializes differently, so they change when moving to `graphql@17`. This does not affect how operations are identified in Hive Console.
