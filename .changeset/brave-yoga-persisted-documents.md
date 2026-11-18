---
'@graphql-hive/yoga': patch
---

Fix persisted documents crashing with `graphql-yoga@6` by dropping the `@graphql-yoga/plugin-persisted-operations` dependency, which is bound to a single `graphql-yoga` major.
