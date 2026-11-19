---
'hive': patch
---

Upgrade `@graphql-inspector/core` from 8.0.3 to 8.1.1, which changes how schema checks and publishes compute schema changes:

- Schema diffs are faster on large schemas where most of the schema is unchanged, such as federation supergraphs. Unchanged fields, directive usages, type references and default values are skipped without extra work, and directive argument values are compared structurally instead of being printed to strings first.
- Directive usages, such as `@deprecated`, are no longer reported as added or removed when one of the two compared schemas has no AST, for example because it was built from introspection. In that case directive usages are not compared at all.
