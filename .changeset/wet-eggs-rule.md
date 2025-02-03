---
'@graphql-hive/cli': minor
---

Add `--target` flag for commands `app:create`, `app:publish`, `operations:check`, `schema:check`,
`schema:delete`, `schema:fetch`, `schema:publish` and `dev`.

The `--target` flag can be used to specify the target on which the operation should be performed.
Either a slug or ID of the target can be provided.

A provided slug must follow the format `$organizationSlug/$projectSlug/$targetSlug` (e.g.
`the-guild/graphql-hive/staging`).

**Example using target slug**

```bash
hive schema:publish --target the-guild/graphql-hive/production ./my-schema.graphql
```

A target id, must be a valid target UUID.

**Example using target id**

```bash
hive schema:publish --target a0f4c605-6541-4350-8cfe-b31f21a4bf80 ./my-schema.graphql
```

**Note:** We encourage starting to use the `--target` flag today. In the future the flag will become
mandatory as we are moving to a more flexible approach of access tokens that can be granted access
to multiple targets.
