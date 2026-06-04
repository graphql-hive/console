---
'@graphql-hive/cli': patch
---

Add `--publish` flag to `app:create` command to publish the app deployment immediately after creation

Now `app:create` can immediately publish the created app deploymentWwithout needing to run `app:publish` separately.

For example:

```bash
hive app:create --name my-app --version 1.0.0 --publish ./operations.json
```
