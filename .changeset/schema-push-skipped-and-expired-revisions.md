---
'hive': minor
---

Report skipped schema pushes, allow expired schema revisions to be pushed again, and fix how schema
push and publishing a revision handle service names, concurrent pushes and expired revisions.

- `SchemaPushOk` now has an `isSkipped` field. It is `true` when the pushed revision already exists
  with the same schema, including when a concurrent push created it first.
- Concurrent pushes of the same revision no longer fail with an unexpected error.
- A revision that expired before it was published can now be pushed again, with the same or a
  different schema. Previously, until the weekly cleanup removed the expired revision, the push
  succeeded or reported a conflict, but publishing the revision failed.
- A publish whose revision expires and is removed while it is being published now fails with a
  message that says so, instead of an unexpected error.
- Schema push now rejects invalid names for services that are not in the target's latest schema
  version, like schema check and publish, instead of accepting them and failing when the revision is
  published. Existing services with names that are no longer valid are still accepted.
- Schema push now ignores the service name for single-schema projects, like schema publish does.
- Publishing a schema revision without a service name in a Federation or schema stitching project now
  reports the missing service name, instead of reporting that the revision was not found.
