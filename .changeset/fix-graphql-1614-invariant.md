---
"@graphql-hive/laboratory": patch
---

Bump bundled `graphql` from `^16.12.0` to `^16.14.0` to fix "Unexpected invariant triggered" error in the schema explorer when introspecting servers running graphql-js 16.14+. graphql-js 16.14.0 added `DIRECTIVE_DEFINITION` to the `@deprecated` directive's introspection locations; the previously bundled 16.12.0 did not recognise this enum value, making the Laboratory unusable against any such server.
