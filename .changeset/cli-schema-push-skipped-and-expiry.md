---
'@graphql-hive/cli': minor
---

Report skipped schema pushes and when a pushed revision expires.

- `hive schema:push` warns `Schema revision "<service>@<revision>" already exists with the same
  schema. Skipping...` when the revision already exists with the same schema, instead of reporting it
  as a new push.
- `hive schema:push` shows when a pushed revision expires, and warns when `--service` is ignored for a
  single-schema project.
- `hive schema:push` needs a Hive server that includes `SchemaPushOk.isSkipped`. Older servers are
  reported with error `[125]`.
