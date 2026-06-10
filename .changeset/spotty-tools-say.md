---
'@graphql-hive/cli': patch
---

The `app:create` command now accepts a directory or a glob pattern in addition to a persisted operations JSON manifest

When a directory or glob is provided, `app:create` scans for `*.graphql` files, normalizes each operation by collapsing whitespace, computes a SHA-256 hash per operation, and uses the resulting manifest directly without writing an intermediate file.

```bash
# from a directory
hive app:create --name my-app --version 1.0.0 ./src/operations

# from a glob pattern
hive app:create --name my-app --version 1.0.0 "./src/**/*.graphql"

# from an existing manifest (unchanged behavior)
hive app:create --name my-app --version 1.0.0 persisted-operations.json
```
