---
'@graphql-hive/cli': minor
'hive': minor
---

Updates the `@theguild/federation-composition` to `v0.18.0` that includes the following changes:

- Support progressive overrides (`@override(label: "<value>")`)
- Allow to use `@composeDirective` on a built-in scalar (like `@oneOf`)
- Performance improvements (lazy compute of errors), especially noticeable in large schemas (2s -> 600ms)
