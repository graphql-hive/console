---
'@graphql-hive/cli': patch
---

Add `schema:push` for uploading immutable schema revisions without publishing them immediately. A pushed revision can later be published by passing `--version` to `schema:publish` instead of retrieving the SDL from a file or GraphQL endpoint.

Push and publish a monolith schema revision:

```sh
hive schema:push schema.graphql \
  --target my-org/my-project/my-target \
  --version "$VERSION"

hive schema:publish \
  --target my-org/my-project/my-target \
  --version "$VERSION"
```

For a federated schema, provide the service when pushing and the service URL when publishing:

```sh
hive schema:push products.graphql \
  --target my-org/my-project/my-target \
  --service products \
  --version "$VERSION"

hive schema:publish \
  --target my-org/my-project/my-target \
  --service products \
  --url https://products.example.com/graphql \
  --version "$VERSION"
```

Version identifiers are immutable for a service within a project. Pushing different SDL with an existing version identifier fails with an error such as `Version 'products@abc123' already exists with a different schema.` Attempting to publish an unknown version reports `Schema version 'abc123' was not found.`
