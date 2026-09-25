---
'hive': minor
'@graphql-hive/cli': minor
---

Report skipped schema pushes, and allow expired schema revisions to be pushed again.

- `SchemaPushOk` now has an `isSkipped` field. Pushing a revision that already exists with the same
  schema is skipped, and `hive schema:push` reports it as such. `hive schema:push` needs a Hive server
  that includes this field; older servers are reported with error `[125]`.
- A revision that expired before it was published can now be pushed again, with the same or a
  different schema. Previously, until the weekly cleanup removed the expired revision, the push
  succeeded or reported a conflict, but publishing the revision failed.
- A publish whose revision expires and is removed while it is being published now fails with a
  message that says so, instead of an unexpected error.
