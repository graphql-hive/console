---
'@graphql-hive/cli': patch
'hive': patch
---

Improve federation composition rules.

- Fix supergraph `@join__field` generation for `@override` + `@requires` migrations and add a progressive override restriction.
- When a field with `@requires` is overridden, composition now ignores `@requires` usage coming only from the overridden source field when deciding whether to keep `@join__field(..., external: true)`. This prevents stale external annotations in the supergraph.
- Progressive override (`@override(..., label: ...)`) is now rejected when the overridden source field uses `@requires` (error code: `OVERRIDE_COLLISION_WITH_ANOTHER_DIRECTIVE`). Non-progressive override behavior is unchanged.
