---
'@graphql-hive/cli': patch
---

Make `--version` flag optional in `app:create` command

When `--version` is not provided, a random 7-character alphanumeric version is generated and used for creating the app deployment.

For example:

```bash
hive app:create --name my-app ./operations.json
```

