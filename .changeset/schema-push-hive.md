---
'hive': minor
---

Add schema push support. Named schema revisions can now be uploaded without publishing them immediately and published later.

Adds the `schema:push` permission for organization members, organization access tokens, and target access tokens for felxibly managing access control for the new capabality.

Use the `hive schema:push` command for pushing a (subgraph) schema to the registry, then reference it when running the `hive schema:publish` command.

```sh
hive schema:push schema.graphql \
  --target my-org/my-project/my-target \
  --revision "$REVISION"

hive schema:publish \
  --target my-org/my-project/my-target \
  --revision "$REVISION"
```

Closes https://github.com/graphql-hive/console/issues/8404
