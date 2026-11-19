---
'@graphql-hive/cli': patch
'hive': patch
---

Upgrades federation composition library to `v0.27.2`.

- Preserve `@external`, `@requires`, and `@provides` metadata when composing fields contributed by `@interfaceObject` subgraphs.
- Fix a crash when a directive shares its name with a type (e.g. `directive @TaskStatus` next to `enum TaskStatus`).
- Keep untagged arguments of included fields in schema contracts. Arguments without their own `@tag` now inherit the tags of their fieldr.
