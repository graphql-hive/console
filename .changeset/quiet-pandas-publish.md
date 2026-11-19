---
'hive': minor
---

The audit log records schema registry actions: `SCHEMA_PUBLISHED`, `SCHEMA_DELETED`,
`SCHEMA_VERSION_PROMOTED` and `SCHEMA_CHECK_APPROVED`. An event is written once the action has taken
effect, so a rejected publish or a dry-run delete records nothing.

Actions done with a legacy registry access token have no user or organization access token to
attribute the event to. Those events identify the token in `metadata.targetAccessToken`.
