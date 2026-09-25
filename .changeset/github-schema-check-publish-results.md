---
'hive': minor
---

Report schema check and schema publish results to the Hive CLI when the GitHub integration is used,
and fix how schema revisions are pushed.

- `GitHubSchemaCheckSuccess` now has a `valid` field and the stored `schemaCheck`, so the CLI can fail
  a CI job when a schema check fails, and approve it with `--forceSafe`.
- `GitHubSchemaPublishSuccess` now has `valid`, `rejected` and `linkToWebsite` fields, so the CLI can
  tell a rejected publish from a schema version that was stored but is not valid.
- When the GitHub check-run can not be updated after a schema version was published, the error now
  says that the schema was published.
- `SchemaPushOk` now has an `isSkipped` field. Pushing a revision that already exists with the same
  schema is skipped, and reported as such.
- Schema push now rejects invalid names for new services, like schema check and publish, instead of
  accepting them and failing when the revision is published.
- Schema push now ignores the service name for single-schema projects, like schema publish does.
- A revision that expired before it was published can now be pushed again. Previously the push
  succeeded or reported a conflict, but publishing the revision failed.
- Concurrent pushes of the same revision no longer fail with an unexpected error.
- Publishing a schema revision without a service name in a Federation or schema stitching project now
  reports the missing service name, instead of reporting that the revision was not found.
