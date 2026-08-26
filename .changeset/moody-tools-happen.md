---
'@graphql-hive/cli': minor
---

Add the `app:check` command.

The `app:check` command can be used to verify whether persisted documents are valid against the latest target schema without having to create and upload the persisted documents to the schema registry.

**Example Usage**

```sh
hive app:check persisted-documents.json \
  --registry.accessToken "$HIVE_TOKEN" \
  --target the-guild/hive-console/production
```
