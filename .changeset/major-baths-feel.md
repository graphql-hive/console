---
'@graphql-hive/cli': minor
'hive': minor
---

Updated federation-composition to v0.21.0

- **Enhanced auth directive validation**: The federation-composition now enforces correct placement of auth directives (`@authenticated`, `@requiresScopes`, `@policy`) by rejecting attempts to place them on interfaces, interface fields, or interface objects with the new `AUTH_REQUIREMENTS_APPLIED_ON_INTERFACE` validation rule.

- **Transitive auth requirements checking**: Added a new validation rule that ensures fields using `@requires` specify at least the auth requirements of the fields they select. If a field doesn't carry forward required auth directives, composition fails with a `MISSING_TRANSITIVE_AUTH_REQUIREMENTS` error.

- **Auth requirements inheritance**: Interface types and fields now properly inherit `@authenticated`, `@requiresScopes`, and `@policy` directives from the object types that implement them.

- **`@cost` directive restrictions**: The `@cost` directive can no longer be placed on interface types, their fields, or field arguments. Invalid placements now result in composition errors instead of being silently accepted.

- **Improved `@listSize` validation**: The directive now validates that `sizedFields` point to actual list fields rather than integer counters. Additionally, `slicingArguments` validation has been added to ensure only arguments that exist in all subgraphs are retained.

- **Fixed `EXTERNAL_MISSING_ON_BASE` rule**: Resolved false positives when handling `@interfaceObject` corner-cases, particularly for `@external` fields on object types provided by interface objects.
