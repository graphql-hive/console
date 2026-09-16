---
'@graphql-hive/cli': patch
---

Add `schema:push` for uploading immutable named schema revisions without publishing them immediately. A pushed revision can later be published by passing `--revision` to `schema:publish` instead of retrieving the SDL from a file or GraphQL endpoint.

Push and publish a monolith schema revision:

```sh
hive schema:push schema.graphql \
  --target my-org/my-project/my-target \
  --revision "$REVISION"

hive schema:publish \
  --target my-org/my-project/my-target \
  --revision "$REVISION"
```

For a federated schema, provide the service when pushing and the service URL when publishing:

```sh
hive schema:push products.graphql \
  --target my-org/my-project/my-target \
  --service products \
  --revision "$REVISION"

hive schema:publish \
  --target my-org/my-project/my-target \
  --service products \
  --url https://products.example.com/graphql \
  --revision "$REVISION"
```

Revision names are immutable for a service within a project. Pushing different SDL with an existing revision fails with an error such as `Revision 'products@abc123' already exists with a different schema.` Attempting to publish an unknown revision reports `Schema revision 'abc123' was not found.`
