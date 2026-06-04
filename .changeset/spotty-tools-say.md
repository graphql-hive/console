---
'@graphql-hive/cli': patch
---

Add a new `app:genops` command for generating a persisted operations manifest from GraphQL operation files

The command recursively scans a directory for `*.graphql` files, normalizes each operation by collapsing whitespace, computes a SHA-256 hash per operation, and writes the resulting key-value manifest as JSON.

```bash
hive app:genops ./src/operations --out persisted-operations.json
```

The output file is a JSON object where each key is the SHA-256 hash of the operation and the value is the normalized operation string:

```json
{
  "e3b0c44298fc1c149afb": "query GetUser { user { id name } }",
  "a87ff679a2f3e71d9181": "mutation UpdateUser($id: ID!) { updateUser(id: $id) { id } }"
}
```

The `--out` flag defaults to `persisted-operations.json` when not provided:

```bash
hive app:genops ./src/operations
```

The generated manifest can be passed directly to `app:create`:

```bash
hive app:create --name my-app --version 1.0.0 persisted-operations.json
```
