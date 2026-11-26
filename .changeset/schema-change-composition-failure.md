---
'hive': minor
---

Schema change notifications now report a schema version that failed to compose.

`schema.valid` in the HTTP webhook payload now means the same as `SchemaVersion.isValid` in the
GraphQL API: it is `false` when the supergraph or any contract failed to compose. Before, a version
whose supergraph composed while a contract did not was delivered with `valid: true` and no errors,
or was not delivered at all when the schema itself had no changes. Such a version is now delivered
with `valid: false`, and `errors` holds the contract's composition errors, each prefixed with the
contract name. Filter on `schema.valid` to act on failed compositions only.

Deleting a subgraph no longer repeats its breaking changes in `errors`. They are delivered in
`changes`, as they are for a publish, so `errors` only holds composition errors.

Slack, Microsoft Teams and Discord messages now state that composition failed and list the
composition errors. Slack and Microsoft Teams reported such a version as "0 changes" without the
errors, Discord titled it "Breaking schema changes detected", and a first publish that failed to
compose was announced as a received schema on all three.
