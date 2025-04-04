---
'@graphql-hive/cli': minor
'hive': minor
---

Updates the `@theguild/federation-composition` to `v0.18.1` that includes the following changes:

- Support progressive overrides (`@override(label: "<value>")`)
- Allow to use `@composeDirective` on a built-in scalar (like `@oneOf`)
- Performance improvements (lazy compute of errors), especially noticeable in large schemas (2s -> 600ms)
- Ensure nested key fields are marked as `@shareable`
- Stop collecting paths when a leaf field was reached (performance improvement)
- Avoid infinite loop when entity field returns itself
