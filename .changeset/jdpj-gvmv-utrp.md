---
'hive': minor
---

Add `activeAppDeployments` GraphQL query to find app deployments based on usage criteria.

New filter options:
- `lastUsedBefore`: Find stale deployments that were used but not recently (OR with neverUsedAndCreatedBefore)
- `neverUsedAndCreatedBefore`: Find old deployments that have never been used (OR with lastUsedBefore)
- `name`: Filter by app deployment name (case-insensitive partial match, AND with date filters)

Also adds `createdAt` field to the `AppDeployment` type.

See [Finding Stale App Deployments](https://the-guild.dev/graphql/hive/docs/schema-registry/app-deployments#finding-stale-app-deployments) for more details.
