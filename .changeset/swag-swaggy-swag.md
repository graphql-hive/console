---
'@graphql-hive/cli': minor
---

Support providing a base schema when performaning a schema check. When providing a base schema the diff is generated based on the latest schema version composed with the provided base schema override for the service.

This helps when running the `hive schema:check` command as part of a merge queue in order to avoid flagging breaking changes that have been approved in the context of a previous merge queue pull request failing the merge queue check.

Use the `--base` CLI argument for referencing either a local file or a file within the Git history.

```sh
hive schema:check \
  --target the-guild/hive-console/development \
  --base 43e728ea9:schema.graphqls \
  --service products \
  --contextId "hive-console#67" \
  schema.graphqls
```
