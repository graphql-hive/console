---
'hive': patch
---

Fix schema SDL not including directives when composing with schema stitching (impacting Federation projects). Bumped `@graphql-tools/stitch` to v10.1.22, [which contains a necessary bugfix](https://github.com/graphql-hive/gateway/pull/2401), and switched from `printSchema` to `printSchemaWithDirectives` when printing the stitched schema SDL.
