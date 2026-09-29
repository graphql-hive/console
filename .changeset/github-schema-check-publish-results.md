---
'hive': minor
---

Report schema check results to the Hive CLI when the GitHub integration is used.

- `GitHubSchemaCheckSuccess` now has a `valid` field and the stored `schemaCheck`, so the CLI can fail
  a CI job when a schema check fails, and approve it with `--forceSafe`.
- When the GitHub check-run can not be updated after a schema check ran, the error now says that the
  check ran, instead of saying that the check-run could not be created.
