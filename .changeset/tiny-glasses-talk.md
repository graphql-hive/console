---
'@graphql-hive/core': minor
'@graphql-hive/apollo': minor
'@graphql-hive/envelop': minor
'@graphql-hive/yoga': minor
---

Add error logging for invalid combinations of the `target` and `token` configuration.

- Please make sure to provide the `target` option for usage reporting when using a token that starts with `hvo1/`.
- Please make sure to **not** provide a `target` option for usage reporting when a token does **not** start with `hvo1/`
