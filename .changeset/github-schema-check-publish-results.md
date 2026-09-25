---
'hive': minor
---

Report schema check results to the Hive CLI when the GitHub integration is used, and fix how schema
revisions are pushed.

- `GitHubSchemaCheckSuccess` now has a `valid` field and the stored `schemaCheck`, so the CLI can fail
  a CI job when a schema check fails, and approve it with `--forceSafe`.
- When the GitHub check-run can not be updated after a schema check ran, the error now says that the
  check ran, instead of saying that the check-run could not be created.
- Schema push now rejects invalid names for new services, like schema check and publish, instead of
  accepting them and failing when the revision is published.
- Schema push now ignores the service name for single-schema projects, like schema publish does.
- Concurrent pushes of the same revision no longer fail with an unexpected error.
- Publishing a schema revision without a service name in a Federation or schema stitching project now
  reports the missing service name, instead of reporting that the revision was not found.
