---
'hive': patch
'@graphql-hive/cli': patch
---

Update `@theguild/federation-composition` to `0.26.3`. Unresolvable `@requires`,
`@key`, `@provides` and `@fromContext` selections are now reported as composition
errors instead of throwing, so composition fails with a proper error message
instead of crashing.
