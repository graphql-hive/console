---
'hive': minor
---

We continue to build and expand the features of schema proposals. In this change, a background
composition job was added to allow asynchronous updates to the composition state of a proposal. This
composition job uses the schema service's composer but is unique from checks in that it takes the latest state of all subgraphs that are a part of a schema proposal.

### Additional environment variables for `workflows` service:

The `workflow` service calls the `schema` service's composeAndValidate TRPC endpoint and requires the `schema` service endpoint. And the shared instance of Redis, used as a pubsub in the `server` and `api` services, is also now used by `workflows` to update `Subscription.schemaProposalComposition`.

For self hosters, make sure to provide the following environment variables to the `workflows` service:

- SCHEMA_ENDPOINT
- REDIS_HOST
- REDIS_PORT
- REDIS_PASSWORD
